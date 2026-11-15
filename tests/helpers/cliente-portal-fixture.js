const { Sequelize, DataTypes: D } = require('sequelize');
const crypto = require('node:crypto');
async function fixture(t, op = {}) {
    const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false, dialectModule: require('../../backend/scripts/lab-fiscal/sqlite') });
    t.after(() => db.close());
    const define = (n, a, table) => db.define(n, a, { tableName: table });
    const Empresa = define('Empresa', { nome: D.STRING, ativo: { type: D.BOOLEAN, defaultValue: true }, telefone: D.STRING, logo: D.STRING, endereco: D.JSON }, 'empresas');
    const Cliente = define('Cliente', { nome: D.STRING, empresa_id: D.INTEGER, email: D.STRING, ativo: { type: D.BOOLEAN, defaultValue: true }, telefone: D.STRING, cep: D.STRING, endereco: D.STRING, numero: D.STRING, complemento: D.STRING, bairro: D.STRING, cidade: D.STRING, estado:D.STRING, cpf: D.STRING, limiteCredito: D.DECIMAL }, 'Clientes');
    const Pet = define('Pet', { nome: { type: D.STRING, allowNull: false }, especie: D.STRING, raca: D.STRING, genero: D.STRING, porte: D.STRING, cor: D.STRING, pelagem: D.STRING, data_nascimento: D.DATEONLY, peso: D.DECIMAL, cliente_id: { type: D.INTEGER, references: { model: 'Clientes', key: 'id' } }, empresa_id: D.INTEGER, ativo: { type: D.BOOLEAN, defaultValue: true }, foto_url: D.STRING, observacao: D.TEXT, alergias: D.TEXT }, 'pets');
    const Produto = define('Produto', { id: { type: D.STRING(64), primaryKey: true }, nome: D.STRING, tipo: D.STRING, preco: D.DECIMAL, empresa_id: D.INTEGER }, 'produtos');
    const Profissional = define('Profissional', { nome: D.STRING, status: D.STRING, empresa_id: D.INTEGER }, 'profissionais');
    const Agendamento = define('Agendamento', { empresa_id: D.INTEGER, petId: D.INTEGER, dataAgendamento: D.DATE, horario: D.STRING, servico: D.STRING, servicos: D.JSON, status: { type: D.STRING, defaultValue: 'agendado' }, observacoes: D.TEXT, profissional: D.STRING, valor: D.DECIMAL }, 'agendamentos');
    const ERP = { sequelize: db, Empresa, Cliente, Pet, Produto, Profissional, Agendamento };
    await db.sync();
    await Empresa.bulkCreate([{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }]);
    await Cliente.bulkCreate([{ id: 1, nome: 'Ana', email: 'ana@example.com', empresa_id: 1 }, { id: 2, nome: 'Bia', email: 'bia@example.com', empresa_id: 2 }, { id: 3, nome: 'Caio', empresa_id: 1 }]);
    await Pet.bulkCreate([{ id: 1, nome: 'Bobby', especie: 'Cão', cliente_id: 1, empresa_id: 1, observacao: 'SEGREDO CLINICO', alergias: 'PRIVADO' }, { id: 2, nome: 'Mel', cliente_id: 2, empresa_id: 2 }, { id: 3, nome: 'Sol', cliente_id: 3, empresa_id: 1 }]);
    await Produto.bulkCreate([{ id: 'banho', nome: 'Banho', tipo: 'serviço', preco: 79, empresa_id: 1 }, { id: 'outro', nome: 'Serviço B', tipo: 'servico', preco: 50, empresa_id: 2 }, { id: 'racao', nome: 'Ração', tipo: 'produto', preco: 100, empresa_id: 1 }]);
    await Profissional.bulkCreate([{ id: 1, nome: 'João', status: 'ativo', empresa_id: 1 }, { id: 2, nome: 'Lia', status: 'ativo', empresa_id: 2 }]);
    await require('../../backend/services/clientePortal/modelos').preparar(db);
    let now = new Date('2026-11-16T10:00:00Z'), after = [], pushes = [];
    const arquivos = new Map();
    const midias = () => ({ async salvar(emp, bytes, modulo) { const ref = '/uploads/' + modulo + '/' + crypto.randomUUID() + '.webp'; arquivos.set(ref, { empresa: emp, bytes, tipo: 'image/webp' }); return { url: ref }; }, async ler(emp, ref) { const r = arquivos.get(ref); if (!r || r.empresa !== emp)
            throw Object.assign(Error('Não encontrada'), { status: 404 }); return r; } });
    const portal = require('../../backend/services/clientePortal').criarPortal({ ERP, env: { NODE_ENV: 'test', JWT_CLIENTE_SECRET: 'teste-cliente-segredo-separado-32-bytes-12345', JWT_USER_SECRET: 'segredo-erp' }, agora: () => now, custoHash: 4, midias, aposConfirmar: async (a, emp) => after.push({ id: a.id, emp }), push: () => ({ getVapidPublicKey: () => op.pushAtivo ? 'chave-publica-teste' : null, notificarEmpresa: async () => { } }), enviar: async (sub, p) => pushes.push({ sub, p }) });
    const regras = { dias: [1, 2, 3, 4, 5], inicio: '08:00', fim: '18:00', intervalo: 30, capacidade: 1, duracaoPadrao: 60, antecedencia: 0, horizonte: 60, feriados: [], bloqueios: [], servicos: [{ id: 'banho', duracao: 60, mostrarPreco: true, profissional: 1 }] };
    await portal.m.Config.create({ empresa_id: 1, slug: crypto.randomUUID(), ativo: true, receber_pedidos: true, regras });
    await portal.m.Config.create({ empresa_id: 2, slug: crypto.randomUUID(), ativo: true });
    async function ativar(cli = 1, emp = 1, email = 'ana@example.com') { const inv = await portal.auth.convite(emp, cli, email, 9), token = new URL('http://x' + inv.convite).hash.slice(9); await portal.auth.aceitarConvite({ token, senha: 'SenhaNova1234' }); let cookie; const res = { cookie: (name, value, options) => { cookie = { name, value, options }; } }; const cfg = await portal.config(emp); const login = await portal.auth.login({ loja: cfg.slug, email, senha: 'SenhaNova1234' }, res); const tutor = await portal.auth.contexto(cookie.value); return { tutor, cookie, login, inv }; }
    return { db, ERP, p: portal, regras, ativar, after, pushes, arquivos, setNow: v => now = new Date(v) };
}
module.exports = { fixture };
