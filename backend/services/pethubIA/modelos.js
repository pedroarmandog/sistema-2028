'use strict';
const { DataTypes: D } = require('sequelize');
const crypto = require('node:crypto');
function modelos(db) {
  if (db.__pethubIAModelos) return db.__pethubIAModelos;
  const pk = () => ({ type: D.STRING(64), primaryKey: true, defaultValue: () => crypto.randomUUID() });
  const emp = () => ({ type: D.INTEGER, allowNull: false });
  const j = value => ({ type: D.JSON, allowNull: false, defaultValue: value });
  const number = () => ({ type: D.BIGINT, allowNull: false, defaultValue: 0 });
  const define = (name, fields, indexes = []) => db.define('PetHubIA' + name, fields, { tableName: 'pethub_ia_' + name.toLowerCase(), indexes, timestamps: true });
  const m = {
    Global: define('Global', { id: { type: D.INTEGER, primaryKey: true }, habilitado: { type: D.BOOLEAN, defaultValue: false }, periodo: D.STRING(7), teto_micros: number(), gasto_micros: number(), reserva_micros: number(), configuracao: j({}), revisao: { type: D.INTEGER, defaultValue: 0 } }),
    Plano: define('Planos', { id: pk(), nome: D.STRING(100), ativo: { type: D.BOOLEAN, defaultValue: true }, mensalidade_centavos: number(), respostas: number(), tokens: number(), audios_segundos: number(), teto_micros: number(), modelos: j([]), funcionalidades: j([]), versao: { type: D.INTEGER, defaultValue: 1 } }),
    Assinatura: define('Assinaturas', { empresa_id: { ...emp(), primaryKey: true }, estado: { type: D.STRING(20), defaultValue: 'desativado' }, plano_id: D.STRING(64), contrato: j({}), inicio: D.DATE, vencimento: D.DATE, renovacao: D.DATE, ciclo_id: D.STRING(64), notas: D.TEXT, revisao: { type: D.INTEGER, defaultValue: 0 } }),
    Config: define('Configuracoes', { empresa_id: { ...emp(), primaryKey: true }, operacional: { type: D.BOOLEAN, defaultValue: false }, etapa: { type: D.INTEGER, defaultValue: 0 }, dados: j({}), teste_em: D.DATE, revisao: { type: D.INTEGER, defaultValue: 0 } }),
    Ciclo: define('Ciclos', { id: pk(), empresa_id: emp(), inicio: D.DATE, fim: D.DATE, limites: j({}), respostas: number(), tokens: number(), audios_segundos: number(), custo_micros: number(), reservado_micros: number(), reservado_respostas: number(), reservado_tokens: number(), reservado_audio: number() }, [{ unique: true, fields: ['empresa_id', 'inicio'] }]),
    Credito: define('Creditos', { id: pk(), empresa_id: emp(), ciclo_id: D.STRING(64), quantidade: number(), tipo: D.STRING(24), valor_centavos: number(), expira: D.DATE, autor: D.STRING(64), chave: D.STRING(64) }, [{ unique: true, fields: ['empresa_id', 'chave'] }]),
    Conversa: define('Conversas', { id: pk(), empresa_id: emp(), contato_hash: D.STRING(64), contato_cifrado: D.TEXT, nome: D.STRING(100), provedor: D.STRING(16), estado: { type: D.STRING(20), defaultValue: 'ia' }, dono: D.STRING(64), lease: D.STRING(64), lease_ate: D.DATE, revisao: { type: D.INTEGER, defaultValue: 0 }, contexto: j({}), ultima_entrada: D.DATE, ultimo_envio: D.DATE, bloqueada: { type: D.BOOLEAN, defaultValue: false } }, [{ unique: true, fields: ['empresa_id', 'provedor', 'contato_hash'] }]),
    Mensagem: define('Mensagens', { id: pk(), empresa_id: emp(), conversa_id: D.STRING(64), externa: D.STRING(191), papel: D.STRING(16), texto_cifrado: D.TEXT('long'), audio_ref: D.STRING(256), evento: j({}), job_id: D.STRING(64), enviada_em: D.DATE }, [{ unique: true, fields: ['empresa_id', 'externa'] }, { fields: ['empresa_id', 'conversa_id', 'createdAt'] }]),
    Fila: define('Fila', { id: pk(), empresa_id: emp(), conversa_id: D.STRING(64), chave: D.STRING(64), estado: { type: D.STRING(20), defaultValue: 'pendente' }, disponivel: D.DATE, lease: D.STRING(64), lease_ate: D.DATE, tentativas: { type: D.INTEGER, defaultValue: 0 }, dados: j({}), saida_cifrada: D.TEXT('long'), envio_id: D.STRING(191), erro: D.STRING(100), assinatura_revisao: D.INTEGER, config_revisao: D.INTEGER, ciclo_id: D.STRING(64), teste: { type: D.BOOLEAN, defaultValue: false } }, [{ unique: true, fields: ['empresa_id', 'chave'] }, { fields: ['estado', 'disponivel'] }, { fields: ['empresa_id', 'conversa_id'] }]),
    Consumo: define('Consumo', { id: pk(), empresa_id: emp(), conversa_id: D.STRING(64), job_id: D.STRING(64), ciclo_id: D.STRING(64), modelo: D.STRING(100), precificacao: j({}), finalidade: D.STRING(30), estado: D.STRING(24), request_id: D.STRING(191), entrada: number(), saida: number(), cache: number(), audio_segundos: number(), custo_micros: number(), reserva_micros: number(), reserva_tokens: number(), confirmado_em: D.DATE, ferramentas: { type: D.INTEGER, defaultValue: 0 } }, [{ fields: ['empresa_id', 'createdAt'] }, { fields: ['job_id'] }]),
    Acao: define('Acoes', { id: pk(), empresa_id: emp(), conversa_id: D.STRING(64), job_id: D.STRING(64), tipo: D.STRING(40), estado: D.STRING(24), idempotencia: D.STRING(64), proposta: j({}), resultado: j({}), expira: D.DATE, confirmada_mensagem: D.STRING(64) }, [{ unique: true, fields: ['empresa_id', 'idempotencia'] }]),
    Auditoria: define('Auditoria', { id: pk(), empresa_id: D.INTEGER, autor: D.STRING(64), tipo: D.STRING(40), dados: j({}) }, [{ fields: ['empresa_id', 'createdAt'] }]),
    Preco: define('Precos', { id: { type: D.STRING(100), primaryKey: true }, entrada_micros_milhao: number(), saida_micros_milhao: number(), cache_micros_milhao: number(), audio_micros_minuto: number(), ativo: { type: D.BOOLEAN, defaultValue: false }, verificado_em: D.DATE, fonte: D.STRING(500) }),
    Fatura: define('Faturas', { id: pk(), empresa_id: D.INTEGER, provedor: D.STRING(24), referencia: D.STRING(120), inicio: D.DATEONLY, fim: D.DATEONLY, valor_micros: number(), observacoes: D.TEXT, autor: D.STRING(64), chave: { type:D.STRING(64),allowNull:false,unique:true } }, [{ fields:['empresa_id','inicio'] }]),
    Notificacao: define('Notificacoes', { id: pk(), empresa_id: emp(), chave: D.STRING(100), tipo: D.STRING(32), dados: j({}), entregue_em: D.DATE }, [{ unique: true, fields: ['empresa_id', 'chave'] }]),
  };
  db.__pethubIAModelos = m;
  return m;
}
const FUNCOES = ['duvidas','produtos','precos','estoque','servicos','horarios','agendar','cancelar','reagendar','cadastrar_cliente','cadastrar_pet','atualizar_cliente','agendamentos','status_pet','ofertas','taxidog','audio','humano','relatorios','scripts_avancados'];
async function preparar(db) {
  const m = modelos(db);
  for (const model of Object.values(m)) await model.sync(); // CREATE IF NOT EXISTS; nunca alter/force.
  await m.Global.findOrCreate({ where: { id: 1 }, defaults: { habilitado: false, configuracao: {} } });
  for (const [id,nome,preco,respostas,features] of [
    ['essencial','PetHub IA Essencial',19990,3000,FUNCOES.filter(f=>!['audio','relatorios','scripts_avancados'].includes(f))],
    ['profissional','PetHub IA Profissional',34990,8000,FUNCOES],
    ['personalizado','PetHub IA Personalizado',0,0,[]],
  ]) await m.Plano.findOrCreate({ where: { id }, defaults: { nome, mensalidade_centavos: preco, respostas, funcionalidades: features, modelos: [], teto_micros: 0, tokens: 0, audios_segundos: 0 } });
  return m;
}
module.exports = { modelos, preparar, FUNCOES };
