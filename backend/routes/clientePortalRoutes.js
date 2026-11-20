"use strict";
const express = require("express"),
  multer = require("multer"),
  { Op } = require("sequelize"),
  V = require("../services/clientePortal/validacao");
function criarRotas(p, { authERP, permissao } = {}) {
  const tutor = express.Router(),
    gestor = express.Router(),
    { ERP, m, auth, cadastros: c, pedidos, notificacoes: n } = p;
  const wrap = (fn) => async (req, res, next) => {
    try {
      const r = await fn(req, res);
      if (r !== undefined && !res.headersSent) res.json(r);
    } catch (e) {
      if (res.headersSent) return res.end();
      const status =
        e.status || e.statusCode || (e.code === "LIMIT_FILE_SIZE" ? 413 : 503);
      res
        .status(status >= 400 && status <= 599 ? status : 503)
        .json({
          erro: e.status
            ? e.message
            : e.code === "LIMIT_FILE_SIZE"
              ? "Arquivo excede 8 MB."
              : "Não foi possível concluir agora. Tente novamente.",
        });
    }
  };
  const ajax = (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("X-PetHub-Cliente") !== "1"
    )
      return res.status(403).json({ erro: "Reabra a página para continuar." });
    next();
  };
  const baldes = new Map();
  const limite = (req, res, next) => {
    const k = req.ip || "local",
      agora = Date.now();
    let r = baldes.get(k);
    if (!r || r.ate < agora) {
      r = { ate: agora + 60000, n: 0 };
      baldes.set(k, r);
    }
    if (baldes.size > 10000) baldes.delete(baldes.keys().next().value);
    if (++r.n > 40)
      return res
        .status(429)
        .json({ erro: "Muitas tentativas. Aguarde um minuto." });
    next();
  };
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
  }).single("arquivo");
  const arquivo = (fn) => (req, res) =>
    new Promise((resolve) =>
      upload(req, res, (e) => {
        if (e)
          return resolve(
            res
              .status(e.code === "LIMIT_FILE_SIZE" ? 413 : 400)
              .json({ erro: "Envie um arquivo de até 8 MB." }),
          );
        if (!req.file)
          return resolve(
            res.status(400).json({ erro: "Selecione um arquivo." }),
          );
        Promise.resolve(fn(req, res))
          .then(resolve)
          .catch((err) =>
            resolve(
              res
                .status(err.status || 503)
                .json({
                  erro: err.status
                    ? err.message
                    : "Não foi possível salvar o arquivo. Confira o armazenamento permanente.",
                }),
            ),
          );
      }),
    );
  async function binario(res, r) {
    res.set({
      "Content-Type": r.tipo,
      "Content-Length": r.bytes.length,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    });
    res.send(r.bytes);
  }
  tutor.use(ajax);
  const { nomeEmpresa } = require("../services/clientePortal/identidadeEmpresa");
  const logoEmpresa = require("../services/clientePortal/logoEmpresa"),
    logoApp = logoEmpresa.criarLogo(p);
  const estabelecimento =
    auth.estabelecimento ||
    async function (slug) {
      const config = await m.Config.findOne({
        where: { slug: V.uuid(slug) },
        logging: false,
      });
      if (!config) throw V.falha("Estabelecimento não encontrado.", 404);
      if (!config.ativo)
        throw V.falha("O portal deste estabelecimento está desativado.", 403);
      const empresa = await ERP.Empresa.findByPk(config.empresa_id, {
        logging: false,
      });
      if (!empresa || empresa.ativo === false)
        throw V.falha("Estabelecimento indisponível.", 404);
      return { config, empresa };
    };
  // A rota exata deve vir antes de /loja/:slug: 'logo' não é um slug.
  tutor.get(
    "/loja/logo",
    auth.auth,
    wrap(async (req, res) => {
      const emp = await ERP.Empresa.findByPk(req.tutor.empresaId, {
        logging: false,
      });
      return binario(res, await logoApp.ler(emp));
    }),
  );
  tutor.get(
    "/loja/:slug/logo",
    limite,
    wrap(async (req, res) => {
      const { empresa } = await estabelecimento(req.params.slug);
      return binario(res, await logoApp.ler(empresa));
    }),
  );
  tutor.get(
    "/loja/:slug/visual/:area",
    limite,
    wrap(async (req, res) => {
      const { empresa } = await estabelecimento(req.params.slug);
      return binario(
        res,
        await p.aparencia.arquivo(empresa.id, req.params.area),
      );
    }),
  );
  tutor.get(
    "/loja/:slug",
    limite,
    wrap(async (req) => {
      const { config, empresa } = await estabelecimento(req.params.slug);
      return {
        nome: nomeEmpresa(empresa),
        telefone: empresa.telefone || null,
        slug: config.slug,
        ...logoEmpresa.dto(empresa, { slug: config.slug }),
        aparencia: require("../services/clientePortal/aparencia").ler(config),
      };
    }),
  );
  tutor.post(
    "/login",
    limite,
    wrap((req, res) => auth.login(req.body, res)),
  );
  tutor.post(
    "/convite",
    limite,
    wrap((req) => auth.aceitarConvite(req.body)),
  );
  tutor.post(
    "/recuperar",
    limite,
    wrap((req) => auth.recuperar(req.body)),
  );
  tutor.post(
    "/logout",
    wrap((req, res) => auth.logout(req, res)),
  );
  tutor.use(auth.auth);
  tutor.get(
    "/sessao",
    wrap(async (req) => ({
      csrf: auth.csrf(req.tutor.sessao.id),
      perfil: c.perfil(req.tutor),
      loja: await (async () => {
        const e = await ERP.Empresa.findByPk(req.tutor.empresaId, {
          logging: false,
        });
        return {
          nome: nomeEmpresa(e),
          aparencia: require("../services/clientePortal/aparencia").ler(
            req.tutor.config,
          ),
          telefone: e.telefone || null,
          ...logoEmpresa.dto(e, { slug: req.tutor.config.slug }),
          endereco:
            typeof e.endereco === "string"
              ? (() => {
                  try {
                    const d = JSON.parse(e.endereco);
                    return [
                      d.logradouro || d.rua || d.endereco,
                      d.numero,
                      d.bairro,
                      d.cidade,
                      d.uf,
                    ]
                      .filter(Boolean)
                      .join(", ");
                  } catch {
                    return e.endereco;
                  }
                })()
              : [
                  e.endereco?.logradouro ||
                    e.endereco?.rua ||
                    e.endereco?.endereco,
                  e.endereco?.numero,
                  e.endereco?.bairro,
                  e.endereco?.cidade,
                  e.endereco?.uf,
                ]
                  .filter(Boolean)
                  .join(", "),
          expediente: (() => {
            const r = V.json(req.tutor.config.regras);
            return r.inicio && r.fim
              ? "Funcionamento: " +
                  r.inicio +
                  " às " +
                  r.fim +
                  " · " +
                  (r.dias || [])
                    .map(
                      (d) =>
                        ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d],
                    )
                    .join(", ")
              : null;
          })(),
          slug: req.tutor.config.slug,
          receberPedidos: req.tutor.config.receber_pedidos,
          push: req.tutor.config.push_tutor,
        };
      })(),
    })),
  );
  tutor.get(
    "/pets",
    wrap((req) => c.pets(req.tutor)),
  );
  tutor.post(
    "/pets",
    wrap((req) => c.salvarPet(req.tutor, null, req.body)),
  );
  tutor.put(
    "/pets/:id",
    wrap((req) => c.salvarPet(req.tutor, req.params.id, req.body)),
  );
  tutor.get(
    "/perfil",
    wrap((req) => c.perfil(req.tutor)),
  );
  tutor.put(
    "/perfil",
    wrap((req) => c.salvarPerfil(req.tutor, req.body)),
  );
  tutor.get(
    "/agendamentos",
    wrap((req) => c.agendamentos(req.tutor)),
  );
  tutor.get(
    "/servicos",
    wrap(async (req) => {
      const cfg = req.tutor.config,
        result = [];
      for (const s of V.json(cfg.regras).servicos || [])
        try {
          const a = await p.agenda.servico(cfg, s.id);
          result.push({
            id: a.id,
            nome: a.nome,
            duracao: a.duracao,
            preco: a.preco,
          });
        } catch (e) {
          if (e.status !== 409) throw e;
        }
      return result;
    }),
  );
  tutor.get(
    "/horarios",
    wrap(async (req) => {
      await c.pet(req.tutor, req.query.petId);
      return p.agenda.horarios(
        req.tutor.config,
        V.inteiro(req.query.petId),
        V.texto(req.query.servicoId, 64, true),
        V.data(req.query.data),
      );
    }),
  );
  tutor.get(
    "/solicitacoes",
    wrap(async (req) =>
      (
        await m.Solic.findAll({
          where: {
            empresa_id: req.tutor.empresaId,
            conta_id: req.tutor.contaId,
          },
          order: [["createdAt", "DESC"]],
          limit: 200,
          logging: false,
        })
      ).map(pedidos.dto),
    ),
  );
  tutor.post(
    "/solicitacoes",
    wrap((req) => pedidos.criar(req.tutor, req.body)),
  );
  tutor.post(
    "/solicitacoes/:id/acao",
    wrap((req) =>
      pedidos.agir({ ...req.tutor, tutor: true }, req.params.id, req.body),
    ),
  );
  tutor.get(
    "/pets/:id/fotos",
    wrap((req) => c.galeria(req.tutor, req.params.id)),
  );
  tutor.post(
    "/pets/:id/fotos",
    arquivo(async (req, res) =>
      res.json(
        await c.adicionarFoto(req.tutor, req.params.id, req.file.buffer),
      ),
    ),
  );
  tutor.get(
    "/pets/:id/foto",
    wrap(async (req, res) =>
      binario(res, await c.foto(req.tutor, req.params.id)),
    ),
  );
  tutor.get(
    "/pets/:id/fotos/:fid/arquivo",
    wrap(async (req, res) =>
      binario(res, await c.foto(req.tutor, req.params.id, req.params.fid)),
    ),
  );
  tutor.post(
    "/pets/:id/fotos/:fid/acao",
    wrap((req) =>
      c.alterarFoto(req.tutor, req.params.id, req.params.fid, req.body.acao),
    ),
  );
  tutor.get(
    "/pets/:id/vacinas",
    wrap((req) => c.vacinas(req.tutor, req.params.id)),
  );
  tutor.post(
    "/pets/:id/vacinas",
    wrap((req) => c.salvarVacina(req.tutor, req.params.id, req.body)),
  );
  tutor.post(
    "/pets/:id/vacinas/:vid/comprovante",
    arquivo(async (req, res) =>
      res.json(
        await c.comprovante(
          req.tutor,
          req.params.id,
          req.params.vid,
          req.file.buffer,
        ),
      ),
    ),
  );
  tutor.get(
    "/pets/:id/vacinas/:vid/comprovante",
    wrap(async (req, res) =>
      binario(
        res,
        await c.comprovante(req.tutor, req.params.id, req.params.vid),
      ),
    ),
  );
  tutor.get(
    "/notificacoes",
    wrap(async (req) => {
      const where = {
        conta_id: req.tutor.contaId,
        empresa_id: req.tutor.empresaId,
      };
      const [rows, naoLidas] = await Promise.all([
        m.Notificacao.findAll({
          where,
          order: [["id", "DESC"]],
          limit: 100,
          logging: false,
        }),
        m.Notificacao.count({
          where: { ...where, lida_em: null },
          logging: false,
        }),
      ]);
      return {
        naoLidas,
        itens: rows.map((r) => ({
          id: r.id,
          titulo: r.titulo,
          texto: r.texto,
          tipo: r.tipo,
          alvo: V.json(r.alvo),
          lida: !!r.lida_em,
          criadoEm: r.createdAt,
        })),
      };
    }),
  );
  tutor.post(
    "/notificacoes/:id/ler",
    wrap(async (req) => {
      const [n] = await m.Notificacao.update(
        { lida_em: new Date() },
        {
          where: {
            id: V.inteiro(req.params.id),
            conta_id: req.tutor.contaId,
            empresa_id: req.tutor.empresaId,
          },
          logging: false,
        },
      );
      if (!n) throw V.falha("Aviso não encontrado.", 404);
      return { ok: true };
    }),
  );
  tutor.post(
    "/notificacoes/ler",
    wrap(async (req) => {
      await m.Notificacao.update(
        { lida_em: new Date() },
        {
          where: { conta_id: req.tutor.contaId, lida_em: null },
          logging: false,
        },
      );
      return { ok: true };
    }),
  );
  tutor.get(
    "/eventos",
    wrap((req, res) => {
      n.stream(
        req,
        res,
        () => n.resumoTutor(req.tutor),
        "t:" + req.tutor.contaId,
      );
    }),
  );
  tutor.get(
    "/push/chave",
    wrap((req) => {
      if (!req.tutor.config.push_tutor)
        throw V.falha("Push desativado pelo estabelecimento.", 503);
      const key =
        require("../services/pushNotificationService").getVapidPublicKey();
      if (!key)
        throw V.falha(
          "Push indisponível. Consulte os avisos no aplicativo.",
          503,
        );
      return { publicKey: key };
    }),
  );
  tutor.post(
    "/push",
    wrap((req) => n.subscribe(req.tutor, req.body)),
  );
  tutor.delete(
    "/push",
    wrap(async (req) => {
      await m.Push.update(
        { ativo: false },
        {
          where: {
            sessao_id: req.tutor.sessao.id,
            conta_id: req.tutor.contaId,
          },
          logging: false,
        },
      );
      return { ok: true };
    }),
  );
  // Toda autorização ERP usa os middlewares já adotados no produto.
  gestor.use(authERP, ajax, (req, res, next) => {
    if (!req.user?.empresaId) return res.sendStatus(403);
    next();
  });
  const acesso = permissao("cliente.meus-clientes", "cliente.editar"),
    agenda = permissao("atendimento.agenda"),
    configurar = permissao("configuracoes.empresa");
  const somLeitura = permissao("atendimento.agenda", "configuracoes.empresa");
  gestor.get(
    "/alertas",
    agenda,
    wrap((req) => p.alertas.snapshot(req.user.empresaId, req.user.id)),
  );
  gestor.put(
    "/alertas/:id/silencio",
    agenda,
    wrap((req) =>
      p.alertas.silenciar(
        req.user.empresaId,
        req.user.id,
        req.params.id,
        req.body,
      ),
    ),
  );
  gestor.get(
    "/som",
    somLeitura,
    wrap((req) => p.alertas.obterSom(req.user.empresaId)),
  );
  gestor.put(
    "/som",
    configurar,
    wrap((req) =>
      p.alertas.alterarSom(req.user.empresaId, req.user.id, req.body),
    ),
  );
  gestor.get(
    "/som/arquivo",
    somLeitura,
    wrap(async (req, res) =>
      binario(res, await p.alertas.arquivo(req.user.empresaId)),
    ),
  );
  const mp3Upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 1, fieldSize: 32 },
  }).single("arquivo");
  gestor.post("/som/mp3", configurar, (req, res) =>
    mp3Upload(req, res, async (e) => {
      if (e)
        return res
          .status(e.code === "LIMIT_FILE_SIZE" ? 413 : 400)
          .json({ erro: "Selecione somente um MP3 de até 2 MB." });
      try {
        V.chaves(req.body, ["versao"]);
        res.json(
          await p.alertas.upload(
            req.user.empresaId,
            req.user.id,
            req.file,
            req.body.versao,
          ),
        );
      } catch (err) {
        res
          .status(err.status || 503)
          .json({
            erro: err.status
              ? err.message
              : "Não foi possível salvar o MP3. Confira o armazenamento permanente.",
          });
      }
    }),
  );
  gestor.get(
    "/aparencia/visual/:area",
    configurar,
    wrap(async (req, res) =>
      binario(
        res,
        await p.aparencia.arquivo(req.user.empresaId, req.params.area),
      ),
    ),
  );
  const bannerUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 32 },
  }).single("arquivo");
  gestor.post("/aparencia/visual/:area", configurar, (req, res) =>
    bannerUpload(req, res, async (e) => {
      if (e)
        return res
          .status(e.code === "LIMIT_FILE_SIZE" ? 413 : 400)
          .json({ erro: "Envie somente uma imagem de até 5 MB." });
      try {
        V.chaves(req.body, ["versao"]);
        res.json(
          await p.aparencia.upload(
            req.user.empresaId,
            req.user.id,
            req.params.area,
            req.file,
            req.body.versao,
          ),
        );
      } catch (err) {
        res
          .status(err.status || 503)
          .json({
            erro: err.status
              ? err.message
              : "Não foi possível salvar a imagem. Confira o armazenamento permanente.",
          });
      }
    }),
  );
  gestor.get(
    "/aparencia",
    configurar,
    wrap((req) => p.aparencia.obter(req.user.empresaId)),
  );
  gestor.put(
    "/aparencia",
    configurar,
    wrap((req) =>
      p.aparencia.salvar(req.user.empresaId, req.user.id, req.body),
    ),
  );
  gestor.get(
    "/config",
    configurar,
    wrap(async (req) => {
      const cfg = await p.config(req.user.empresaId);
      const [servicos, profissionais] = await Promise.all([
        ERP.Produto.findAll({
          where: { empresa_id: req.user.empresaId },
          attributes: ["id", "nome", "tipo", "preco"],
          logging: false,
        }),
        ERP.Profissional.findAll({
          where: { empresa_id: req.user.empresaId, status: "ativo" },
          attributes: ["id", "nome"],
          logging: false,
        }),
      ]);
      return {
        config: cfg,
        servicos: servicos
          .filter((s) => /^servi[cç]o$/i.test(s.tipo || ""))
          .map((s) => ({ id: s.id, nome: s.nome, preco: s.preco })),
        profissionais,
      };
    }),
  );
  gestor.put(
    "/config",
    configurar,
    wrap((req) => p.salvarConfig(req.user.empresaId, req.body, req.user.id)),
  );
  gestor.get(
    "/clientes/:id",
    acesso,
    wrap(async (req) => {
      const id = V.inteiro(req.params.id),
        cli = await ERP.Cliente.findOne({
          where: { id, empresa_id: req.user.empresaId },
          logging: false,
        });
      if (!cli) throw V.falha("Cliente não encontrado.", 404);
      const conta = await m.Conta.findOne({
        where: { empresa_id: req.user.empresaId, cliente_id: id },
        logging: false,
      });
      return {
        clienteId: id,
        emailCliente: cli.email || "",
        conta: conta
          ? {
              email: conta.email,
              ativo: conta.ativo,
              senhaDefinida: !!conta.senha_hash,
              ultimoAcesso: conta.ultimo_acesso,
            }
          : null,
        portalAtivo: (await p.config(req.user.empresaId)).ativo,
      };
    }),
  );
  gestor.post(
    "/clientes/:id/convite",
    acesso,
    wrap((req) =>
      auth.convite(
        req.user.empresaId,
        V.inteiro(req.params.id),
        req.body.email,
        req.user.id,
      ),
    ),
  );
  gestor.post(
    "/clientes/:id/bloquear",
    acesso,
    wrap((req) =>
      auth.bloquear(req.user.empresaId, V.inteiro(req.params.id), req.user.id),
    ),
  );
  gestor.get(
    "/profissionais",
    agenda,
    wrap(async (req) => ({
      profissionais: await ERP.Profissional.findAll({
        where: { empresa_id: req.user.empresaId, status: "ativo" },
        attributes: ["id", "nome"],
        logging: false,
      }),
    })),
  );
  gestor.get(
    "/resumo",
    agenda,
    wrap((req) => n.resumoGestor(req.user.empresaId)),
  );
  gestor.get(
    "/eventos",
    agenda,
    wrap((req, res) => {
      n.stream(
        req,
        res,
        () => n.resumoGestor(req.user.empresaId),
        "g:" + req.user.empresaId,
      );
    }),
  );
  gestor.get(
    "/avisos",
    agenda,
    wrap((req) =>
      m.Evento.findAll({
        where: { empresa_id: req.user.empresaId },
        attributes: ["id", "tipo", "texto", "alvo", "createdAt"],
        order: [["id", "DESC"]],
        limit: 40,
        logging: false,
      }),
    ),
  );
  async function pedidoGestor(s, empresaId) {
    const [pet, cli] = await Promise.all([
      ERP.Pet.findByPk(s.pet_id, { attributes: ["nome"], logging: false }),
      ERP.Cliente.findOne({
        where: { id: s.cliente_id, empresa_id: empresaId },
        attributes: ["nome", "telefone"],
        logging: false,
      }),
    ]);
    return {
      ...pedidos.dto(s),
      pet: pet?.nome || "Pet",
      cliente: cli?.nome || "Cliente",
      clienteId: s.cliente_id,
      telefone: cli?.telefone || null,
      foto: "/api/cliente-portal/pets/" + s.pet_id + "/foto",
    };
  }
  gestor.get(
    "/solicitacoes/:id",
    agenda,
    wrap(async (req) => {
      const s = await m.Solic.findOne({
        where: { id: V.uuid(req.params.id), empresa_id: req.user.empresaId },
        logging: false,
      });
      if (!s) throw V.falha("Solicitação não encontrada.", 404);
      return pedidoGestor(s, req.user.empresaId);
    }),
  );
  gestor.get(
    "/solicitacoes",
    agenda,
    wrap(async (req) => {
      const where = { empresa_id: req.user.empresaId };
      if (req.query.estado === "abertas")
        where.estado = {
          [Op.in]: ["PENDENTE", "PROPOSTA", "PROPOSTA_RECUSADA"],
        };
      const rows = await m.Solic.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: 200,
        logging: false,
      });
      return Promise.all(rows.map((s) => pedidoGestor(s, req.user.empresaId)));
    }),
  );
  gestor.put(
    "/agendamentos/:id/comunicado",
    agenda,
    wrap(async (req) => {
      const ag = await ERP.Agendamento.findOne({
        where: { id: V.inteiro(req.params.id), empresa_id: req.user.empresaId },
        logging: false,
      });
      if (!ag) throw V.falha("Atendimento não encontrado.", 404);
      const texto = V.texto(req.body.texto, 1000, true);
      await m.Comunicado.upsert(
        {
          agendamento_id: ag.id,
          empresa_id: req.user.empresaId,
          texto,
          autor_id: req.user.id,
        },
        { logging: false },
      );
      const pet = await ERP.Pet.findByPk(ag.petId, { logging: false }),
        conta =
          pet &&
          (await m.Conta.findOne({
            where: {
              cliente_id: pet.cliente_id,
              empresa_id: req.user.empresaId,
              ativo: true,
            },
            logging: false,
          }));
      if (conta)
        await p.eventos.tutor(
          conta,
          "atendimento",
          "Mensagem do estabelecimento",
          "Há uma nova mensagem no histórico do atendimento.",
          { agendamentoId: ag.id },
          "comunicado:" + ag.id + ":" + V.hash(texto),
        );
      await p.eventos.auditar(
        req.user.empresaId,
        { tipo: "gestor", id: req.user.id },
        "comunicado",
        ag.id,
        ["texto"],
      );
      return { ok: true };
    }),
  );
  gestor.post(
    "/solicitacoes/:id/acao",
    agenda,
    wrap((req) =>
      pedidos.agir(
        { empresaId: req.user.empresaId, autorId: req.user.id },
        req.params.id,
        req.body,
      ),
    ),
  );
  async function contextoPet(req) {
    const pet = await ERP.Pet.findByPk(V.inteiro(req.params.id), {
        logging: false,
      }),
      cli =
        pet &&
        (await ERP.Cliente.findOne({
          where: { id: pet.cliente_id, empresa_id: req.user.empresaId },
          logging: false,
        }));
    if (
      !cli ||
      (pet.empresa_id && Number(pet.empresa_id) !== Number(req.user.empresaId))
    )
      throw V.falha("Pet não encontrado.", 404);
    return { empresaId: req.user.empresaId, clienteId: cli.id, contaId: null };
  }
  gestor.get(
    "/pets/:id/foto",
    agenda,
    wrap(async (req, res) =>
      binario(res, await c.foto(await contextoPet(req), req.params.id)),
    ),
  );
  gestor.get(
    "/pets/:id/detalhes",
    acesso,
    wrap(async (req) => {
      const t = await contextoPet(req),
        id = V.inteiro(req.params.id);
      const fotos = await m.Foto.findAll({
        where: { empresa_id: t.empresaId, pet_id: id, removida_em: null },
        order: [["createdAt", "DESC"]],
        limit: 100,
        logging: false,
      });
      return {
        pet: await c.dto(t, await c.pet(t, id)),
        fotos: fotos.map((f) => ({
          id: f.id,
          origem: f.origem,
          visivel: f.visivel,
        })),
        vacinas: await c.vacinas(t, id),
      };
    }),
  );
  gestor.post(
    "/pets/:id/fotos",
    acesso,
    arquivo(async (req, res) =>
      res.json(
        await c.adicionarFoto(
          await contextoPet(req),
          req.params.id,
          req.file.buffer,
          "estabelecimento",
        ),
      ),
    ),
  );
  gestor.post(
    "/pets/:id/fotos/:fid/visibilidade",
    acesso,
    wrap(async (req) => {
      const t = await contextoPet(req);
      if (typeof req.body.visivel !== "boolean")
        throw V.falha("Visibilidade inválida.");
      return require("../services/clientePortal/agenda").serializar(
        ERP,
        t.empresaId,
        async (transaction) => {
          const o = { transaction, logging: false },
            f = await m.Foto.findOne({
              where: {
                id: V.uuid(req.params.fid),
                pet_id: req.params.id,
                empresa_id: t.empresaId,
                removida_em: null,
              },
              ...o,
              lock: transaction.LOCK.UPDATE,
            });
          if (!f) throw V.falha("Foto não encontrada.", 404);
          await f.update({ visivel: req.body.visivel }, o);
          if (!req.body.visivel)
            await ERP.Pet.update(
              { foto_url: null },
              { where: { id: req.params.id, foto_url: f.referencia }, ...o },
            );
          await p.eventos.auditar(
            t.empresaId,
            { tipo: "gestor", id: req.user.id },
            "visibilidade_foto",
            f.id,
            ["visivel"],
            transaction,
          );
          return { ok: true };
        },
      );
    }),
  );
  gestor.get(
    "/pets/:id/fotos/:fid/arquivo",
    acesso,
    wrap(async (req, res) => {
      const t = await contextoPet(req),
        f = await m.Foto.findOne({
          where: {
            id: V.uuid(req.params.fid),
            pet_id: req.params.id,
            empresa_id: t.empresaId,
            removida_em: null,
          },
          logging: false,
        });
      if (!f) throw V.falha("Foto não encontrada.", 404);
      return binario(res, await p.midias().ler(t.empresaId, f.referencia));
    }),
  );
  gestor.get(
    "/pets/:id/vacinas/:vid/comprovante",
    acesso,
    wrap(async (req, res) =>
      binario(
        res,
        await c.comprovante(
          await contextoPet(req),
          req.params.id,
          req.params.vid,
        ),
      ),
    ),
  );
  gestor.post(
    "/pets/:id/vacinas/:vid/conferir",
    acesso,
    wrap(async (req) => {
      await contextoPet(req);
      const [n] = await m.Vacina.update(
        {
          conferida_por: req.user.id,
          conferida_em: new Date(),
          origem: "tutor_conferida",
          versao: V.versao(req.body.versao) + 1,
        },
        {
          where: {
            id: V.uuid(req.params.vid),
            pet_id: req.params.id,
            empresa_id: req.user.empresaId,
            removida_em: null,
            conferida_em: null,
            versao: V.versao(req.body.versao),
          },
          logging: false,
        },
      );
      if (!n) throw V.falha("Registro não encontrado ou atualizado.", 409);
      await p.eventos.auditar(
        req.user.empresaId,
        { tipo: "gestor", id: req.user.id },
        "vacina_conferida",
        req.params.vid,
        [],
      );
      return { ok: true };
    }),
  );
  return { tutor, gestor };
}
module.exports = { criarRotas };
