"use strict";
const express = require("express"),
  cookies = require("cookie-parser"),
  multer = require("multer"),
  crypto = require("node:crypto"),
  { Op } = require("sequelize");
const { hash } = require("./service");
function routes(s, { env = process.env, adminAuth } = {}) {
  const r = express.Router(),
    a = express.Router(),
    events = require("./events")(s),
    { m, fail, text, key, uuid } = s;
  const wrap = (fn) => async (req, res, next) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined && !res.headersSent) res.json(result);
    } catch (e) {
      next(e);
    }
  };
  const prod = env.NODE_ENV === "production",
    sameSite = env.COMMUNITY_COOKIE_SAMESITE || "lax",
    cookie = {
      httpOnly: true,
      secure: prod,
      sameSite,
      path: "/api/comunidade",
      maxAge: 30 * 86400000,
    };
  const origins = new Set(
    (env.COMMUNITY_ORIGINS || "https://comunidade.pethubflow.com.br")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const guard = (req, res, next) => {
    const origin = req.get("Origin");
    // Render terminates TLS before Express: req.protocol may be http even
    // when this same site's browser origin is https. Match the real Host,
    // without trusting arbitrary X-Forwarded-Host/Proto headers or suffixes.
    const host = req.get("host");
    const sameOrigin =
      origin === "https://" + host ||
      (!prod && origin === req.protocol + "://" + host);
    if (origin && !origins.has(origin) && !sameOrigin)
      return res.status(403).json({
        erro: "Origem não autorizada. Confira COMMUNITY_ORIGINS na API.",
        codigo: "COMMUNITY_ORIGIN_NOT_ALLOWED",
      });
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.vary("Origin");
    }
    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Community-CSRF, Authorization",
    );
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (env.COMMUNITY_ENABLED !== "true")
      return res.status(503).json({
        erro: "A Comunidade ainda não está habilitada. Configure COMMUNITY_ENABLED=true na API.",
        codigo: "COMMUNITY_DISABLED",
      });
    next();
  };
  for (const router of [r, a]) {
    router.use(guard, cookies(), express.json({ limit: "256kb" }));
    router.use(
      require("../middleware/rateLimit")({ windowMs: 60000, max: 120 }),
    );
  }
  const csrf = (req, c) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      const value = req.get("X-Community-CSRF") || "";
      if (
        Buffer.byteLength(value) !== Buffer.byteLength(c.csrf) ||
        !crypto.timingSafeEqual(Buffer.from(value), Buffer.from(c.csrf))
      )
        throw fail("Atualize o aplicativo para confirmar sua sessão.", 403);
    }
  };
  r.post(
    "/login",
    wrap(async (req, res) => {
      const v = await s.login(req.body);
      res.cookie("pethub_community", v.raw, cookie);
      return { ok: true };
    }),
  );
  r.use(async (req, res, next) => {
    try {
      req.community = await s.context(req.cookies.pethub_community);
      csrf(req, req.community);
      next();
    } catch (e) {
      next(e);
    }
  });
  r.get(
    "/session",
    wrap((req) => s.self(req.community)),
  );
  r.post(
    "/logout",
    wrap(async (req, res) => {
      await m.Session.destroy({ where: { id: req.community.session.id } });
      res.clearCookie("pethub_community", { ...cookie, maxAge: undefined });
      return { ok: true };
    }),
  );
  r.post(
    "/accounts/link",
    wrap((req) => s.linkAccount(req.community, req.body)),
  );
  r.post(
    "/profiles",
    wrap((req) => s.saveProfile(req.community, req.body)),
  );
  r.put(
    "/profiles/:id",
    wrap((req) => s.saveProfile(req.community, req.body, req.params.id)),
  );
  r.get(
    "/profiles/:id",
    wrap((req) => s.profile(req.community, req.params.id)),
  );
  r.put(
    "/profiles/:id/follow",
    wrap((req) =>
      s.follow(req.community, req.params.id, req.body.profile_id, true),
    ),
  );
  r.delete(
    "/profiles/:id/follow",
    wrap((req) =>
      s.follow(req.community, req.params.id, req.body.profile_id, false),
    ),
  );
  r.put(
    "/profiles/:id/block",
    wrap((req) => s.block(req.community, req.params.id, true)),
  );
  r.delete(
    "/profiles/:id/block",
    wrap((req) => s.block(req.community, req.params.id, false)),
  );
  r.get(
    "/feed",
    wrap((req) => s.feed(req.community, req.query)),
  );
  r.get(
    "/posts/:id",
    wrap(async (req) => ({
      item: (
        await s.postsDTO(req.community, [
          await s.visiblePost(req.community, req.params.id),
        ])
      )[0],
    })),
  );
  r.post(
    "/posts",
    wrap((req) => s.publish(req.community, req.body)),
  );
  r.delete(
    "/posts/:id",
    wrap((req) => s.remove(req.community, "post", req.params.id)),
  );
  for (const [path, type] of [
    ["like", "like"],
    ["save", "save"],
  ]) {
    r.put(
      "/posts/:id/" + path,
      wrap((req) =>
        s.reaction(
          req.community,
          req.params.id,
          type,
          true,
          req.body.profile_id,
        ),
      ),
    );
    r.delete(
      "/posts/:id/" + path,
      wrap((req) =>
        s.reaction(
          req.community,
          req.params.id,
          type,
          false,
          req.body.profile_id,
        ),
      ),
    );
  }
  r.get(
    "/posts/:id/comments",
    wrap((req) => s.comments(req.community, req.params.id, req.query)),
  );
  r.post(
    "/posts/:id/comments",
    wrap((req) => s.comment(req.community, req.params.id, req.body)),
  );
  r.delete(
    "/comments/:id",
    wrap((req) => s.remove(req.community, "comment", req.params.id)),
  );
  r.put(
    "/posts/:id/view",
    wrap(async (req) => {
      const post = await s.visiblePost(req.community, req.params.id);
      await m.View.findOrCreate({
        where: { post_id: post.id, user_id: req.community.user.id },
        defaults: { id: uuid() },
      });
      return { ok: true };
    }),
  );
  r.get(
    "/explore",
    wrap((req) => s.explore(req.community, req.query)),
  );
  r.get(
    "/blocks",
    wrap(async (req) => {
      const rows = await m.Block.findAll({
          where: { from_user: req.community.user.id },
        }),
        profiles = await m.Profile.findAll({
          where: {
            user_id: { [Op.in]: rows.map((r) => r.to_user) },
            state: "active",
            kind: "tutor",
          },
        });
      return { items: profiles.map(s.profileDTO) };
    }),
  );
  r.get(
    "/notifications",
    wrap(async (req) => {
      const c = req.community,
        scope = await s.scope(c),
        hidden = await m.Profile.findAll({
          where: {
            [Op.or]: [
              { state: { [Op.ne]: "active" } },
              { user_id: { [Op.in]: scope.b } },
            ],
          },
          attributes: ["id"],
        }),
        where = {
          user_id: c.user.id,
          actor_id: { [Op.notIn]: hidden.map((p) => p.id) },
        },
        p = await s.page(m.Notification, where, req.query),
        actors = await m.Profile.findAll({
          where: { id: { [Op.in]: p.rows.map((x) => x.actor_id) } },
        });
      return {
        items: p.rows.map((x) => ({
          id: x.id,
          kind: x.kind,
          targetId: x.target_id,
          read: x.read,
          createdAt: x.createdAt,
          actor: actors.find((p) => p.id === x.actor_id)
            ? s.profileDTO(actors.find((p) => p.id === x.actor_id))
            : null,
        })),
        next: p.next,
        unread: await m.Notification.count({
          where: { ...where, read: false },
        }),
      };
    }),
  );
  r.put(
    "/notifications/read",
    wrap(async (req) => {
      await m.Notification.update(
        { read: true },
        { where: { user_id: req.community.user.id, read: false } },
      );
      return { ok: true };
    }),
  );
  r.post(
    "/reports",
    wrap((req) => s.report(req.community, req.body)),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
  }).single("file");
  let activeUploads = 0;
  r.post(
    "/media",
    (req, res, next) => {
      if (activeUploads >= 2)
        return next(
          fail("Há fotos em processamento. Aguarde um instante.", 429),
        );
      activeUploads++;
      let done = false;
      const release = () => {
        if (!done) {
          done = true;
          activeUploads--;
        }
      };
      res.once("finish", release);
      res.once("close", release);
      next();
    },
    (req, res, next) =>
      upload(req, res, (e) =>
        e ? next(fail("Envie uma foto de até 8 MB.")) : next(),
      ),
    wrap((req) => s.upload(req.community, req.file)),
  );
  r.get(
    "/media/:id",
    wrap(async (req, res) => {
      const file = await s.readMedia(req.community, req.params.id);
      res
        .type(file.tipo)
        .set("Cache-Control", "private, no-store")
        .send(file.bytes);
    }),
  );
  r.get(
    "/events",
    wrap((req) => events.list(req.community, req.query)),
  );
  r.post(
    "/events",
    wrap((req) => events.save(req.community, req.body)),
  );
  r.put(
    "/events/:id",
    wrap((req) => events.save(req.community, req.body, req.params.id)),
  );
  r.delete(
    "/events/:id",
    wrap((req) => events.cancel(req.community, req.params.id)),
  );
  r.put(
    "/events/:id/rsvp",
    wrap((req) => events.rsvp(req.community, req.params.id, true)),
  );
  r.delete(
    "/events/:id/rsvp",
    wrap((req) => events.rsvp(req.community, req.params.id, false)),
  );
  r.get(
    "/privacy/export",
    wrap(async (req) => {
      const id = req.community.user.id;
      return {
        profiles: req.community.profiles.map(s.profileDTO),
        posts: await m.Post.findAll({
          where: { user_id: id },
          attributes: ["id", "text", "visibility", "kind", "createdAt"],
        }),
        comments: await m.Comment.findAll({
          where: { user_id: id },
          attributes: ["id", "post_id", "text", "createdAt"],
        }),
      };
    }),
  );
  r.post(
    "/privacy/delete",
    wrap(async (req) => {
      const id = req.community.user.id;
      await s.db.transaction(async (transaction) => {
        await m.User.update(
          { state: "deleted" },
          { where: { id }, transaction },
        );
        await m.Profile.update(
          {
            name: "Conta removida",
            bio: "",
            city: "",
            interests: "",
            avatar_id: null,
            cover_id: null,
            state: "removed",
          },
          { where: { user_id: id }, transaction },
        );
        await m.Post.update(
          { state: "removed" },
          { where: { user_id: id }, transaction },
        );
        await m.Comment.update(
          { state: "removed" },
          { where: { user_id: id }, transaction },
        );
        await m.Session.destroy({ where: { user_id: id }, transaction });
        await m.Privacy.create(
          { id: uuid(), user_id: id, kind: "erasure" },
          { transaction },
        );
        await s.audit(id, "request_erasure", id, {}, transaction);
      });
      return {
        ok: true,
        message:
          "Acesso encerrado e conteúdo oculto. Solicitação de exclusão registrada.",
      };
    }),
  );
  // This is platform administration, never an ERP shop manager permission.
  a.use((req, res, next) => {
    if (!env.JWT_SECRET)
      return res
        .status(503)
        .json({ erro: "Autenticação administrativa indisponível." });
    adminAuth(req, res, next);
  });
  a.use((req, res, next) => {
    const allowed = (env.COMMUNITY_PLATFORM_ADMIN_IDS || "")
      .split(",")
      .map((v) => v.trim());
    if (!req.adminId || !allowed.includes(String(req.adminId)))
      return res
        .status(403)
        .json({ erro: "Administrador da plataforma não autorizado." });
    next();
  });
  a.get(
    "/companies",
    wrap(async () => {
      const companies = await s.ERP.Empresa.findAll({
          attributes: ["id", "nome"],
          limit: 200,
        }),
        grants = await m.Company.findAll();
      return companies.map((c) => ({
        id: c.id,
        name: c.nome,
        enabled: !!grants.find((g) => String(g.empresa_id) === String(c.id))
          ?.enabled,
      }));
    }),
  );
  a.put(
    "/companies/:id",
    wrap(async (req) => {
      const id = Number(req.params.id);
      if (
        !Number.isSafeInteger(id) ||
        !(await s.ERP.Empresa.findByPk(id)) ||
        typeof req.body.enabled !== "boolean"
      )
        throw fail("Empresa inválida.");
      await s.db.transaction(async (transaction) => {
        await m.Company.upsert(
          { empresa_id: id, enabled: req.body.enabled },
          { transaction },
        );
        await s.audit(
          req.adminId,
          "company_access",
          id,
          { enabled: req.body.enabled },
          transaction,
        );
      });
      return { ok: true };
    }),
  );
  a.get(
    "/accounts/:company",
    wrap(async (req) => {
      const rows = await s.portal().auth.m.Conta.findAll({
          where: { empresa_id: Number(req.params.company) },
          attributes: ["id", "cliente_id", "email", "ativo"],
          limit: 200,
        }),
        grants = await m.Link.findAll({
          where: { empresa_id: Number(req.params.company) },
        });
      return rows.map((c) => ({
        id: c.id,
        email: c.email,
        clientId: c.cliente_id,
        enabled: !!grants.find((g) => g.conta_id === c.id)?.enabled,
      }));
    }),
  );
  a.put(
    "/accounts/:id",
    wrap(async (req) => {
      const p = s.portal(),
        account = await p.auth.m.Conta.findByPk(key(req.params.id));
      if (!account || typeof req.body.enabled !== "boolean")
        throw fail("Conta inválida.");
      const [row] = await m.Link.findOrCreate({
        where: { conta_id: account.id },
        defaults: { empresa_id: account.empresa_id, enabled: false },
      });
      await s.db.transaction(async (transaction) => {
        await row.update({ enabled: req.body.enabled }, { transaction });
        await s.audit(
          req.adminId,
          "account_access",
          row.conta_id,
          { enabled: req.body.enabled },
          transaction,
        );
      });
      return { ok: true };
    }),
  );
  a.get(
    "/users",
    wrap(async () => {
      const users = await m.User.findAll({
          limit: 100,
          order: [["createdAt", "DESC"]],
        }),
        profiles = await m.Profile.findAll({ where: { kind: "tutor" } });
      return users.map((u) => ({
        id: u.id,
        state: u.state,
        role: u.role,
        canEvents: u.can_events,
        name:
          profiles.find((p) => p.user_id === u.id)?.name ||
          "Onboarding pendente",
      }));
    }),
  );
  a.put(
    "/users/:id",
    wrap(async (req) => {
      const user = await m.User.findByPk(key(req.params.id));
      if (!user || user.state === "deleted")
        throw fail("Conta indisponível.", 404);
      const b = req.body;
      if (
        !["active", "suspended"].includes(b.state) ||
        !["member", "moderator"].includes(b.role) ||
        typeof b.canEvents !== "boolean"
      )
        throw fail("Estado inválido.");
      await s.db.transaction(async (transaction) => {
        await user.update(
          { state: b.state, role: b.role, can_events: b.canEvents },
          { transaction },
        );
        await s.audit(
          req.adminId,
          "user_access",
          user.id,
          { state: b.state, role: b.role, canEvents: b.canEvents },
          transaction,
        );
      });
      return { ok: true };
    }),
  );
  a.get(
    "/reports",
    wrap(async () =>
      m.Report.findAll({
        where: { state: "open" },
        limit: 100,
        order: [["createdAt", "ASC"]],
      }),
    ),
  );
  a.get(
    "/reports/:id/content",
    wrap(async (req) => {
      const report = await m.Report.findByPk(key(req.params.id));
      if (!report) throw fail("Denúncia indisponível.", 404);
      const model = {
          post: m.Post,
          comment: m.Comment,
          profile: m.Profile,
          event: m.Event,
        }[report.kind],
        row = await model.findByPk(report.target_id);
      if (!row) throw fail("Conteúdo indisponível.", 404);
      const item = {
        id: row.id,
        kind: report.kind,
        state: row.state,
        text: row.text || row.bio || row.description || "",
        name: row.name || row.title || "",
        createdAt: row.createdAt,
      };
      if (report.kind === "post")
        item.media = (
          await m.PostMedia.findAll({
            where: { post_id: row.id },
            order: [["position", "ASC"]],
          })
        ).map((r) => r.media_id);
      return item;
    }),
  );
  a.get(
    "/media/:id",
    wrap(async (req, res) => {
      const file = await s.adminMedia(req.params.id);
      res.type(file.tipo).send(file.bytes);
    }),
  );
  a.post(
    "/moderate",
    wrap(async (req) => {
      const map = {
          post: m.Post,
          comment: m.Comment,
          profile: m.Profile,
          event: m.Event,
        },
        model = map[req.body.kind];
      if (!model) throw fail("Tipo inválido.");
      const row = await model.findByPk(key(req.body.id));
      if (!row) throw fail("Conteúdo indisponível.", 404);
      const reason = text(req.body.reason, 1000, true);
      await s.db.transaction(async (transaction) => {
        await row.update({ state: "removed" }, { transaction });
        await m.Report.update(
          { state: "resolved" },
          { where: { target_id: row.id }, transaction },
        );
        await s.audit(
          req.adminId,
          "moderate_" + req.body.kind,
          row.id,
          { reason },
          transaction,
        );
      });
      return { ok: true };
    }),
  );
  a.get(
    "/audit",
    wrap(async () =>
      m.Audit.findAll({ order: [["createdAt", "DESC"]], limit: 100 }),
    ),
  );
  function errors(e, req, res, next) {
    if (res.headersSent) return next(e);
    if (e.name === "SequelizeUniqueConstraintError")
      return res.status(409).json({
        erro: "Esse identificador já está em uso. Atualize e tente novamente.",
      });
    const dbCode = e.original?.code || e.parent?.code;
    if (dbCode === "ER_NO_SUCH_TABLE" || e.original?.errno === 1146)
      return res.status(503).json({
        erro: "A estrutura do aplicativo ainda não foi preparada. Execute a migração da Comunidade e confirme a instalação do PetHub Cliente.",
        codigo: "COMMUNITY_MIGRATION_REQUIRED",
      });
    res.status(e.status || 503).json({
      erro: e.status
        ? e.message
        : "Não foi possível concluir agora. Tente novamente.",
    });
  }
  r.use(errors);
  a.use(errors);
  return { router: r, admin: a };
}
module.exports = { routes };
