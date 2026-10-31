/**
 * WhatsApp Service
 * ----------------
 * Gerencia a conexão com o WhatsApp via whatsapp-web.js.
 * - Suporte a múltiplas empresas (SaaS) usando empresaId como chave.
 * - Sessões persistidas no sistema de arquivos (LocalAuth) + status no banco.
 * - Emite eventos para o frontend via Server-Sent Events (SSE).
 * - Anti-spam: delay aleatório entre envios + limite por minuto.
 */

// Não forçar variáveis de ambiente aqui — respeitar o que o ambiente fornece

// Não sobrescrever se já definido pela configuração global (app.js / ambiente)
if (!process.env.PUPPETEER_EXECUTABLE_PATH && !process.env.CHROME_PATH) {
  try {
    process.env.PUPPETEER_EXECUTABLE_PATH = "/usr/bin/google-chrome";
  } catch (_) {}
}

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const util = require("util");

// Diagnóstico: inspeciona caminhos mencionados em erro de executablePath
function diagnosticarExecPath(msg, chave) {
  try {
    const match = msg && msg.match && msg.match(/\((\/[^)]+)\)/);
    const pathReported = match ? match[1] : null;
    console.log(`[WhatsApp][${chave}] diagnosticarExecPath: msg='${msg}'`);
    console.log(
      `[WhatsApp][${chave}] process.env.CHROME_PATH='${process.env.CHROME_PATH || "(undef)"}'`,
    );
    console.log(
      `[WhatsApp][${chave}] process.env.PUPPETEER_EXECUTABLE_PATH='${process.env.PUPPETEER_EXECUTABLE_PATH || "(undef)"}'`,
    );
    if (pathReported) {
      try {
        console.log(
          `[WhatsApp][${chave}] Caminho reportado pelo erro: ${pathReported}`,
        );
        console.log(
          `[WhatsApp][${chave}] exists: ${fs.existsSync(pathReported)}`,
        );
        try {
          const s = fs.statSync(pathReported);
          console.log(`[WhatsApp][${chave}] stat: ${JSON.stringify(s)}`);
        } catch (e) {
          console.log(
            `[WhatsApp][${chave}] stat falhou para ${pathReported}: ${e && e.message}`,
          );
        }
        // listar pasta pai para ver conteúdo
        const parent = require("path").dirname(pathReported);
        try {
          const files = fs.readdirSync(parent);
          console.log(
            `[WhatsApp][${chave}] Conteúdo de ${parent}: ${files.join(", ")}`,
          );
        } catch (e) {
          console.log(
            `[WhatsApp][${chave}] Falha ao listar ${parent}: ${e && e.message}`,
          );
        }
      } catch (e) {
        console.log(
          `[WhatsApp][${chave}] Erro diagnosticando caminho reportado: ${e && e.message}`,
        );
      }
    } else {
      console.log(
        `[WhatsApp][${chave}] Nenhum caminho entre parênteses encontrado na mensagem de erro`,
      );
    }

    // Tentar inspecionar puppeteer local (se presente)
    try {
      const p = require("puppeteer");
      const exec =
        typeof p.executablePath === "function"
          ? p.executablePath()
          : p.executablePath;
      console.log(`[WhatsApp][${chave}] puppeteer.executablePath() => ${exec}`);
      if (exec)
        console.log(
          `[WhatsApp][${chave}] fs.existsSync(exec) => ${fs.existsSync(exec)}`,
        );
    } catch (e) {
      console.log(
        `[WhatsApp][${chave}] puppeteer não disponível ou falha ao obter executablePath: ${e && e.message}`,
      );
    }
  } catch (e) {
    console.log(
      `[WhatsApp][${chave}] diagnosticarExecPath error: ${e && e.message}`,
    );
  }
}

// Debug: identificar qual arquivo foi carregado e PID do processo
console.log(
  `[WhatsApp] carregado: ${__filename} pid=${process.pid} NODE_ENV=${process.env.NODE_ENV || "(undef)"} CHROME_PATH=${process.env.CHROME_PATH || "(undef)"}`,
);

// Mapa de clientes WhatsApp por empresaId
const clientsMap = new Map();

// Contador de tentativas de inicialização para cada empresa (evitar loops)
const initRetries = new Map();

// Mapa de listeners SSE por empresaId: Set de res (response objects)
const sseListeners = new Map();

// Controle de retry automático após auth_failure (evita loop infinito)
const retryCount = new Map(); // empresaId -> number
const MAX_AUTO_RETRY = 1;

// Contador anti-spam: mensagens enviadas no último minuto
const spamCounter = new Map(); // empresaId -> { count, resetAt }
const MAX_MSG_POR_MINUTO = 10;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 10000;

// Diretório para armazenar sessões locais (LocalAuth)
const SESSION_DIR = path.join(__dirname, "../../tmp/whatsapp-sessions");

// Helpers para controle de instâncias e conflitos de userDataDir
function localAuthPathForEmpresa(empresaId) {
  const chave = String(empresaId);
  if (chave.startsWith("disp_")) {
    const id = chave.replace(/^disp_/, "");
    return path.join(SESSION_DIR, `empresa_disp_${id}`);
  }
  return path.join(SESSION_DIR, `empresa_${chave}`);
}

function getPidsUsingDir(dir) {
  try {
    if (!dir) return [];
    if (process.platform === "win32") {
      const cmd = `Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -like '*${dir.replace(/'/g, "''")}*' } | Select-Object -ExpandProperty ProcessId`;
      const res = spawnSync("powershell", ["-NoProfile", "-Command", cmd], {
        encoding: "utf8",
        timeout: 3000,
      });
      const out = res.stdout || "";
      return out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter(Boolean);
    } else {
      const res = spawnSync(
        "sh",
        [
          "-c",
          `ps ax -o pid,command | grep -F "${dir}" | grep -v grep | awk '{print $1}'`,
        ],
        {
          encoding: "utf8",
          timeout: 3000,
        },
      );
      const out = res.stdout || "";
      return out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter(Boolean);
    }
  } catch (e) {
    return [];
  }
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/F", "/T"], {
          stdio: "ignore",
        });
      } else {
        spawnSync("sh", ["-c", `kill -9 ${pid} || true`], { stdio: "ignore" });
      }
      console.log(`[WhatsApp] Tentativa de matar PID ${pid}`);
    } catch (e) {
      console.warn(`[WhatsApp] Falha ao matar PID ${pid}: ${e && e.message}`);
    }
  }
}

function removeSingletonLock(dir) {
  try {
    const lockFile = path.join(dir, "SingletonLock");
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`[WhatsApp] Removido SingletonLock em ${lockFile}`);
    }
  } catch (e) {}
}

function getBrowserPid(browser) {
  try {
    if (!browser) return null;
    if (typeof browser.process === "function") {
      const proc = browser.process();
      if (proc && proc.pid) return proc.pid;
    }
    if (browser.process && browser.process.pid) return browser.process.pid;
  } catch (e) {}
  return null;
}

// (fragment removido — validação será feita no fluxo de inicialização do cliente)

/**
 * Retorna o diretório de sessão no disco para uma empresa, se existir.
 */
function getSessionDirForEmpresa(empresaId) {
  const chave = String(empresaId);
  const candidates = [];
  if (chave.startsWith("disp_")) {
    const id = chave.replace(/^disp_/, "");
    candidates.push(path.join(SESSION_DIR, `empresa_disp_${id}`));
  }
  candidates.push(path.join(SESSION_DIR, `empresa_${chave}`));
  candidates.push(path.join(SESSION_DIR, `session-empresa_${chave}`));
  candidates.push(path.join(SESSION_DIR, `empresa-${chave}`));

  const found = candidates.find((d) => fs.existsSync(d));
  if (found) return found;

  // Fallback: devolver caminho padrão baseado no tipo (disp_ ou não)
  if (chave.startsWith("disp_")) {
    const id = chave.replace(/^disp_/, "");
    return path.join(SESSION_DIR, `empresa_disp_${id}`);
  }
  return path.join(SESSION_DIR, `empresa_${chave}`);
}

/**
 * Retorna delay aleatório entre MIN_DELAY_MS e MAX_DELAY_MS
 */
function delayAleatorio() {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) +
        MIN_DELAY_MS,
    ),
  );
}

/**
 * Verifica e incrementa contador anti-spam.
 * @returns {boolean} true se pode enviar, false se limite atingido
 */
function verificarAntiSpam(empresaId) {
  const agora = Date.now();
  const chave = String(empresaId);
  const atual = spamCounter.get(chave);

  if (!atual || agora > atual.resetAt) {
    spamCounter.set(chave, { count: 1, resetAt: agora + 60000 });
    return true;
  }

  if (atual.count >= MAX_MSG_POR_MINUTO) {
    return false;
  }

  atual.count++;
  return true;
}

/**
 * Emite evento SSE para todos os listeners de uma empresa.
 */
function emitirSSE(empresaId, evento, dados) {
  const listeners = sseListeners.get(String(empresaId));
  if (!listeners || listeners.size === 0) return;

  const payload = `data: ${JSON.stringify({ evento, ...dados })}\n\n`;

  for (const res of listeners) {
    try {
      res.write(payload);
    } catch (e) {
      listeners.delete(res);
    }
  }
}

/**
 * Adiciona listener SSE para uma empresa.
 */
function adicionarListenerSSE(empresaId, res) {
  const chave = String(empresaId);
  if (!sseListeners.has(chave)) {
    sseListeners.set(chave, new Set());
  }
  sseListeners.get(chave).add(res);

  // Remover listener quando a conexão fechar
  res.on("close", () => {
    const set = sseListeners.get(chave);
    if (set) set.delete(res);
  });
}

/**
 * Mata SOMENTE processos Chrome headless do Puppeteer.
 * Identificados pelo argumento --disable-dev-shm-usage, exclusivo da nossa config.
 * NÃO afeta o Chrome do usuário (que não usa essa flag).
 */
function matarChromeZumbis() {
  try {
    if (process.platform === "win32") {
      // Filtra apenas Chrome com --disable-dev-shm-usage (flag exclusiva do Puppeteer headless)
      // Isso NÃO afeta o Chrome normal do usuário
      spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-WmiObject Win32_Process -Filter \"name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*disable-dev-shm-usage*' } | ForEach-Object { $_.Terminate() } | Out-Null",
        ],
        { stdio: "ignore" },
      );
    } else {
      spawnSync(
        "sh",
        ["-c", "pkill -f 'chrome.*disable-dev-shm-usage' || true"],
        { stdio: "ignore" },
      );
    }
    console.log("[WhatsApp] Chrome Puppeteer zumbis eliminados (se havia).");
  } catch (_) {
    // silencioso
  }
}

/**
 * Inicializa o cliente WhatsApp para uma empresa.
 * Se já existir cliente conectado, retorna o existente.
 */
async function inicializarCliente(empresaId, opts = {}) {
  const chave = String(empresaId);

  // Se já existe e está pronto, retornar
  if (clientsMap.has(chave)) {
    const existente = clientsMap.get(chave);
    if (existente.status === "conectado") {
      console.log(
        `[WhatsApp][${chave}] Reutilizando cliente existente (status: conectado)`,
      );
      return { status: "ja_conectado" };
    }
    // Se já existe cliente aguardando QR, por padrão retornamos.
    // Porém, se a chamada pediu explicitamente 'headless: false' (abrir janela),
    // então devemos destruir o cliente atual e recriar em modo headful.
    if (existente.status === "aguardando_qr") {
      const wantsHeadful =
        opts && typeof opts.headless !== "undefined" && opts.headless === false;
      if (!wantsHeadful) {
        console.log(
          `[WhatsApp][${chave}] Reutilizando cliente existente (status: aguardando_qr)`,
        );
        return { status: "aguardando_qr" };
      }
      console.log(
        `[WhatsApp][${chave}] Recriando cliente que estava aguardando QR para abrir navegador (headful)...`,
      );
      try {
        await existente.client.destroy();
      } catch (_) {}
      clientsMap.delete(chave);
    }
    if (
      existente.status === "inicializando" ||
      existente.status === "autenticado"
    ) {
      // Verificar se o browser ainda está vivo; se travou, limpar e recriar
      let browserVivo = false;
      try {
        const browser = existente.client && existente.client.pupBrowser;
        browserVivo = browser && browser.isConnected();
      } catch (_) {}
      if (browserVivo) {
        return { status: existente.status };
      }
      // Browser morto ou nunca iniciou — limpar e recriar
      console.warn(
        `[WhatsApp][${chave}] Status "${existente.status}" mas browser morto. Recriando...`,
      );
    }
    // Destruir cliente antigo antes de recriar
    try {
      await existente.client.destroy();
    } catch (_) {}
    clientsMap.delete(chave);
  }

  // Garantir diretório de sessões
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  try {
    fs.chmodSync(SESSION_DIR, 0o700);
  } catch (e) {
    console.warn(
      `[WhatsApp][${chave}] Aviso: falha ao ajustar permissões em ${SESSION_DIR}: ${e && e.message}`,
    );
  }

  // Remover SingletonLock de Chrome zumbi (se existir) para evitar erro "browser is already running"
  const possibleSessionDirs = [
    path.join(SESSION_DIR, `session-empresa_${chave}`),
    path.join(SESSION_DIR, `empresa_${chave}`),
  ];
  for (const d of possibleSessionDirs) {
    const lockFile = path.join(d, "SingletonLock");
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log(`[WhatsApp][${chave}] Removido SingletonLock zumbi`);
      }
    } catch (_) {}
  }
  // Preparar variável de caminho do executável do Chrome/Chromium
  let executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    undefined;

  // Verificação final: testar se o binário realmente pode ser executado (ex: --version)
  try {
    if (executablePath) {
      try {
        const check = spawnSync(executablePath, ["--version"], {
          encoding: "utf8",
          timeout: 3000,
        });
        if (check.error || check.status !== 0) {
          console.warn(
            `[WhatsApp][${chave}] Falha no teste do binário ${executablePath}: ${check.error ? check.error.message : check.stderr || check.stdout}`,
          );
          executablePath = undefined;
        } else {
          console.log(
            `[WhatsApp][${chave}] Exec test ok: ${check.stdout || check.stderr}`,
          );
        }
      } catch (err) {
        console.warn(
          `[WhatsApp][${chave}] Erro ao testar executável ${executablePath}: ${err && err.message}`,
        );
        executablePath = undefined;
      }
    }
  } catch (_) {}

  // Forçar fallback para /usr/bin/google-chrome se nenhum executável válido foi encontrado
  if (!executablePath) {
    try {
      const fallback = "/usr/bin/google-chrome";
      if (fs.existsSync(fallback)) {
        try {
          const checkFallback = spawnSync(fallback, ["--version"], {
            encoding: "utf8",
            timeout: 3000,
          });
          if (!checkFallback.error && checkFallback.status === 0) {
            executablePath = fallback;
            console.log(
              `[WhatsApp][${chave}] Forçando fallback executablePath -> ${fallback}`,
            );
          } else {
            console.warn(
              `[WhatsApp][${chave}] Fallback ${fallback} presente mas falhou no teste: ${checkFallback.error ? checkFallback.error.message : checkFallback.stderr || checkFallback.stdout}`,
            );
          }
        } catch (e) {
          // silencioso
        }
      }
    } catch (_) {}
  }

  // Disparador (chave "disp_X") — permitir override via opts
  const isDisparador = chave.startsWith("disp_");

  // Determinar comportamento headless:
  // 1) opts.headless (explicit call)
  // 2) process.env.PUPPETEER_HEADLESS
  // 3) default: headless=true (server-friendly)
  let headless = true;
  try {
    if (opts && typeof opts.headless !== "undefined") {
      headless = !!opts.headless;
    } else if (process.env.PUPPETEER_HEADLESS !== undefined) {
      const v = String(process.env.PUPPETEER_HEADLESS).toLowerCase();
      headless = !(v === "0" || v === "false");
    }
  } catch (_) {}

  // Montar opções do Puppeteer — incluir defaultViewport null quando headful
  const baseArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];

  const headfulExtraArgs = ["--start-maximized", "--window-size=1280,800"];

  // FORÇAR caminho explícito do Chrome/Chromium (solicitado pelo usuário):
  // Atenção: este caminho é específico para ambientes Linux com Puppeteer cache.
  // Use apenas para teste; idealmente exporte via variável de ambiente.
  const puppeteerOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };

  // Nota: não definimos `userDataDir` quando usamos `LocalAuth`, pois
  // o LocalAuth do whatsapp-web.js não é compatível com um user-supplied
  // userDataDir. A isolação de sessão é feita via `LocalAuth.dataPath`
  // (veja mais abaixo) que cria pastas separadas por instância.

  console.log(
    `[WhatsApp][${chave}] puppeteerOptions: ${util.inspect(puppeteerOptions, {
      depth: 2,
    })}`,
  );

  // Log mais explícito do binário decidido
  console.log(
    `[WhatsApp][${chave}] Usando Chrome executável: ${puppeteerOptions.executablePath || "(nenhum)"}`,
  );

  // Ajustar puppeteerOptions com o executável detectado (se houver) e
  // sincronizar headless/args com as variáveis calculadas acima.
  try {
    if (executablePath) {
      puppeteerOptions.executablePath = executablePath;
    } else {
      // Remover override hard-coded quando não houver executável válido
      if (puppeteerOptions && puppeteerOptions.executablePath) {
        delete puppeteerOptions.executablePath;
      }
    }

    // Ajustar headless conforme variável calculada
    puppeteerOptions.headless = headless ? "new" : false;

    // Garantir que os args mínimos estejam presentes e adicionar extras quando headful
    puppeteerOptions.args = Array.isArray(puppeteerOptions.args)
      ? Array.from(new Set([...baseArgs, ...puppeteerOptions.args]))
      : baseArgs.slice();
    if (!headless) {
      puppeteerOptions.args = Array.from(
        new Set([...puppeteerOptions.args, ...headfulExtraArgs]),
      );
    }
  } catch (e) {
    console.warn(
      `[WhatsApp][${chave}] Falha ao ajustar puppeteerOptions detectado: ${e && e.message}`,
    );
  }

  // Requerir whatsapp-web.js APÓS garantir CHROME_PATH/executablePath
  try {
    if (executablePath) {
      process.env.CHROME_PATH = executablePath;
      process.env.PUPPETEER_EXECUTABLE_PATH = executablePath;
    } else {
      // Garantir que não deixamos variáveis de ambiente inválidas
      try {
        if (process.env.CHROME_PATH) {
          delete process.env.CHROME_PATH;
          console.log(
            `[WhatsApp][${chave}] Nenhum executável válido encontrado — CHROME_PATH ambiente removido`,
          );
        }
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          delete process.env.PUPPETEER_EXECUTABLE_PATH;
          console.log(
            `[WhatsApp][${chave}] Nenhum executável válido encontrado — PUPPETEER_EXECUTABLE_PATH ambiente removido`,
          );
        }
      } catch (_) {}
    }
  } catch (_) {}
  const { Client, LocalAuth } = require("whatsapp-web.js");

  // Criar pasta de sessão específica para o LocalAuth (evita usar a
  // mesma raiz para várias instâncias que poderiam conflitar)
  const localAuthPath = localAuthPathForEmpresa(chave);

  // Se existir processo usando este userDataDir, tentar resolver antes de iniciar
  try {
    const pids = getPidsUsingDir(localAuthPath);
    if (pids && pids.length > 0) {
      const existing = clientsMap.get(chave);
      if (
        existing &&
        existing.browserPid &&
        pids.includes(existing.browserPid)
      ) {
        console.log(
          `[WhatsApp][${chave}] Reutilizando instância em memória (PID ${existing.browserPid}) — não abrindo novo browser.`,
        );
        return { status: existing.status || "ja_conectado" };
      }
      console.warn(
        `[WhatsApp][${chave}] Conflito detectado: processos usando ${localAuthPath}: ${pids.join(", ")}. Tentando encerrar.`,
      );
      killPids(pids);
      // aguardar o SO liberar locks
      await new Promise((r) => setTimeout(r, 1000));
      removeSingletonLock(localAuthPath);
    }
  } catch (e) {
    console.warn(
      `[WhatsApp][${chave}] Falha ao verificar processos existentes: ${e && e.message}`,
    );
  }

  try {
    fs.mkdirSync(localAuthPath, { recursive: true });
    try {
      fs.chmodSync(localAuthPath, 0o700);
    } catch (e) {
      console.warn(
        `[WhatsApp][${chave}] Aviso: falha ao ajustar permissões em ${localAuthPath}: ${e && e.message}`,
      );
    }
  } catch (e) {}

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: localAuthPath,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Estado local do cliente
  const estado = {
    client,
    status: "inicializando",
    qrBase64: null,
    numero: null,
  };

  clientsMap.set(chave, estado);
  console.log(
    `[WhatsApp][${chave}] Instância registrada em memória. localAuthPath=${localAuthPath}`,
  );

  // Evento: QR Code gerado
  client.on("qr", async (qr) => {
    console.log(`[WhatsApp][empresa:${chave}] QR Code gerado`);
    estado.status = "aguardando_qr";

    // Converter QR para imagem base64
    try {
      const qrBase64 = await QRCode.toDataURL(qr);
      estado.qrBase64 = qrBase64;

      // Salvar status no banco
      await atualizarStatusNoBanco(chave, "aguardando_qr", null);

      // Emitir para frontend via SSE
      emitirSSE(chave, "qr", { qrBase64 });
    } catch (err) {
      console.error("[WhatsApp] Erro ao gerar QR base64:", err.message);
    }
  });

  // Evento: Auth failure — sessão expirada ou corrompida
  client.on("auth_failure", async (msg) => {
    console.error(`[WhatsApp][empresa:${chave}] Falha de autenticação:`, msg);
    estado.status = "erro";
    clientsMap.delete(chave);

    // Destruir cliente antigo
    try {
      await client.destroy();
    } catch (_) {}

    // Limpar sessão corrompida do disco para forçar novo QR
    const sessDir = limparSessaoDoDisco(chave);
    console.log(
      `[WhatsApp][empresa:${chave}] Sessão inválida deletada: ${sessDir}`,
    );
    await atualizarStatusNoBanco(chave, "desconectado", null);

    // Auto-retry UMA vez (gera QR novo limpo)
    const retries = retryCount.get(chave) || 0;
    if (retries < MAX_AUTO_RETRY) {
      retryCount.set(chave, retries + 1);
      console.log(
        `[WhatsApp][empresa:${chave}] Sessão inválida, recriando conexão (retry ${retries + 1})...`,
      );
      emitirSSE(chave, "status", {
        status: "inicializando",
        mensagem: "Sessão expirada. Gerando novo QR Code...",
      });
      inicializarCliente(empresaId).catch((e) => {
        console.error(
          `[WhatsApp][empresa:${chave}] Falha no auto-retry:`,
          e.message,
        );
        emitirSSE(chave, "erro", {
          mensagem: "Falha ao reconectar. Tente novamente.",
        });
      });
    } else {
      console.warn(
        `[WhatsApp][empresa:${chave}] Max auto-retries atingido. Aguardando ação manual.`,
      );
      retryCount.delete(chave);
      emitirSSE(chave, "erro", {
        mensagem: "Sessão expirada. Clique em conectar novamente.",
      });
    }
  });

  // Evento: Mudança de estado (CONFLICT, UNLAUNCHED, etc)
  client.on("change_state", (state) => {
    console.log(`[WhatsApp][empresa:${chave}] Mudança de estado:`, state);
  });

  // Evento: Autenticado
  client.on("authenticated", () => {
    console.log(`[WhatsApp][empresa:${chave}] Autenticado com sucesso`);
    estado.status = "autenticado";
  });

  // Evento: Pronto (conectado)
  client.on("ready", async () => {
    console.log(`[WhatsApp][empresa:${chave}] Cliente pronto e conectado`);
    estado.status = "conectado";
    estado.qrBase64 = null;
    retryCount.delete(chave); // Reset retry counter on success

    // Armazenar PID do browser para detecção de instâncias ativas
    try {
      const browser = client.pupBrowser;
      const pid = getBrowserPid(browser);
      if (pid) {
        estado.browserPid = pid;
        console.log(
          `[WhatsApp][${chave}] Browser PID=${pid} armazenado para instância`,
        );
      }
    } catch (e) {}

    try {
      const info = client.info;
      const numero = info && info.wid ? info.wid.user : null;
      estado.numero = numero;

      await atualizarStatusNoBanco(chave, "conectado", numero);
      emitirSSE(chave, "conectado", { numero });

      // Fechar abas extras (about:blank) que o Puppeteer abre
      try {
        const browser = client.pupBrowser;
        // debug: inspecionar processo do browser lançado
        try {
          if (browser && typeof browser.process === "function") {
            const proc = browser.process();
            console.log(
              `[WhatsApp][${chave}] Browser process spawnfile: ${(proc && (proc.spawnfile || proc.spawnpath || proc.execPath)) || "(unknown)"} args: ${proc && proc.spawnargs ? proc.spawnargs.join(" ") : "(none)"}`,
            );
          }
        } catch (e) {
          console.log(
            `[WhatsApp][${chave}] Debug: falha ao inspecionar browser.process(): ${e && e.message}`,
          );
        }
        if (browser) {
          const pages = await browser.pages();
          for (const page of pages) {
            const url = page.url();
            if (url === "about:blank" || url === "chrome://newtab/") {
              await page.close().catch(() => {});
            }
          }
        }
      } catch (_) {}

      // Registrar log
      await registrarLog(
        chave,
        null,
        "conectado",
        { numero },
        `WhatsApp conectado: ${numero}`,
      );
      // Salvar informações da sessão (caminho em disco) no banco para reuso
      try {
        const sessDir = getSessionDirForEmpresa(chave);
        await salvarSessionInfoNoBanco(chave, { sessionDir: sessDir });
      } catch (e) {
        console.warn(
          "[WhatsApp] falha ao salvar session info no DB",
          e && e.message,
        );
      }
    } catch (err) {
      console.error("[WhatsApp] Erro no evento ready:", err.message);
    }
  });

  // Evento: Desconectado
  client.on("disconnected", async (reason) => {
    console.warn(`[WhatsApp][empresa:${chave}] Desconectado: ${reason}`);
    // Ignorar se já foi limpo (ex: reinicialização automática após detached frame)
    const atual = clientsMap.get(chave);
    if (!atual || atual.client !== client) {
      console.log(
        `[WhatsApp][empresa:${chave}] Evento disconnected ignorado (cliente já substituído).`,
      );
      return;
    }
    estado.status = "desconectado";
    estado.qrBase64 = null;
    estado.numero = null;

    // Tentar encerrar browser explicitamente
    try {
      const browser = estado.client && estado.client.pupBrowser;
      if (browser && typeof browser.close === "function") {
        await browser.close().catch(() => {});
      } else if (estado.browserPid) {
        killPids([estado.browserPid]);
      }
    } catch (e) {}

    await atualizarStatusNoBanco(chave, "desconectado", null);
    emitirSSE(chave, "desconectado", { motivo: reason });
    await registrarLog(
      chave,
      null,
      "desconectado",
      { reason },
      `WhatsApp desconectado: ${reason}`,
    );

    clientsMap.delete(chave);
    console.log(`[WhatsApp][${chave}] Instância removida após desconexão.`);
  });

  // Inicializar cliente (abre o browser)
  console.log(
    `[WhatsApp][empresa:${chave}] Iniciando browser Puppeteer (headless: ${puppeteerOptions.headless})...`,
  );
  client
    .initialize()
    .then(() => {
      console.log(
        `[WhatsApp][empresa:${chave}] initialize() resolveu com sucesso`,
      );
    })
    .catch(async (err) => {
      const msg = err && err.message ? err.message : String(err);
      console.error(`[WhatsApp][empresa:${chave}] initialize() catch: ${msg}`);

      // Tratamento específico: conflito de userDataDir / SingletonLock
      if (
        msg.includes("The browser is already running") ||
        msg.toLowerCase().includes("user data directory") ||
        msg.toLowerCase().includes("userdatadir") ||
        msg.toLowerCase().includes("singletonlock") ||
        msg.toLowerCase().includes("already running for userdatadir")
      ) {
        console.warn(
          `[WhatsApp][${chave}] Conflito de userDataDir detectado durante initialize(): ${msg}`,
        );
        try {
          const sessDir = localAuthPathForEmpresa(chave);
          const pids = getPidsUsingDir(sessDir);
          if (pids && pids.length > 0) {
            console.warn(
              `[WhatsApp][${chave}] Processos detectados usando ${sessDir}: ${pids.join(", ")}. Tentando encerrar.`,
            );
            killPids(pids);
            await new Promise((r) => setTimeout(r, 1000));
          }
          removeSingletonLock(sessDir);
        } catch (e) {
          console.warn(
            `[WhatsApp][${chave}] Falha ao tentar resolver conflito de userDataDir: ${e && e.message}`,
          );
        }

        try {
          await client.destroy();
        } catch (_) {}
        clientsMap.delete(chave);

        // Tentar reinicializar com limite de tentativas para evitar loop
        try {
          const udKey = `${chave}_ud`;
          const attempts = initRetries.get(udKey) || 0;
          const MAX_UD_RETRIES = 1;
          if (attempts >= MAX_UD_RETRIES) {
            console.error(
              `[WhatsApp][${chave}] Máximo de tentativas para resolver userDataDir atingido (${MAX_UD_RETRIES}).`,
            );
          } else {
            initRetries.set(udKey, attempts + 1);
            return await inicializarCliente(empresaId);
          }
        } catch (e) {
          console.error(
            `[WhatsApp][${chave}] Falha ao re-inicializar após resolver userDataDir: ${e && e.message}`,
          );
        }
      }

      // Erros normais de navegação/frames — apenas logar e retornar
      if (
        msg.includes("Target closed") ||
        msg.includes("TargetCloseError") ||
        msg.includes("Session closed") ||
        msg.includes("Protocol error") ||
        msg.includes("detached Frame") ||
        msg.includes("Navigating frame") ||
        msg.includes("frame was detached") ||
        msg.includes("Execution context was destroyed")
      ) {
        console.warn(
          `[WhatsApp][empresa:${chave}] Transição de página (normal):`,
          msg,
        );
        return;
      }

      // Erro específico: binário não encontrado — tentar fallback automático controlado
      const missingExecMsg =
        msg.includes(
          "Browser was not found at the configured executablePath",
        ) ||
        msg.toLowerCase().includes("could not find chromium") ||
        msg.toLowerCase().includes("failed to launch") ||
        msg.toLowerCase().includes("no usable chromium");

      if (missingExecMsg) {
        try {
          diagnosticarExecPath(msg, chave);
        } catch (_) {}
        const attempts = initRetries.get(chave) || 0;
        const MAX_INIT_RETRIES = 2;
        if (attempts >= MAX_INIT_RETRIES) {
          console.error(
            `[WhatsApp][${chave}] Máximo de tentativas de init (${MAX_INIT_RETRIES}) atingido. Não será tentado novamente.`,
          );
        } else {
          initRetries.set(chave, attempts + 1);
          console.log(
            `[WhatsApp][${chave}] Erro de execPath detectado — tentando fallback (tentativa ${attempts + 1}/${MAX_INIT_RETRIES})...`,
          );

          // Tentar encontrar binário do sistema e reexecutar inicialização
          const systemCandidates = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/snap/bin/chromium",
          ];

          let found = null;
          for (const p of systemCandidates) {
            try {
              fs.accessSync(p, fs.constants.X_OK);
              const check = spawnSync(p, ["--version"], {
                encoding: "utf8",
                timeout: 3000,
              });
              if (!check.error && check.status === 0) {
                found = p;
                break;
              }
            } catch (_) {}
          }

          if (found) {
            console.log(
              `[WhatsApp][${chave}] Encontrado browser do sistema em ${found}, reiniciando inicialização com esse executablePath...`,
            );
            try {
              await client.destroy();
            } catch (_) {}
            clientsMap.delete(chave);
            try {
              process.env.CHROME_PATH = found;
            } catch (_) {}
            // Re-chamar a função para recriar o cliente com o novo CHROME_PATH
            try {
              return await inicializarCliente(empresaId);
            } catch (e) {
              console.error(
                `[WhatsApp][${chave}] Falha ao re-inicializar com fallback: ${e && e.message}`,
              );
            }
          }

          // Se não encontrou binário do sistema, verificar política de auto-install
          let autoInstall =
            process.env.AUTO_INSTALL_CHROME === "1" ||
            process.env.AUTO_INSTALL_CHROME_ON_FAILURE === "1";
          try {
            // Se estivermos rodando como root no Linux, permitir auto-install por padrão
            if (
              !autoInstall &&
              process.platform !== "win32" &&
              typeof process.getuid === "function" &&
              process.getuid() === 0
            ) {
              autoInstall = true;
              console.log(
                `[WhatsApp][${chave}] Rodando como root — habilitando AUTO_INSTALL_CHROME_ON_FAILURE por padrão`,
              );
            }
          } catch (_) {}
          if (autoInstall) {
            console.log(
              `[WhatsApp][${chave}] AUTO_INSTALL_CHROME habilitado — tentando executar script de instalação...`,
            );
            try {
              // installer está em backend/scripts/install_chrome_ubuntu.sh
              const installer = path.join(
                __dirname,
                "..",
                "scripts",
                "install_chrome_ubuntu.sh",
              );
              const res = spawnSync("bash", [installer], {
                stdio: "inherit",
                timeout: 0,
              });
              if (res && res.status === 0) {
                console.log(
                  `[WhatsApp][${chave}] Instalação automática concluída. Tentando re-detectar...`,
                );
                // Rechamar inicializarCliente para nova detecção
                try {
                  await client.destroy();
                } catch (_) {}
                clientsMap.delete(chave);
                try {
                  return await inicializarCliente(empresaId);
                } catch (e) {
                  console.error(
                    `[WhatsApp][${chave}] Falha ao re-inicializar após instalação: ${e && e.message}`,
                  );
                }
              } else {
                console.warn(
                  `[WhatsApp][${chave}] Script de instalação retornou status não-zero: ${res && res.status}`,
                );
              }
            } catch (e) {
              console.warn(
                `[WhatsApp][${chave}] Falha ao executar instalador automático: ${e && e.message}`,
              );
            }
            // Se o instalador via apt não funcionou (shared hosting), tentar baixar
            // o Chromium via npx puppeteer installer como fallback (se disponível).
            try {
              console.log(
                `[WhatsApp][${chave}] Tentando fallback: 'npx puppeteer@latest install chrome'...`,
              );
              const npxRes = spawnSync(
                "npx",
                ["puppeteer@latest", "install", "chrome"],
                { stdio: "inherit", timeout: 0 },
              );
              if (npxRes && npxRes.status === 0) {
                console.log(
                  `[WhatsApp][${chave}] Fallback npx install chrome concluído com sucesso. Recriar cliente...`,
                );
                try {
                  await client.destroy();
                } catch (_) {}
                clientsMap.delete(chave);
                try {
                  return await inicializarCliente(empresaId);
                } catch (e) {
                  console.error(
                    `[WhatsApp][${chave}] Falha ao re-inicializar após npx install: ${e && e.message}`,
                  );
                }
              } else {
                console.warn(
                  `[WhatsApp][${chave}] Fallback npx install chrome falhou (status: ${npxRes && npxRes.status})`,
                );
              }
            } catch (e) {
              console.warn(
                `[WhatsApp][${chave}] Falha ao executar fallback npx install: ${e && e.message}`,
              );
            }
          }
        }
      }

      // Fallback padrão: marcar erro e notificar frontend
      if (!executablePath) {
        console.error(
          `[WhatsApp][${chave}] Nenhum Chrome/Chromium utilizável detectado.`,
        );
        console.error(
          `[WhatsApp][${chave}] Soluções: 1) Instale google-chrome-stable ou chromium no servidor (ex: sudo apt-get install -y google-chrome-stable). 2) Defina CHROME_PATH ou PUPPETEER_EXECUTABLE_PATH apontando para o binário. 3) Se desejar auto-instalação, defina AUTO_INSTALL_CHROME=1 e execute o processo como root (apenas se confiar no script).`,
        );
      }
      console.error(`[WhatsApp][empresa:${chave}] Erro ao inicializar:`, msg);
      estado.status = "erro";
      emitirSSE(chave, "erro", { mensagem: msg });
      clientsMap.delete(chave);
    });

  // Timeout de segurança: se não conectar em 90s, limpar para evitar Chrome zumbi
  setTimeout(async () => {
    const atual = clientsMap.get(chave);
    if (atual && atual === estado && atual.status !== "conectado") {
      console.warn(
        `[WhatsApp][empresa:${chave}] Timeout de 90s — status ainda "${atual.status}". Limpando...`,
      );
      try {
        await client.destroy();
      } catch (_) {}
      clientsMap.delete(chave);
      await atualizarStatusNoBanco(chave, "desconectado", null);
      // Notificar frontend via SSE que deu timeout
      emitirSSE(chave, "erro", {
        mensagem: "Timeout: não foi possível conectar. Tente novamente.",
      });
    }
  }, 90000);

  return { status: "inicializando" };
}

/**
 * Obtém o status atual da sessão de uma empresa.
 */
function obterStatus(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado) return { status: "desconectado", numero: null, qrBase64: null };

  return {
    status: estado.status,
    numero: estado.numero,
    qrBase64: estado.status === "aguardando_qr" ? estado.qrBase64 : null,
  };
}

/**
 * Remove os arquivos de sessão do disco para uma empresa.
 * Usado quando a sessão está corrompida/expirada.
 * @returns {string|null} caminho removido, ou null se não encontrou
 */
function limparSessaoDoDisco(empresaId) {
  const chave = String(empresaId);
  const candidates = [
    path.join(SESSION_DIR, `session-empresa_${chave}`),
    // suportar instâncias de disparador (disp_)
    path.join(
      SESSION_DIR,
      `empresa_disp_${chave.startsWith("disp_") ? chave.replace(/^disp_/, "") : chave}`,
    ),
    path.join(SESSION_DIR, `empresa_${chave}`),
    path.join(SESSION_DIR, `empresa-${chave}`),
  ];

  for (const d of candidates) {
    if (fs.existsSync(d)) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
        console.log(`[WhatsApp][${chave}] Sessão removida do disco: ${d}`);
        return d;
      } catch (err) {
        console.warn(
          `[WhatsApp][${chave}] Falha ao remover ${d}:`,
          err.message,
        );
      }
    }
  }
  return null;
}

/**
 * Limpa completamente a sessão de uma empresa (memória + disco + banco).
 * Usado para forçar nova conexão quando a sessão está corrompida.
 */
async function limparSessao(empresaId) {
  const chave = String(empresaId);

  // 1. Destruir cliente em memória
  const estado = clientsMap.get(chave);
  if (estado) {
    try {
      // Tentar fechar o browser explicitamente
      try {
        const browser = estado.client && estado.client.pupBrowser;
        if (browser && typeof browser.close === "function") {
          await browser.close().catch(() => {});
        } else if (estado.browserPid) {
          killPids([estado.browserPid]);
        }
      } catch (_) {}

      await estado.client.destroy();
    } catch (_) {}
    clientsMap.delete(chave);
    console.log(`[WhatsApp][${chave}] Instância fechada e removida da memória`);
  }

  // 2. Remover arquivos de sessão do disco
  const removido = limparSessaoDoDisco(chave);

  // 3. Atualizar banco para desconectado
  await atualizarStatusNoBanco(chave, "desconectado", null);

  // 4. Resetar retry counter
  retryCount.delete(chave);

  console.log(
    `[WhatsApp][${chave}] Sessão completamente limpa. Removido: ${removido || "nenhum arquivo"}`,
  );
  return { limpo: true, sessaoRemovida: removido };
}

/**
 * Desconecta o WhatsApp de uma empresa.
 */
async function desconectar(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado) return;

  try {
    await estado.client.logout();
    try {
      const browser = estado.client && estado.client.pupBrowser;
      if (browser && typeof browser.close === "function") {
        await browser.close().catch(() => {});
      } else if (estado.browserPid) {
        killPids([estado.browserPid]);
      }
    } catch (_) {}
    await estado.client.destroy();
  } catch (_) {}

  clientsMap.delete(chave);
  await atualizarStatusNoBanco(chave, "desconectado", null);
  emitirSSE(chave, "desconectado", { motivo: "logout_manual" });
}

/**
 * Envia uma mensagem de texto (com delay anti-spam).
 * @param {string} empresaId
 * @param {string} telefone - formato: 5527999104837
 * @param {string} texto
 * @param {string|null} imagemPath - caminho absoluto da imagem (opcional)
 * @returns {{ sucesso: boolean, erro?: string }}
 */
async function enviarMensagem(empresaId, telefone, texto, imagemPath = null) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado || estado.status !== "conectado") {
    return { sucesso: false, erro: "WhatsApp não está conectado" };
  }

  // Verificar anti-spam
  if (!verificarAntiSpam(chave)) {
    return {
      sucesso: false,
      erro: "Limite de mensagens por minuto atingido (anti-spam)",
    };
  }

  // Delay aleatório (simula comportamento humano)
  await delayAleatorio();

  // Gerar variantes do número (com e sem nono dígito) para fallback
  const numerosParaTentar = gerarVariantesNumero(telefone);

  for (const numeroFormatado of numerosParaTentar) {
    try {
      console.log(`[WhatsApp] Tentando enviar para ${numeroFormatado}...`);

      if (imagemPath && fs.existsSync(imagemPath)) {
        const { MessageMedia } = require("whatsapp-web.js");
        const ext = path.extname(imagemPath).toLowerCase();
        const mimeTypes = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        const mime = mimeTypes[ext] || null;
        let media;
        if (mime) {
          // Forçar mime type correto para enviar como foto (não documento)
          const data = fs.readFileSync(imagemPath).toString("base64");
          media = new MessageMedia(mime, data, path.basename(imagemPath));
        } else {
          media = MessageMedia.fromFilePath(imagemPath);
        }
        await estado.client.sendMessage(numeroFormatado, media, {
          caption: texto,
          sendMediaAsSticker: false,
        });
      } else {
        await estado.client.sendMessage(numeroFormatado, texto);
      }

      console.log(`[WhatsApp] ✅ Mensagem enviada para {numeroFormatado}`);
      return { sucesso: true };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[WhatsApp] Falha com ${numeroFormatado}: ${msg}`);

      // Erros fatais de sessão — a sessão está irrecuperável (frame morto).
      // Destruir e reinicializar automaticamente.
      if (
        msg.includes("detached Frame") ||
        msg.includes("Execution context was destroyed") ||
        msg.includes("Target closed") ||
        msg.includes("Session closed")
      ) {
        console.warn(
          `[WhatsApp] Sessão quebrada para empresa ${chave}, reinicializando...`,
        );
        // Remover listeners do cliente antigo para evitar que o evento "disconnected"
        // atualize o banco para "desconectado" enquanto reinicializamos
        try {
          estado.client.removeAllListeners("disconnected");
        } catch (_) {}
        // Limpar da memória (mas NÃO atualizar banco — vamos reconectar)
        estado.status = "reinicializando";
        try {
          await estado.client.destroy();
        } catch (_) {}
        clientsMap.delete(chave);
        // Reinicializar em background (não bloqueia o retorno)
        // A sessão LocalAuth em disco permite reconectar sem QR
        inicializarCliente(empresaId).catch((e) =>
          console.error(
            `[WhatsApp] Falha ao reinicializar empresa ${chave}:`,
            e.message,
          ),
        );
        return {
          sucesso: false,
          erro: "Sessão WhatsApp reinicializando automaticamente. Envio será retentado.",
        };
      }

      // Se for o último número da lista, retornar erro
      if (numeroFormatado === numerosParaTentar[numerosParaTentar.length - 1]) {
        console.error(
          `[WhatsApp] Todas as variantes falharam para ${telefone}`,
        );
        return { sucesso: false, erro: msg };
      }
      // Senão, tentar próxima variante
    }
  }

  return { sucesso: false, erro: "Não foi possível enviar a mensagem" };
}

/**
 * Gera variantes de um número brasileiro para tentar o envio.
 * O WhatsApp usa formatos diferentes dependendo da operadora/região.
 * Retorna array de números formatados para tentar em ordem.
 */
function gerarVariantesNumero(telefone) {
  let limpo = String(telefone).replace(/\D/g, "");

  // Adicionar código do país se não tiver
  if (!limpo.startsWith("55")) {
    limpo = "55" + limpo;
  }

  const variantes = new Set();

  // Número principal
  variantes.add(`${limpo}@c.us`);

  // Lógica do nono dígito para Brasil: 55 + DDD(2) + número
  // Ex: 5531984730333 → ddd=31, numero=984730333 (9 dígitos com 9)
  //     5531 84730333 → ddd=31, numero=84730333 (8 dígitos sem 9)
  if (limpo.startsWith("55") && limpo.length === 13) {
    // 13 dígitos = 55 + DDD + 9 dígitos (com nono) → criar variante sem nono
    const semNono = limpo.substring(0, 4) + limpo.substring(5); // remove o 9
    variantes.add(`${semNono}@c.us`);
  } else if (limpo.startsWith("55") && limpo.length === 12) {
    // 12 dígitos = 55 + DDD + 8 dígitos (sem nono) → criar variante com nono
    const comNono = limpo.substring(0, 4) + "9" + limpo.substring(4);
    variantes.add(`${comNono}@c.us`);
  }

  return [...variantes];
}

/**
 * Formata número de telefone para o formato WhatsApp (@c.us).
 */
function formatarNumero(telefone) {
  // Remove tudo que não é dígito
  let limpo = String(telefone).replace(/\D/g, "");
  if (!limpo.startsWith("55")) limpo = "55" + limpo;
  return `${limpo}@c.us`;
}

/**
 * Substitui variáveis dinâmicas no template.
 */
function substituirVariaveis(template, variaveis) {
  let resultado = template;

  const mapa = {
    "{nome_tutor}": variaveis.nomeTutor || variaveis.nome_tutor || "",
    "{nome_pet}": variaveis.nomePet || variaveis.nome_pet || "",
    "{data_agendamento}":
      variaveis.dataAgendamento || variaveis.data_agendamento || "",
    "{hora_agendamento}":
      variaveis.horaAgendamento || variaveis.hora_agendamento || "",
    "{servico}": variaveis.servico || "",
    "{nome_empresa}":
      variaveis.nomeEmpresa || variaveis.nome_empresa || "PetHub",
    "{produto}":
      variaveis.produto ||
      variaveis.produto_nome ||
      variaveis.produtoNome ||
      "",
    "{produto_nome}":
      variaveis.produto_nome ||
      variaveis.produtoNome ||
      variaveis.produto ||
      "",
    "{data_renovacao}":
      variaveis.dataRenovacao || variaveis.data_renovacao || "",
    // suporte ao formato legado do frontend
    "{nometutor}": variaveis.nomeTutor || variaveis.nome_tutor || "",
    "{nomepet}": variaveis.nomePet || variaveis.nome_pet || "",
  };

  for (const [chave, valor] of Object.entries(mapa)) {
    resultado = resultado.split(chave).join(valor);
  }

  return resultado;
}

// ──────────────────────────────────────────────────────────────
// Helpers de banco (lazy require para evitar dependência circular)
// ──────────────────────────────────────────────────────────────

async function atualizarStatusNoBanco(empresaId, status, numero) {
  try {
    const { WhatsappSession } = require("../models");
    const chaveStr = String(empresaId);
    const isDisp = chaveStr.startsWith("disp_");
    const numericId = isDisp
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);

    if (isDisp) {
      // Disparador: buscar instância pelo ID direto
      const session = await WhatsappSession.findByPk(numericId);
      if (session) {
        await session.update({
          status,
          numero: numero || session.numero,
          ultimaConexao:
            status === "conectado" ? new Date() : session.ultimaConexao,
        });
      }
    } else {
      // Sistema principal: buscar por empresaId
      const [session] = await WhatsappSession.findOrCreate({
        // ISOLAMENTO MULTI-TENANT: garantir a linha principal de marketing
        // (nome NULL), sem colidir com as instâncias do disparador
        // (nome='config_disparador' ou sessões nom=disp_*).
        where: { empresaId: numericId, nome: null },
        defaults: {
          status,
          numero,
          ultimaConexao: status === "conectado" ? new Date() : null,
        },
      });

      await session.update({
        status,
        numero: numero || session.numero,
        ultimaConexao:
          status === "conectado" ? new Date() : session.ultimaConexao,
      });
    }
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível atualizar status no banco:",
      err.message,
    );
  }
}

async function registrarLog(empresaId, envioId, evento, detalhes, mensagem) {
  try {
    const { LogEnvio } = require("../models");
    const chaveStr = String(empresaId);
    const numericId = chaveStr.startsWith("disp_")
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);
    await LogEnvio.create({
      empresaId: numericId || 0,
      envioAgendadoId: envioId || null,
      evento,
      detalhes,
      mensagem,
    });
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível registrar log:",
      err.message,
    );
  }
}

async function salvarSessionInfoNoBanco(empresaId, info) {
  try {
    const { WhatsappSession } = require("../models");
    const chaveStr = String(empresaId);
    const isDisp = chaveStr.startsWith("disp_");
    const numericId = isDisp
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);

    let sess;
    if (isDisp) {
      sess = await WhatsappSession.findByPk(numericId);
    } else {
      sess = await WhatsappSession.findOne({ where: { empresaId: numericId } });
    }
    if (!sess) return;
    await sess.update({ sessionData: JSON.stringify(info) });
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível salvar sessionData no banco:",
      err.message,
    );
  }
}

/**
 * Reconecta automaticamente sessões que estavam ativas antes do servidor reiniciar.
 * Usa os arquivos de sessão salvos em disco pelo LocalAuth.
 * Chamado uma vez no startup do servidor.
 */
async function reconectarSessoesAtivas() {
  try {
    const { WhatsappSession } = require("../models");

    // Matar Chrome zumbis de restartes anteriores antes de reconectar
    matarChromeZumbis();
    // Aguardar um pouco para o SO liberar locks nos arquivos de sessão
    await new Promise((r) => setTimeout(r, 1500));

    // Buscar todas as sessões de marketing (não apenas "conectado" — podem ter crashado como "desconectado")
    // Se existe sessão em disco, vale a pena tentar reconectar
    const { Op } = require("sequelize");
    // Buscar sessões de marketing que estavam CONECTADAS antes do restart
    // Só tenta reconectar se já tinha auth válida (evita gerar QR code headless sem ninguém ver)
    const sessoes = await WhatsappSession.findAll({
      attributes: ["id", "empresaId", "status", "sessionData"],
      where: {
        [Op.or]: [{ nome: null }, { nome: "" }],
        empresaId: { [Op.gt]: 0 },
        status: "conectado",
      },
      limit: 200,
    });

    if (sessoes.length === 0) {
      console.log("[WhatsApp] Nenhuma sessão ativa para reconectar.");
      return;
    }

    console.log(
      `[WhatsApp] Reconectando ${sessoes.length} sessão(ões) ativa(s)...`,
    );

    for (const sessao of sessoes) {
      const chave = String(sessao.empresaId);
      // Verificar se os arquivos de sessão existem em disco
      // LocalAuth cria a pasta com o clientId dentro de SESSION_DIR, por exemplo
      // SESSION_DIR/empresa_<chave>. Manter compatibilidade com variações antigas.
      const candidateDirs = [
        path.join(SESSION_DIR, `empresa_${chave}`),
        path.join(SESSION_DIR, `session-empresa_${chave}`),
        path.join(SESSION_DIR, `empresa-${chave}`),
        path.join(
          SESSION_DIR,
          `empresa_disp_${chave.startsWith("disp_") ? chave.replace(/^disp_/, "") : chave}`,
        ),
      ];

      const sessDir = candidateDirs.find((d) => fs.existsSync(d));
      if (!sessDir) {
        console.warn(
          `[WhatsApp] Arquivos de sessão não encontrados para empresa ${chave}, pulando. Searched: ${candidateDirs.join(", ")}`,
        );
        await atualizarStatusNoBanco(chave, "desconectado", null);
        continue;
      }

      console.log(
        `[WhatsApp] Auto-reconectando empresa ${chave} (usando sessão salva)...`,
      );
      // Não aguardar — inicializa em background para não travar o startup
      inicializarCliente(chave).catch((err) => {
        console.warn(
          `[WhatsApp] Falha ao reconectar empresa ${chave}:`,
          err.message,
        );
      });
    }
  } catch (err) {
    console.warn("[WhatsApp] Erro ao reconectar sessões ativas:", err.message);
  }
}

/**
 * Verifica se o cliente WhatsApp está conectado em memória
 * E se o browser Puppeteer ainda está aberto.
 */
function isConectado(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);
  if (!estado || estado.status !== "conectado") return false;

  // Verificar se o browser Puppeteer ainda está vivo
  try {
    const browser = estado.client.pupBrowser;
    if (browser && !browser.isConnected()) {
      console.warn(
        `[WhatsApp][${chave}] Browser Puppeteer fechado. Limpando sessão.`,
      );
      estado.status = "desconectado";
      clientsMap.delete(chave);
      return false;
    }
  } catch (_) {
    // Se não conseguir verificar, assume que está ok
  }

  return true;
}

module.exports = {
  inicializarCliente,
  obterStatus,
  desconectar,
  enviarMensagem,
  substituirVariaveis,
  adicionarListenerSSE,
  emitirSSE,
  registrarLog,
  reconectarSessoesAtivas,
  isConectado,
  limparSessao,
  limparSessaoDoDisco,
};
