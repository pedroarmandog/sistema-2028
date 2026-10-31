const { Admin } = require("../models");
const backupService = require("../services/backupService");

// GET /api/admin/backups — listar backups de todas as empresas
async function listarTodos(req, res) {
  try {
    const result = await backupService.listarBackupsGeral();
    return res.json(result);
  } catch (err) {
    console.error("[backupController] Erro ao listar backups:", err);
    return res.status(500).json({ error: "Erro ao listar backups" });
  }
}

// GET /api/admin/backups/:empresaId — listar backups de uma empresa
async function listarPorEmpresa(req, res) {
  try {
    const backups = await backupService.listarBackups(
      Number(req.params.empresaId),
    );
    return res.json(backups);
  } catch (err) {
    console.error("[backupController] Erro ao listar backups:", err);
    return res.status(500).json({ error: "Erro ao listar backups" });
  }
}

// POST /api/admin/backups/:empresaId/restaurar — restaurar backup
async function restaurar(req, res) {
  try {
    if (!req.adminId) {
      return res.status(403).json({ error: "Ação restrita a administradores" });
    }

    const { usuario, senha, data_referencia } = req.body || {};

    if (!data_referencia) {
      return res
        .status(400)
        .json({ error: "Data de referência é obrigatória" });
    }

    if (!senha) {
      return res
        .status(400)
        .json({ error: "Senha do admin é obrigatória para restaurar" });
    }

    // Validar credenciais do admin
    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(401).json({ error: "Admin não encontrado" });
    }

    if (usuario) {
      const norm = String(usuario).trim().toLowerCase();
      const matchesUser =
        (admin.email && String(admin.email).toLowerCase() === norm) ||
        (admin.nome && String(admin.nome).toLowerCase() === norm) ||
        (admin.sobrenome && String(admin.sobrenome).toLowerCase() === norm) ||
        String(admin.id) === norm;
      if (!matchesUser) {
        return res.status(403).json({
          error: "Usuário administrador não confere com o admin logado",
        });
      }
    }

    const senhaValida = await admin.validarSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const result = await backupService.restaurarBackup(
      Number(req.params.empresaId),
      data_referencia,
    );

    return res.json(result);
  } catch (err) {
    console.error("[backupController] Erro ao restaurar:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erro ao restaurar backup" });
  }
}

// POST /api/admin/backups/executar — executar backup manual de todas as empresas
async function executarManual(req, res) {
  try {
    if (!req.adminId) {
      return res.status(403).json({ error: "Ação restrita a administradores" });
    }

    const result = await backupService.executarBackupGeral();
    return res.json({
      message: `Backup executado: ${result.sucesso} empresas OK, ${result.erros} erros`,
      ...result,
    });
  } catch (err) {
    console.error("[backupController] Erro ao executar backup:", err);
    return res.status(500).json({ error: "Erro ao executar backup" });
  }
}

module.exports = {
  listarTodos,
  listarPorEmpresa,
  restaurar,
  executarManual,
};
