// O ERP usa CommonJS. Baileys é ESM e é carregado na primeira conexão.
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('node:fs/promises');
const path = require('node:path');
const { WhatsappSession } = require('../models');

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

function criarServico({ carregar = importBaileys, gerarQR = QRCode.toDataURL,
  agendar = setTimeout, cancelar = clearTimeout,
  pausaEnvio = () => new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 7000)) } = {}) {
  const sessoes = new Map();
  const listeners = new Map();
  const desligando = new Map();
  const desconectado = () => ({ status: 'desconectado', numero: null, qrBase64: null });
  async function salvarStatusNoBanco(id, status, numero) {
    try {
      const empresaId = Number(id);
      if (!Number.isSafeInteger(empresaId) || empresaId <= 0) return;
      await WhatsappSession.upsert({
        empresaId,
        status,
        numero: numero || null,
        ultimaConexao: status === 'conectado' ? new Date() : undefined,
      }, { fields: ['empresaId', 'status', 'numero', 'ultimaConexao'] });
    } catch (_) {
      // Silencioso — não derruba a conexão por falha de persistência
    }
  }
  const obterStatus = id => {
    const s = sessoes.get(String(id));
    return s ? { status: s.status, numero: s.numero, qrBase64: s.qr } : desconectado();
  };
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
    s.numero = null;
    emitir(s.id, 'status', obterStatus(s.id));
  }
  function encerrar(s, erro) {
    if (sessoes.get(s.id) !== s) return;
    sessoes.delete(s.id);
    cancelar(s.timer);
    s.revisao++;
    salvarStatusNoBanco(s.id, 'desconectado', null);
    const socket = s.socket;
    s.socket = null;
    socket?.end();
    emitir(s.id, erro ? 'erro' : 'desconectado', { ...desconectado(), mensagem: erro });
  }
  async function abrir(s) {
    try {
      const lib = await carregar();
      if (sessoes.get(s.id) !== s) return;
      s.auth ??= novaAutenticacao(lib);
      const socket = lib.default({ auth: s.auth, logger, syncFullHistory: false,
        markOnlineOnConnect: false, browser: lib.Browsers.macOS('Desktop'), shouldSyncHistoryMessage: () => false });
      s.socket = socket;
      const atual = () => sessoes.get(s.id) === s && s.socket === socket;
      socket.ev.on('creds.update', dados => {
        if (atual()) Object.assign(s.auth.creds, dados);
      });
      socket.ev.on('connection.update', async update => {
        if (!atual()) return;
        if (update.connection === 'close') {
          s.socket = null;
          const motivo = update.lastDisconnect?.error?.output?.statusCode;
          console.info(`[WhatsApp][empresa:${s.id}] socket encerrado, código ${motivo ?? "desconhecido"}`);
          const r = lib.DisconnectReason;
          const invalido = [r.loggedOut, r.badSession, r.forbidden,
            r.multideviceMismatch, r.connectionReplaced].includes(motivo);
          if (invalido) {
            salvarStatusNoBanco(s.id, 'desconectado', null);
            encerrar(s, 'Conexão encerrada. Clique em Conectar para parear novamente.');
            return;
          }
          // Reconexão indefinida para falhas de rede/servidor (não invalida a sessão).
          // Backoff exponencial com teto de 60s.
          aguardar(s);
          const atraso = Math.min(1000 * 2 ** (s.tentativas++), 60000);
          s.timer = agendar(() => abrir(s), atraso);
          return;
        }
        if (update.connection === 'open') {
          s.revisao++;
          s.status = 'conectado';
          console.info(`[WhatsApp][empresa:${s.id}] conexão aberta para envio`);
          s.qr = null;
          s.numero = (socket.user?.id || '').split(/[:@]/)[0] || null;
          s.tentativas = 0;
          salvarStatusNoBanco(s.id, 'conectado', s.numero);
          emitir(s.id, 'conectado', obterStatus(s.id));
          return;
        }
        if (update.isNewLogin) {
          console.info(`[WhatsApp][empresa:${s.id}] leitura aceita, aguardando confirmação de conexão`);
          // aguardar(s) removido: não limpar QR após isNewLogin
          return;
        }
        if (update.qr) {
          const revisao = ++s.revisao;
          try {
            const qr = await gerarQR(update.qr);
            if (!atual() || s.revisao !== revisao) return;
            s.qr = qr;
            s.status = 'aguardando_qr';
            emitir(s.id, 'qr', obterStatus(s.id));
          } catch {
            if (atual() && s.revisao === revisao) encerrar(s, 'Falha ao gerar QR.');
          }
        }
      });
    } catch {
      encerrar(s, 'Falha ao iniciar a conexão WhatsApp. Tente novamente.');
    }
  }
  async function inicializarCliente(id) {
    const chave = String(id);
    if (!/^[1-9]\d*$/.test(chave)) throw new Error('Empresa inválida');
    if (desligando.has(chave)) await desligando.get(chave);
    const existente = sessoes.get(chave);
    if (existente) return { status: existente.status === 'conectado' ? 'ja_conectado' : existente.status };
    const s = { id: chave, status: 'inicializando', qr: null, numero: null,
      socket: null, revisao: 0, tentativas: 0, envios: [] };
    sessoes.set(chave, s);
    aguardar(s);
    await abrir(s);
    if (sessoes.get(chave) !== s) throw new Error('Conexão encerrada.');
    return { status: s.status };
  }
  async function desconectar(id) {
    const chave = String(id);
    if (desligando.has(chave)) return desligando.get(chave);
    const s = sessoes.get(chave);
    if (!s) return;
    sessoes.delete(chave);
    cancelar(s.timer);
    salvarStatusNoBanco(chave, 'desconectado', null);
    emitir(chave, 'desconectado', desconectado());
    const socket = s.socket;
    const fim = Promise.resolve().then(async () => {
      try { await socket?.logout(); } catch { /* Já desconectado. */ }
      finally { await socket?.end(); }
    });
    desligando.set(chave, fim);
    try { await fim; } finally { desligando.delete(chave); }
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
  return { inicializarCliente, obterStatus, isConectado, adicionarListenerSSE, enviarMensagem,
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

module.exports = { ...criarServico(), criarServico, substituirVariaveis };
