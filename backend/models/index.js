const { Cliente } = require("./Cliente");
const Pet = require("./Pet");
const { Agendamento } = require("./Agendamento");
const { Venda } = require("./Venda");
const { Orcamento } = require("./Orcamento");
const { Caixa } = require("./Caixa");
const { MovimentoCaixa } = require("./MovimentoCaixa");
const { PagamentoCaixa } = require("./PagamentoCaixa");
const { Profissional } = require("./Profissional");
const EmpresaFactory = require("./Empresa");
const PerfilProduto = require("./PerfilProduto");
const PerfilCliente = require("./PerfilCliente");
const DescontoRelacao = require("./DescontoRelacao");
const AgrupamentoFactory = require("./Agrupamento");
const PerfilComissaoFactory = require("./PerfilComissao");
const ComissaoFactory = require("./Comissao");
const Porte = require("./Porte");
const Pelagem = require("./Pelagem");
const Raca = require("./Raca");
const Box = require("./Box");
const GrupoCliente = require("./GrupoCliente");
const Produto = require("./Produto");
const Fornecedor = require("./Fornecedor");
const Entrada = require("./Entrada");
const Saida = require("./Saida");
const ContaReceber = require("./ContaReceber");
const MovimentoHaver = require("./MovimentoHaver");
const MovimentoCrediario = require("./MovimentoCrediario");
const PeriodicidadeFactory = require("./Periodicidade");
// Modelos do módulo de Marketing/WhatsApp
const WhatsappSessionFactory = require("./WhatsappSession");
const MensagemAutomaticaFactory = require("./MensagemAutomatica");
const EnvioAgendadoFactory = require("./EnvioAgendado");
const LogEnvioFactory = require("./LogEnvio");
const CampanhaFactory = require("./Campanha");
const ContatoFactory = require("./Contato");
const BlacklistFactory = require("./Blacklist");

// Importar sequelize do Cliente para inicializar os modelos factory
const { sequelize } = require("./Cliente");
const Agrupamento = AgrupamentoFactory(sequelize);
const PerfilComissao = PerfilComissaoFactory(sequelize);
const Comissao = ComissaoFactory(sequelize);
const Empresa = EmpresaFactory(sequelize);
const Periodicidade = PeriodicidadeFactory(sequelize);
// Inicializar modelos de Marketing/WhatsApp
const WhatsappSession = WhatsappSessionFactory(sequelize);
const MensagemAutomatica = MensagemAutomaticaFactory(sequelize);
const EnvioAgendado = EnvioAgendadoFactory(sequelize);
const LogEnvio = LogEnvioFactory(sequelize);
const Campanha = CampanhaFactory(sequelize);
const Contato = ContatoFactory(sequelize);
const Blacklist = BlacklistFactory(sequelize);
// Inicializar modelo Usuario (factory)
const UsuarioFactory = require("./Usuario");
const Usuario = UsuarioFactory(sequelize);
// Inicializar modelo UserFilter
const UserFilterFactory = require("./UserFilter");
const UserFilter = UserFilterFactory(sequelize);
// Inicializar modelos do Painel Admin
const AdminFactory = require("./Admin");
const Admin = AdminFactory(sequelize);
const EmpresaPainelFactory = require("./EmpresaPainel");
const EmpresaPainel = EmpresaPainelFactory(sequelize);
const PagamentoPainelFactory = require("./PagamentoPainel");
const PagamentoPainel = PagamentoPainelFactory(sequelize);
const AdminImpersonationTokenFactory = require("./AdminImpersonationToken");
const AdminImpersonationToken = AdminImpersonationTokenFactory(sequelize);
const BackupEmpresaFactory = require("./BackupEmpresa");
const BackupEmpresa = BackupEmpresaFactory(sequelize);
const SessaoAtivaFactory = require("./SessaoAtiva");
const SessaoAtiva = SessaoAtivaFactory(sequelize);
// Lembrete Automático de Produto Recorrente
const ProdutoLembreteRecorrenteFactory = require("./ProdutoLembreteRecorrente");
const ProdutoLembreteRecorrente = ProdutoLembreteRecorrenteFactory(sequelize);

// Definir associações
Cliente.hasMany(Pet, {
  foreignKey: "cliente_id",
  as: "pets",
});

Pet.belongsTo(Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

Pet.hasMany(Agendamento, {
  foreignKey: "petId",
  as: "agendamentos",
});

Agendamento.belongsTo(Pet, {
  foreignKey: "petId",
  as: "pet",
});

// Associação Venda ↔ Cliente
Venda.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "Cliente",
});

Cliente.hasMany(Venda, {
  foreignKey: "clienteId",
  as: "vendas",
});

console.log("✅ Associações Cliente ↔ Pet ↔ Agendamento configuradas");
console.log("✅ Associações Cliente ↔ Venda configuradas");

// Associações Painel Admin
EmpresaPainel.hasMany(PagamentoPainel, {
  foreignKey: "empresa_id",
  as: "pagamentos",
});
PagamentoPainel.belongsTo(EmpresaPainel, {
  foreignKey: "empresa_id",
  as: "empresa",
});
console.log("✅ Associações EmpresaPainel ↔ PagamentoPainel configuradas");

// Associações ProdutoLembreteRecorrente ↔ Cliente
Cliente.hasMany(ProdutoLembreteRecorrente, {
  foreignKey: "cliente_id",
  as: "lembretes",
});
ProdutoLembreteRecorrente.belongsTo(Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});
console.log("✅ Associações Cliente ↔ ProdutoLembreteRecorrente configuradas");

// Associações SessaoAtiva
EmpresaPainel.hasMany(SessaoAtiva, {
  foreignKey: "empresa_id",
  as: "sessoes",
});
SessaoAtiva.belongsTo(EmpresaPainel, {
  foreignKey: "empresa_id",
  as: "empresa",
});
console.log("✅ Associações EmpresaPainel ↔ SessaoAtiva configuradas");

// Push Notifications
const PushSubscriptionFactory = require("./PushSubscription");
const PushSubscription = PushSubscriptionFactory(sequelize);
console.log("✅ Modelo PushSubscription inicializado");

// Módulo Fiscal
const ConfiguracaoFiscal = require("./ConfiguracaoFiscal");
const NotaFiscal = require("./NotaFiscal");
console.log("✅ Modelos fiscais inicializados");

// Exportar todos os modelos
module.exports = {
  Cliente,
  Pet,
  Agendamento,
  Venda,
  Orcamento,
  Caixa,
  MovimentoCaixa,
  PagamentoCaixa,
  Profissional,
  Empresa,
  PerfilProduto,
  PerfilCliente,
  DescontoRelacao,
  Agrupamento,
  PerfilComissao,
  Comissao,
  Porte,
  Pelagem,
  Raca,
  Box,
  GrupoCliente,
  Periodicidade,
  Usuario,
  UserFilter,
  Produto,
  Fornecedor,
  Entrada,
  Saida,
  ContaReceber,
  MovimentoHaver,
  MovimentoCrediario,
  // Marketing/WhatsApp
  WhatsappSession,
  MensagemAutomatica,
  EnvioAgendado,
  LogEnvio,
  Campanha,
  Contato,
  Blacklist,
  // Painel Admin
  Admin,
  EmpresaPainel,
  PagamentoPainel,
  AdminImpersonationToken,
  BackupEmpresa,
  SessaoAtiva,
  ProdutoLembreteRecorrente,
  // PWA Push Notifications
  PushSubscription,
  // Módulo Fiscal
  ConfiguracaoFiscal,
  NotaFiscal,
  sequelize,
};
