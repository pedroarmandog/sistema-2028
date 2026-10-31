const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

async function run() {
  try {
    const { Usuario, Empresa, EmpresaPainel, sequelize } = require("../models");

    console.log("Conectando ao DB...");
    await sequelize.authenticate();
    console.log('Conectado. Procurando usuário "belto"...');

    const usuario = await Usuario.findOne({ where: { usuario: "belto" } });
    if (!usuario) {
      console.error(
        'Usuário "belto" não encontrado. Verifique o nome de usuário.',
      );
      process.exit(1);
    }

    const empresasAtuais = Array.isArray(usuario.empresas)
      ? usuario.empresas
      : [];
    console.log(
      "Empresas atuais do usuário:",
      JSON.stringify(empresasAtuais, null, 2),
    );

    // Fazer backup do valor atual
    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(
      backupDir,
      `belto_empresas_backup_${Date.now()}.json`,
    );
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        { usuarioId: usuario.id, empresas: empresasAtuais },
        null,
        2,
      ),
      "utf8",
    );
    console.log("Backup salvo em", backupPath);

    // 1) Remover papel administrativo
    console.log("Atualizando grupoUsuario para um papel não-admin...");
    usuario.grupoUsuario = "Usuario";

    // 2) Garantir que exista uma empresa chamada MERCADINHO FALCAO LTDA no sistema e no painel
    const targetName = "MERCADINHO FALCAO LTDA";

    // Tentar encontrar por ID (se estava no backup)
    let empresaSistema = null;
    if (empresasAtuais.length > 0) {
      const candidateId = parseInt(empresasAtuais[0].id, 10);
      if (!isNaN(candidateId)) {
        empresaSistema = await Empresa.findByPk(candidateId);
      }
    }

    // Buscar por nome/razão social (case-insensitive like)
    if (!empresaSistema) {
      empresaSistema = await Empresa.findOne({
        where: {
          [Op.or]: [
            { nome: { [Op.like]: `%${targetName}%` } },
            { razaoSocial: { [Op.like]: `%${targetName}%` } },
          ],
        },
      });
    }

    // Se não existir, criar um registro mínimo na tabela `empresas`
    if (!empresaSistema) {
      console.log(
        "Empresa não encontrada no sistema — criando novo registro em `empresas`...",
      );
      empresaSistema = await Empresa.create({
        nome: targetName,
        razaoSocial: targetName,
        cnpj: null,
        telefone: null,
        email: null,
        endereco: null,
        logo: null,
        ativa: true,
      });
      console.log("Empresa criada (sistema) id=", empresaSistema.id);
    } else {
      console.log("Empresa encontrada (sistema) id=", empresaSistema.id);
    }

    // Agora garantir entrada no painel admin (`empresas_painel`) para que apareça no admin-dashboard
    let empresaPainel = await EmpresaPainel.findOne({
      where: {
        [Op.or]: [
          { nome_fantasia: { [Op.like]: `%${targetName}%` } },
          { cnpj: empresaSistema.cnpj || null },
        ],
      },
    });

    if (!empresaPainel) {
      console.log(
        "Empresa não encontrada no painel admin. Criando entrada em `empresas_painel`...",
      );

      // Gerar CNPJ único simples (placeholder) caso não exista
      let cnpjCandidate = "9" + String(Date.now()).slice(-13);
      // Garantir 14 caracteres
      cnpjCandidate = cnpjCandidate.padStart(14, "1").slice(0, 14);

      // Evitar colisão
      while (await EmpresaPainel.findOne({ where: { cnpj: cnpjCandidate } })) {
        cnpjCandidate =
          "9" +
          String(Date.now() + Math.floor(Math.random() * 1000)).slice(-13);
        cnpjCandidate = cnpjCandidate.padStart(14, "1").slice(0, 14);
      }

      // data de vencimento 30 dias a partir de hoje
      const dataVenc = new Date();
      dataVenc.setDate(dataVenc.getDate() + 30);
      const dataVencStr = dataVenc.toISOString().split("T")[0];

      empresaPainel = await EmpresaPainel.create({
        razao_social: targetName,
        nome_fantasia: targetName,
        cnpj: cnpjCandidate,
        cep: null,
        endereco: null,
        email: null,
        telefone: null,
        foto: null,
        logo: null,
        data_adesao: new Date().toISOString().split("T")[0],
        status: "ATIVO",
        valor_mensalidade: 59.9,
        data_vencimento: dataVencStr,
        intervalo_dias: 30,
        proxima_cobranca: null,
      });

      console.log("Empresa criada no painel admin id=", empresaPainel.id);
    } else {
      console.log("Empresa já existe no painel admin id=", empresaPainel.id);
    }

    // Vincular usuário à empresa do sistema (usar id numérico)
    usuario.empresas = [empresaSistema.id];

    await usuario.save();

    console.log(
      "Usuário atualizado com sucesso. Novo grupoUsuario:",
      usuario.grupoUsuario,
    );
    console.log("Novo valor de empresas:", JSON.stringify(usuario.empresas));
    console.log(
      'Operação concluída. Verifique o admin-dashboard e o login de "belto".',
    );
    process.exit(0);
  } catch (err) {
    console.error(
      "Erro ao executar o script:",
      err && err.stack ? err.stack : err,
    );
    process.exit(99);
  }
}

run();
