// O ERP usa CommonJS. Baileys é ESM e é carregado na primeira conexão.
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('node:fs/promises');
const path = require('node:path');

function novaAutenticacao(lib) {
  const categorias = new Map();
  return {
    creds: lib.initAuthCreds(),
    keys: {
      async get(tipo, ids) {
        const valores = {};
        for (const id of ids) {
          const valor = categorias.get(tipo)?.get(id);
          if (valor != null) valores[id] = tipo === 'app-state-sync-key'
            ? lib.proto.Message.AppStateSyncKeyData.fromObject(valor) : valor;
        }
        return valores;
      },
      async set(dados) {
        for (const [tipo, valores] of Object.entries(dados)) {
          if (!categorias.has(tipo)) categorias.set(tipo, new Map());
          const mapa = categorias.get(tipo);
          for (const [id, valor] of Object.entries(valores)) {
            if (valor == null) mapa.delete(id);
            else mapa.set(id, valor);
          }
        }
      },
    },
  };
}

const logger = pino({ level: 'silent' });
const importBaileys = () => import('@whiskeysockets/baileys');

function criarServico({ repositorio, carregar = importBaileys, gerarQR = QRCode.toDataURL,
  agendar = setTimeout, cancelar = clearTimeout, agora = Date.now, atualizarResumo = async () => {},
  pausaEnvio = () => new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 7000)) } = {}) {
  const sessoes = new Map(), listeners = new Map(), desligando = new Map();
  let parando = false, monitor = null, revisando = false;
  const desconectado = () => ({ status: 'desconectado', numero: null, qrBase64: null });
  const atual = s => !parando && sessoes.get(s.id) === s && !s.finalizando;
  const pareada = s => !!(s.pareada || s.auth?.creds.me || s.auth?.creds.registered);
  const obterStatus = id => {
    const s = sessoes.get(String(id));
    return s && !s.finalizando ? { status: s.status, numero: s.numero, qrBase64: s.qr,
      reconectando: s.status === 'inicializando' && pareada(s) } : desconectado();
  };
  function salvarStatusNoBanco(id, status, numero) {
    Promise.resolve().then(() => atualizarResumo(id, status, numero)).catch(() => {});
  }
  function emitir(id, evento, dados) {
    const linha = 'data: ' + JSON.stringify({ evento, ...dados }) + '\n\n';
    for (const res of listeners.get(id) || []) {
      try { res.write(linha); } catch { listeners.get(id)?.delete(res); }
    }
  }
  function adicionarListenerSSE(id, res) {
    const chave = String(id);
    if (!listeners.has(chave)) listeners.set(chave, new Set());
    const grupo = listeners.get(chave);
    grupo.add(res);
    res.once('close', () => {
      grupo.delete(res);
      if (!grupo.size && listeners.get(chave) === grupo) listeners.delete(chave);
    });
  }
  function aguardar(s) {
    s.revisao++;
    s.qr = null;
    s.status = 'inicializando';
    emitir(s.id, 'status', obterStatus(s.id));
  }
  function fecharSocket(s) {
    const socket = s.socket;
    s.socket = null;
    // Invalidar primeiro: eventos de end() pertencem ao socket antigo.
    try { Promise.resolve(socket?.end()).catch(() => {}); } catch { /* Já fechado. */ }
    return socket;
  }
  function encerrar(s, mensagem) {
    if (sessoes.get(s.id) !== s) return;
    sessoes.delete(s.id);
    cancelar(s.timer); s.timer = null;
    s.revisao++;
    fecharSocket(s);
    salvarStatusNoBanco(s.id, 'desconectado', null);
    emitir(s.id, mensagem ? 'erro' : 'desconectado', { ...desconectado(), mensagem });
  }
  function persistir(s) {
    if (!s.handle) return Promise.resolve();
    s.pendente = true;
    const seq = ++s.gravacao;
    const p = s.handle.salvar();
    s.persistencia = p.catch(() => {
      console.warn(`[WhatsApp][empresa:${s.id}] credenciais aguardam gravação; sem gerar novo QR`);
    });
    p.then(() => { if (seq === s.gravacao) s.pendente = false; }, () => {});
    return s.persistencia;
  }
  function reagendar(s, imediato = false) {
    if (!atual(s)) return;
    aguardar(s);
    cancelar(s.timer);
    const atraso = imediato ? 0 : Math.min(1000 * 2 ** Math.min(s.tentativas++, 6), 60000);
    console.info(`[WhatsApp][empresa:${s.id}] reconectando em ${atraso / 1000}s; vínculo ${pareada(s) ? 'preservado' : 'em pareamento'}`);
    s.timer = agendar(() => {
      s.timer = null;
      if (atual(s)) return abrir(s);
    }, atraso);
  }
  async function finalizar(s, acao, mensagem) {
    if (sessoes.get(s.id) !== s) return;
    s.finalizando = true;
    cancelar(s.timer); s.timer = null;
    fecharSocket(s);
    s.revisao++;
    s.qr = null;
    s.status = 'desconectado';
    try {
      await s.persistencia;
      if (s.handle) await s.handle[acao]();
      encerrar(s, mensagem);
    } catch (e) {
      if (e.code === 'WA_LEASE_LOST') { encerrar(s, mensagem); return; }
      s.terminal = { acao, mensagem };
      emitir(s.id, 'erro', { ...desconectado(), mensagem: mensagem + ' Encerramento aguardando o banco.' });
    }
  }
  async function abrir(s) {
    if (!atual(s) || s.abrindo || s.socket) return;
    s.abrindo = true;
    s.inicioAbertura = agora();
    try {
      const lib = await carregar();
      if (!atual(s)) return;
      if (!s.auth && repositorio) {
        s.aquisicao = repositorio().adquirir(s.id, lib, s.manual);
        const handle = await s.aquisicao;
        s.handle = handle;
        if (!atual(s)) return;
        if (!handle) {
          // Outro processo ainda possui o lease (p.ex. troca de deploy).
          s.pareada = true;
          reagendar(s);
          return;
        }
        s.auth = handle.auth;
        s.pareada = handle.pareada;
        s.numero = (s.auth.creds.me?.id || '').split(/[:@]/)[0] || null;
      }
      s.auth ??= novaAutenticacao(lib);
      await s.persistencia;
      if (s.pendente) {
        await persistir(s);
        if (s.pendente) throw new Error('Gravação do vínculo pendente.');
      }
      if (s.handle) await s.handle.flush();
      if (!atual(s)) return;
      const socket = lib.default({ auth: s.auth, logger, syncFullHistory: false,
        keepAliveIntervalMs: 25000, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000,
        markOnlineOnConnect: false, browser: lib.Browsers.macOS('Desktop'), shouldSyncHistoryMessage: () => false });
      s.socket = socket;
      const desteSocket = () => atual(s) && s.socket === socket;
      socket.ev.on('creds.update', dados => {
        if (!desteSocket()) return;
        Object.assign(s.auth.creds, dados);
        if (s.auth.creds.me || s.auth.creds.registered) s.pareada = true;
        persistir(s);
      });
      socket.ev.on('connection.update', update => {
        if (!desteSocket()) return;
        // Não deixar rejeições de listeners assíncronos escaparem ao processo.
        tratar(update).catch(() => {
          if (!desteSocket()) return;
          fecharSocket(s);
          reagendar(s);
        });
      });
      async function tratar(update) {
        if (update.connection === 'close') {
          s.socket = null;
          s.revisao++;
          try { Promise.resolve(socket.end()).catch(() => {}); } catch { /* Fechado. */ }
          const motivo = Number(update.lastDisconnect?.error?.output?.statusCode ?? update.lastDisconnect?.error?.statusCode);
          console.info(`[WhatsApp][empresa:${s.id}] conexão encerrada; código ${Number.isFinite(motivo) ? motivo : 'desconhecido'}; pareada=${pareada(s)}`);
          const r = lib.DisconnectReason;
          if ([r.loggedOut, r.badSession, r.forbidden, r.multideviceMismatch].filter(Number.isFinite).includes(motivo)) {
            await finalizar(s, 'remover', 'WhatsApp invalidou o vínculo. Clique em Conectar e leia um novo QR.');
            return;
          }
          if (motivo === r.connectionReplaced) {
            await finalizar(s, 'pausar', 'Outra conexão assumiu este WhatsApp. Verifique se há outra API usando o mesmo vínculo.');
            return;
          }
          if (!pareada(s) && s.tentativas >= 5) {
            await finalizar(s, 'remover', 'QR expirado. Clique em Conectar para parear novamente.');
            return;
          }
          // 515 é uma etapa normal do pareamento: usar a mesma auth/chaves.
          const rapido = motivo === r.restartRequired && !s.reinicioRapido;
          if (rapido) s.reinicioRapido = true;
          reagendar(s, rapido);
          return;
        }
        if (update.connection === 'open') {
          cancelar(s.timer); s.timer = null;
          s.revisao++;
          s.status = 'conectado';
          s.pareada = true;
          s.qr = null;
          s.numero = (socket.user?.id || s.auth.creds.me?.id || '').split(/[:@]/)[0] || null;
          s.tentativas = 0;
          if (s.handle) await persistir(s);
          if (!desteSocket() || s.status !== 'conectado') return;
          salvarStatusNoBanco(s.id, 'conectado', s.numero);
          console.info(`[WhatsApp][empresa:${s.id}] pronto para envio; persistência ${s.pendente ? 'pendente' : 'atualizada'}`);
          emitir(s.id, 'conectado', obterStatus(s.id));
          return;
        }
        if (update.isNewLogin) {
          s.pareada = true;
          console.info(`[WhatsApp][empresa:${s.id}] QR lido; concluindo vínculo`);
          aguardar(s);
          return;
        }
        if (update.qr) {
          // Nunca substituir uma conexão aberta por um QR atrasado.
          if (s.status === 'conectado') return;
          if (pareada(s)) {
            await finalizar(s, 'remover', 'WhatsApp solicitou um novo pareamento. Clique em Conectar para gerar o QR.');
            return;
          }
          const revisao = ++s.revisao;
          const qr = await gerarQR(update.qr);
          if (!desteSocket() || s.revisao !== revisao) return;
          s.qr = qr;
          s.status = 'aguardando_qr';
          emitir(s.id, 'qr', obterStatus(s.id));
        }
      }
    } catch (e) {
      if (!atual(s)) return;
      if (['WA_AUTH_CONFIG', 'WA_AUTH_UNREADABLE', 'WA_LEASE_LOST'].includes(e.code)) {
        fecharSocket(s);
        encerrar(s, e.message);
        return;
      }
      fecharSocket(s);
      reagendar(s);
    } finally { s.abrindo = false; }
  }
  async function inicializarCliente(id, manual = true) {
    if (parando) throw new Error('Servidor reiniciando. Aguarde.');
    const chave = String(id);
    if (!/^[1-9]\d*$/.test(chave)) throw new Error('Empresa inválida');
    if (desligando.has(chave)) await desligando.get(chave);
    const existente = sessoes.get(chave);
    if (existente) {
      if (existente.finalizando) throw new Error('Aguarde concluir a desconexão.');
      return { status: existente.status === 'conectado' ? 'ja_conectado' : existente.status };
    }
    const s = { id: chave, status: 'inicializando', qr: null, numero: null, manual,
      socket: null, revisao: 0, tentativas: 0, envios: [], gravacao: 0 };
    sessoes.set(chave, s);
    aguardar(s);
    await abrir(s);
    if (!atual(s)) throw new Error('Conexão encerrada. Verifique a configuração do servidor.');
    return { status: s.status };
  }
  async function desconectar(id) {
    const chave = String(id);
    if (desligando.has(chave)) return desligando.get(chave);
    const s = sessoes.get(chave);
    if (s) {
      s.finalizando = true;
      cancelar(s.timer); s.timer = null;
      s.revisao++;
    }
    const socket = s?.socket;
    if (s) s.socket = null;
    const fim = Promise.resolve().then(async () => {
      try {
        if (s) {
          const handle = s.handle || (s.aquisicao && await s.aquisicao);
          await s.persistencia;
          if (handle) await handle.remover();
          else if (repositorio) await repositorio().removerSemSocket(chave);
        } else if (repositorio) await repositorio().removerSemSocket(chave);
      } catch (e) {
        if (s) {
          s.terminal = { acao: 'remover', mensagem: 'Desconexão manual.' };
          try { await socket?.end(); } catch { /* Fechado. */ }
        }
        throw e;
      }
      try { await socket?.logout(); } catch { /* Já desconectado. */ }
      finally {
        try { await socket?.end(); } catch { /* Fechado. */ }
        if (s) encerrar(s);
        else emitir(chave, 'desconectado', desconectado());
      }
    });
    desligando.set(chave, fim);
    try { await fim; } finally { desligando.delete(chave); }
  }
  async function restaurar() {
    if (revisando || parando) return;
    revisando = true;
    try {
      for (const s of sessoes.values()) {
        if (s.terminal) { await finalizar(s, s.terminal.acao, s.terminal.mensagem); continue; }
        if (!atual(s)) continue;
        if (s.handle) {
          try {
            await s.handle.renovar();
            if (s.pendente) await persistir(s);
          } catch (e) {
            if (e.code === 'WA_LEASE_LOST' || s.handle.vencida()) {
              encerrar(s, 'Recuperando o vínculo após indisponibilidade do banco.');
              continue;
            }
          }
        }
        if (s.status === 'conectado' && s.socket?.ws?.isClosed === true) {
          fecharSocket(s); reagendar(s);
        } else if (s.status === 'inicializando' && s.socket && agora() - s.inicioAbertura > 90000) {
          console.warn(`[WhatsApp][empresa:${s.id}] abertura sem resposta; repetindo com o mesmo vínculo`);
          fecharSocket(s); reagendar(s);
        } else if (!s.socket && !s.timer && !s.abrindo) reagendar(s);
      }
      if (repositorio) for (const id of await repositorio().candidatas()) {
        if (parando) break;
        if (!sessoes.has(id) && !desligando.has(id)) await inicializarCliente(id, false).catch(() => {});
      }
    } catch (e) {
      console.warn('[WhatsApp] recuperação indisponível:', e.code === 'WA_AUTH_CONFIG' ? e.message : 'verifique o banco e a chave de autenticação.');
    } finally { revisando = false; }
  }
  function iniciarMonitor() {
    if (monitor || parando) return;
    const executar = async () => {
      monitor = null;
      try { await restaurar(); } finally {
        if (!parando) { monitor = agendar(executar, 20000); monitor?.unref?.(); }
      }
    };
    monitor = agendar(executar, 1000); monitor?.unref?.();
  }
  async function suspender() {
    parando = true;
    cancelar(monitor); monitor = null;
    await Promise.allSettled([...sessoes.values()].map(async s => {
      cancelar(s.timer); s.timer = null;
      fecharSocket(s);
      const handle = s.handle || (s.aquisicao && await s.aquisicao);
      await s.persistencia;
      if (handle) {
        if (s.terminal) await handle[s.terminal.acao]();
        else { await handle.salvar(); await handle.liberar(); }
      }
    }));
    sessoes.clear();
  }
  const isConectado = id => obterStatus(id).status === 'conectado';
  const indisponivel = () => ({ sucesso: false, temporario: true, erro: 'WhatsApp não está conectado. Conecte em Marketing → WhatsApp.' });
  async function enviarMensagem(id, telefone, texto, arquivo) {
    const s = sessoes.get(String(id));
    if (s?.status !== 'conectado') return indisponivel();
    const socket = s.socket;
    const candidatos = variantes(telefone);
    if (!candidatos.length) return { sucesso: false, erro: 'Número de telefone inválido.' };
    s.envios = s.envios.filter(t => t > Date.now() - 60000);
    if (s.envios.length >= 10) return { sucesso: false, temporario: true, erro: 'Limite de envios por minuto atingido.' };
    s.envios.push(Date.now());
    try {
      await pausaEnvio();
      if (!isConectado(id) || sessoes.get(String(id))?.socket !== socket) return indisponivel();
      const numeros = await socket.onWhatsApp(...candidatos);
      const destino = candidatos.find(jid => numeros?.some(n => n.exists && n.jid === jid))
        || numeros?.find(n => n.exists)?.jid;
      if (!destino) return { sucesso: false, erro: 'Número não encontrado no WhatsApp.' };
      let conteudo = { text: texto || '' };
      if (arquivo) {
        const arquivoLocal = arquivo.startsWith('/uploads/') ? path.join(__dirname, '../..', arquivo) : arquivo;
        const bytes = await fs.readFile(arquivoLocal);
        const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
          '.webp':'image/webp', '.gif':'image/gif' }[path.extname(arquivo).toLowerCase()];
        conteudo = mime ? { image: bytes, mimetype: mime, caption: texto || '' }
          : { document: bytes, fileName: path.basename(arquivo), mimetype: require('mime-types').lookup(arquivo) || 'application/octet-stream', caption: texto || '' };
      }
      if (!isConectado(id) || sessoes.get(String(id))?.socket !== socket) return indisponivel();
      const resultado = await socket.sendMessage(destino, conteudo);
      return resultado?.key?.id ? { sucesso: true, mensagemId: resultado.key.id }
        : { sucesso: false, erro: 'WhatsApp não confirmou o envio.' };
    } catch {
      if (!isConectado(id) || sessoes.get(String(id))?.socket !== socket) return indisponivel();
      return { sucesso: false, erro: 'Não foi possível enviar a mensagem ou carregar o anexo.' };
    }
  }
  return { iniciarMonitor, restaurar, suspender, inicializarCliente, obterStatus, isConectado, adicionarListenerSSE, enviarMensagem,
    empresasConectadas: () => [...sessoes.keys()].filter(isConectado), desconectar, limparSessao: desconectar };
}

function variantes(telefone) {
  const original = String(telefone || '').split('@')[0];
  let numero = original.replace(/\D/g, '');
  if (numero.length < 8 || numero.length > 15) return [];
  if (!original.startsWith('+') && !numero.startsWith('55') && numero.length <= 11) numero = '55' + numero;
  const numeros = [numero];
  if (numero.startsWith('55') && numero.length === 13 && numero[4] === '9') numeros.push(numero.slice(0, 4) + numero.slice(5));
  if (numero.startsWith('55') && numero.length === 12) numeros.push(numero.slice(0, 4) + '9' + numero.slice(4));
  return numeros.map(n => n + '@s.whatsapp.net');
}

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

let banco;
function repositorio() {
  banco ??= require('./whatsappAuthStore').criarRepositorio(require('../models/Cliente').sequelize);
  return banco;
}
async function atualizarResumo(id, status, numero) {
  const empresaId = Number(id);
  if (!Number.isSafeInteger(empresaId) || empresaId <= 0) return;
  const { WhatsappSession } = require('../models');
  // Nunca upsert sem chave única: isso criava novas linhas a cada reconexão.
  await WhatsappSession.update({ status, numero: numero || null,
    ...(status === 'conectado' ? { ultimaConexao: new Date() } : {}) }, { where: { empresaId } });
}
module.exports = { ...criarServico({ repositorio, atualizarResumo }), criarServico, substituirVariaveis };
