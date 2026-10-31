const path = require("path");
const fs = require("fs");
const {
  EmpresaPainel,
  Empresa,
  Usuario,
  BackupEmpresa,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const executionLock = require("./executionLock");

const BACKUP_DIR = path.join(__dirname, "../../backups");
const MAX_BACKUP_DIAS = 7;

// Garantir que a pasta de backups existe
function garantirDiretorio(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Obtém todos os modelos que possuem campo empresa_id
 * (excluindo modelos administrativos como BackupEmpresa, AdminImpersonationToken, PagamentoPainel)
 */
function getModelsComEmpresaId() {
  const allModels = require("../models");
  const excluir = [
    "BackupEmpresa",
    "AdminImpersonationToken",
    "PagamentoPainel",
    "sequelize",
  ];
  const result = [];
  for (const key of Object.keys(allModels)) {
    if (excluir.includes(key)) continue;
    const m = allModels[key];
    if (
      m &&
      m.rawAttributes &&
      Object.prototype.hasOwnProperty.call(m.rawAttributes, "empresa_id")
    ) {
      result.push({ name: key, model: m });
    }
  }
  return result;
}

/**
 * Encontra o ID da empresa no sistema (tabela empresas) pelo CNPJ da empresaPainel
 */
async function getEmpresaSistemaId(empresaPainel) {
  const cnpj = empresaPainel.cnpj
    ? empresaPainel.cnpj.replace(/\D/g, "")
    : null;
  if (!cnpj) return null;
  const empresa = await Empresa.findOne({ where: { cnpj } });
  return empresa ? empresa.id : null;
}

/**
 * Busca os usuários vinculados a uma empresa
 */
async function getUsuariosEmpresa(empresaSistemaId) {
  if (!empresaSistemaId) return [];
  try {
    const target = JSON.stringify(empresaSistemaId);
    const [rows] = await sequelize.query(
      "SELECT * FROM usuarios WHERE JSON_CONTAINS(empresas, ?)",
      { replacements: [target] },
    );
    return rows;
  } catch (e) {
    console.warn("[backup] Erro ao buscar usuários:", e && e.message);
    return [];
  }
}

/**
 * Realiza backup completo de uma empresa
 */
async function realizarBackupEmpresa(empresaPainelId) {
  const empresaPainel = await EmpresaPainel.findByPk(empresaPainelId);
  if (!empresaPainel) {
    throw new Error(`Empresa painel ${empresaPainelId} não encontrada`);
  }

  const empresaSistemaId = await getEmpresaSistemaId(empresaPainel);

  // Data de referência = ontem
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const dataRef = ontem.toISOString().split("T")[0];

  // Verificar se já existe backup para esta data
  const existente = await BackupEmpresa.findOne({
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: dataRef,
    },
  });
  if (existente) {
    console.log(
      `[backup] Backup já existe para empresa ${empresaPainelId} data ${dataRef}`,
    );
    return existente;
  }

  const models = getModelsComEmpresaId();
  const backupData = {
    meta: {
      empresa_painel_id: empresaPainelId,
      empresa_sistema_id: empresaSistemaId,
      data_referencia: dataRef,
      criado_em: new Date().toISOString(),
      nome_empresa: empresaPainel.nome_fantasia,
    },
    empresa_painel: empresaPainel.toJSON(),
    empresa_sistema: null,
    usuarios: [],
    tabelas: {},
  };

  let tabelasSalvas = 0;
  let registrosTotais = 0;

  // Backup dos dados da empresa no sistema
  if (empresaSistemaId) {
    const empresaSistema = await Empresa.findByPk(empresaSistemaId);
    if (empresaSistema) {
      backupData.empresa_sistema = empresaSistema.toJSON();
    }

    // Backup dos usuários
    backupData.usuarios = await getUsuariosEmpresa(empresaSistemaId);
    if (backupData.usuarios.length > 0) {
      registrosTotais += backupData.usuarios.length;
      tabelasSalvas++;
    }

    // Backup de cada tabela com empresa_id
    for (const entry of models) {
      try {
        // Buscar em batches para evitar fetch massivo em uma única query
        const batchSize = 1000;
        let offset = 0;
        const allRows = [];
        while (true) {
          const rowsBatch = await entry.model.findAll({
            where: { empresa_id: empresaSistemaId },
            raw: true,
            offset,
            limit: batchSize,
          });
          if (!rowsBatch || rowsBatch.length === 0) break;
          allRows.push(...rowsBatch);
          offset += rowsBatch.length;
          if (rowsBatch.length < batchSize) break;
        }
        if (allRows.length > 0) {
          backupData.tabelas[entry.name] = allRows;
          tabelasSalvas++;
          registrosTotais += allRows.length;
        }
      } catch (e) {
        console.warn(
          `[backup] Erro ao exportar ${entry.name}:`,
          e && e.message,
        );
      }
    }
  }

  // Salvar arquivo
  const empresaDir = path.join(BACKUP_DIR, String(empresaPainelId));
  garantirDiretorio(empresaDir);
  const filePath = path.join(empresaDir, `${dataRef}.json`);
  const jsonStr = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(filePath, jsonStr, "utf-8");
  const tamanho = Buffer.byteLength(jsonStr, "utf-8");

  // Registrar no banco
  const registro = await BackupEmpresa.create({
    empresa_painel_id: empresaPainelId,
    empresa_sistema_id: empresaSistemaId,
    data_referencia: dataRef,
    caminho_arquivo: filePath,
    tamanho_bytes: tamanho,
    tabelas_salvas: tabelasSalvas,
    registros_totais: registrosTotais,
    status: "COMPLETO",
  });

  console.log(
    `[backup] ✅ Backup empresa ${empresaPainel.nome_fantasia} (${dataRef}): ${tabelasSalvas} tabelas, ${registrosTotais} registros, ${(tamanho / 1024).toFixed(1)}KB`,
  );

  return registro;
}

/**
 * Remove backups mais antigos que 7 dias para uma empresa
 */
async function limparBackupsAntigos(empresaPainelId) {
  const limite = new Date();
  limite.setDate(limite.getDate() - MAX_BACKUP_DIAS);
  const dataLimite = limite.toISOString().split("T")[0];

  const antigos = await BackupEmpresa.findAll({
    attributes: ["id", "caminho_arquivo", "data_referencia"],
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: { [Op.lt]: dataLimite },
    },
    limit: 5000,
  });

  for (const backup of antigos) {
    // Remover arquivo do disco
    try {
      if (fs.existsSync(backup.caminho_arquivo)) {
        fs.unlinkSync(backup.caminho_arquivo);
      }
    } catch (e) {
      console.warn(
        `[backup] Erro ao remover arquivo ${backup.caminho_arquivo}:`,
        e && e.message,
      );
    }
    await backup.destroy();
  }

  if (antigos.length > 0) {
    console.log(
      `[backup] 🗑️ Removidos ${antigos.length} backups antigos da empresa ${empresaPainelId}`,
    );
  }
}

/**
 * Executa backup de TODAS as empresas (chamado pelo cron)
 */
async function executarBackupGeral(opts = {}) {
  const { maxPerRun = 1, delayBetweenMs = 0 } = opts || {};

  return executionLock.withLock("backup", async () => {
    console.log("[backup] ═══ Iniciando backup diário (limitado) ═══");

    const empresas = await EmpresaPainel.findAll({
      attributes: ["id", "nome_fantasia"],
      limit: 10000,
    });

    // Data de referência = ontem
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataRef = ontem.toISOString().split("T")[0];

    // Encontrar empresas que já têm backup para a dataRef
    const backupsHoje = await BackupEmpresa.findAll({
      where: { data_referencia: dataRef, status: "COMPLETO" },
      attributes: ["empresa_painel_id"],
    });
    const backedIds = new Set(
      backupsHoje.map((b) => String(b.empresa_painel_id)),
    );

    const empresasParaProcessar = empresas.filter(
      (e) => !backedIds.has(String(e.id)),
    );

    if (empresasParaProcessar.length === 0) {
      console.log(
        `[backup] ✅ Todos os backups já estão feitos para ${dataRef}`,
      );
      return { sucesso: 0, erros: 0, total: empresas.length, processed: 0 };
    }

    const toProcess = empresasParaProcessar.slice(0, maxPerRun);

    let sucesso = 0;
    let erros = 0;

    for (const emp of toProcess) {
      try {
        await realizarBackupEmpresa(emp.id);
        await limparBackupsAntigos(emp.id);
        sucesso++;
      } catch (err) {
        erros++;
        console.error(
          `[backup] ❌ Erro no backup de ${emp.nome_fantasia}:`,
          err && err.message,
        );
      }

      if (delayBetweenMs)
        await new Promise((r) => setTimeout(r, delayBetweenMs));
    }

    console.log(
      `[backup] ═══ Backup diário (limitado) concluído: ${sucesso} OK, ${erros} erros — processed ${toProcess.length} of ${empresas.length} ═══`,
    );

    return {
      sucesso,
      erros,
      total: empresas.length,
      processed: toProcess.length,
    };
  });
}

/**
 * Restaura o backup de uma empresa para uma data específica
 */
async function restaurarBackup(empresaPainelId, dataReferencia) {
  // Buscar registro do backup
  const backupReg = await BackupEmpresa.findOne({
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: dataReferencia,
      status: { [Op.ne]: "ERRO" },
    },
  });

  if (!backupReg) {
    throw new Error("Backup não encontrado para esta data");
  }

  // Ler arquivo do backup
  if (!fs.existsSync(backupReg.caminho_arquivo)) {
    throw new Error("Arquivo de backup não encontrado no disco");
  }

  const jsonStr = fs.readFileSync(backupReg.caminho_arquivo, "utf-8");
  const backupData = JSON.parse(jsonStr);

  const empresaPainel = await EmpresaPainel.findByPk(empresaPainelId);
  if (!empresaPainel) {
    throw new Error("Empresa não encontrada");
  }

  const empresaSistemaId = await getEmpresaSistemaId(empresaPainel);
  if (!empresaSistemaId) {
    throw new Error("Empresa do sistema não encontrada pelo CNPJ");
  }

  const t = await sequelize.transaction();
  try {
    const models = getModelsComEmpresaId();

    // Ordem para deletar (filhos primeiro)
    const preferred = [
      "Agendamento",
      "Venda",
      "Comissao",
      "PerfilComissao",
      "Entrada",
      "Saida",
      "Caixa",
      "Produto",
      "Profissional",
      "Fornecedor",
      "Pet",
      "Cliente",
    ];

    const ordered = [
      ...preferred.map((n) => models.find((x) => x.name === n)).filter(Boolean),
      ...models.filter((x) => !preferred.includes(x.name)),
    ];

    // 1. Deletar todos os dados atuais da empresa
    for (const entry of ordered) {
      try {
        await entry.model.destroy({
          where: { empresa_id: empresaSistemaId },
          transaction: t,
          force: true,
        });
      } catch (e) {
        console.warn(`[restore] Erro ao limpar ${entry.name}:`, e && e.message);
      }
    }

    // 2. Restaurar dados da empresa (tabela empresas)
    if (backupData.empresa_sistema) {
      const empData = { ...backupData.empresa_sistema };
      delete empData.id;
      delete empData.createdAt;
      delete empData.updatedAt;
      await Empresa.update(empData, {
        where: { id: empresaSistemaId },
        transaction: t,
      });
    }

    // 3. Restaurar dados de cada tabela (ordem inversa — pais primeiro)
    const insertOrder = [...ordered].reverse();

    for (const entry of insertOrder) {
      const rows = backupData.tabelas[entry.name];
      if (!rows || rows.length === 0) continue;

      try {
        // Remover campos auto-gerados e ajustar empresa_id
        const cleaned = rows.map((row) => {
          const r = { ...row };
          delete r.id;
          r.empresa_id = empresaSistemaId;
          return r;
        });

        await entry.model.bulkCreate(cleaned, {
          transaction: t,
          ignoreDuplicates: true,
        });
        console.log(
          `[restore] ✅ ${entry.name}: ${cleaned.length} registros restaurados`,
        );
      } catch (e) {
        console.warn(
          `[restore] ⚠️ Erro ao restaurar ${entry.name}:`,
          e && e.message,
        );
      }
    }

    // 4. Restaurar usuários
    if (backupData.usuarios && backupData.usuarios.length > 0) {
      for (const u of backupData.usuarios) {
        try {
          const existing = await Usuario.findByPk(u.id, { transaction: t });
          if (existing) {
            // Atualizar campos relevantes (não a senha, que já está hasheada)
            await sequelize.query(
              `UPDATE usuarios SET nome = ?, grupoUsuario = ?, ativo = ?, permissoes = ?, empresas = ? WHERE id = ?`,
              {
                replacements: [
                  u.nome,
                  u.grupoUsuario,
                  u.ativo ? 1 : 0,
                  typeof u.permissoes === "string"
                    ? u.permissoes
                    : JSON.stringify(u.permissoes || []),
                  typeof u.empresas === "string"
                    ? u.empresas
                    : JSON.stringify(u.empresas || []),
                  u.id,
                ],
                transaction: t,
              },
            );
          }
        } catch (e) {
          console.warn(
            `[restore] ⚠️ Erro ao restaurar usuário ${u.id}:`,
            e && e.message,
          );
        }
      }
    }

    await t.commit();

    // Marcar backup como restaurado
    backupReg.status = "RESTAURADO";
    backupReg.observacao = `Restaurado em ${new Date().toISOString()}`;
    await backupReg.save();

    console.log(
      `[restore] ✅ Restauração completa para empresa ${empresaPainel.nome_fantasia} (data: ${dataReferencia})`,
    );

    return {
      success: true,
      message: `Dados restaurados para ${dataReferencia}`,
      tabelas: Object.keys(backupData.tabelas).length,
      registros: backupReg.registros_totais,
    };
  } catch (err) {
    await t.rollback();
    console.error("[restore] ❌ Erro na restauração:", err);
    throw err;
  }
}

/**
 * Lista backups disponíveis para uma empresa
 */
async function listarBackups(empresaPainelId) {
  return BackupEmpresa.findAll({
    where: { empresa_painel_id: empresaPainelId },
    order: [["data_referencia", "DESC"]],
    attributes: [
      "id",
      "data_referencia",
      "tamanho_bytes",
      "tabelas_salvas",
      "registros_totais",
      "status",
      "createdAt",
    ],
    limit: 1000,
  });
}

/**
 * Lista backups de todas as empresas (resumo)
 */
async function listarBackupsGeral() {
  const empresas = await EmpresaPainel.findAll({
    attributes: ["id", "nome_fantasia", "cnpj", "status"],
    order: [["nome_fantasia", "ASC"]],
    limit: 10000,
  });

  const result = [];

  for (const emp of empresas) {
    // Buscar somente os últimos backups (limitar para evitar transferência massiva em memória)
    const lastBackups = await BackupEmpresa.findAll({
      where: { empresa_painel_id: emp.id },
      order: [["data_referencia", "DESC"]],
      attributes: [
        "id",
        "data_referencia",
        "tamanho_bytes",
        "tabelas_salvas",
        "registros_totais",
        "status",
        "createdAt",
      ],
      limit: 10,
    });

    // Obter contagem total separadamente (mais eficiente que buscar tudo)
    const totalBackups = await BackupEmpresa.count({
      where: { empresa_painel_id: emp.id },
    });

    result.push({
      empresa: {
        id: emp.id,
        nome: emp.nome_fantasia,
        cnpj: emp.cnpj,
        status: emp.status,
      },
      backups: lastBackups.map((b) => b.toJSON()),
      ultimo_backup:
        lastBackups.length > 0 ? lastBackups[0].data_referencia : null,
      total_backups: totalBackups,
    });
  }

  return result;
}

/**
 * Verifica se o backup de hoje já foi feito para todas as empresas.
 * Se alguma empresa não tiver backup de hoje, executa o backup geral.
 * Chamado na inicialização do servidor para garantir que o backup sempre ocorre,
 * mesmo que o server não estivesse rodando à meia-noite.
 */
async function verificarEExecutarBackupSeNecessario() {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    const empresas = await EmpresaPainel.findAll({
      attributes: ["id"],
      limit: 10000,
    });

    if (empresas.length === 0) return;

    const backupsHoje = await BackupEmpresa.count({
      where: {
        data_referencia: hoje,
        status: "COMPLETO",
      },
    });

    if (backupsHoje < empresas.length) {
      console.log(
        `[backup] ⚡ Backup de hoje (${hoje}) incompleto: ${backupsHoje}/${empresas.length} empresas. Executando agora (limitado)...`,
      );
      await executarBackupGeral({ maxPerRun: 1, delayBetweenMs: 1000 });
    } else {
      console.log(
        `[backup] ✅ Backup de hoje (${hoje}) já completo (${backupsHoje}/${empresas.length} empresas).`,
      );
    }
  } catch (err) {
    console.error(
      "[backup] ❌ Erro na verificação de backup na inicialização:",
      err.message,
    );
  }
}

module.exports = {
  realizarBackupEmpresa,
  limparBackupsAntigos,
  executarBackupGeral,
  restaurarBackup,
  listarBackups,
  listarBackupsGeral,
  verificarEExecutarBackupSeNecessario,
  BACKUP_DIR,
};
