"use strict";
const express = require("express"),
  cookies = require("cookie-parser"),
  multer = require("multer"),
  crypto = require("node:crypto"),
  { Op } = require("sequelize");
const { hash } = require("./service");
function routes(s, { env = process.env, adminAccounts } = {}) {
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
    if (
      env.COMMUNITY_ENABLED !== "true" &&
      !req.baseUrl.endsWith("/comunidade-admin")
    )
      return res.status(503).json({
        erro: "A Comunidade ainda não está habilitada. Configure COMMUNITY_ENABLED=true na API.",
        codigo: "COMMUNITY_DISABLED",
      });
    next();
  };
  for (const router of [r, a]) {
    router.use(guard, cookies(), express.json({ limit: "256kb" }));
    router.use(require("./limits").limiter(env));
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
  const adminCookie = {
    ...cookie,
    path: "/api/comunidade-admin",
    maxAge: 12 * 3600000,
  };
  const publicAuth = (name) =>
    wrap(async (req) => {
      await s.auth.limited(
        "public-ip-" + name,
        require("./limits").requestIP(req, env),
        name === "login" ? 40 : 12,
      );
      return s.auth[name](req.body || {});
    });
  r.get(
    "/public-config",
    wrap(() => s.settings()),
  );
  for (const name of ["register", "verify", "resend", "forgot", "reset"])
    r.post("/auth/" + name, publicAuth(name));
  r.get(
    "/auth/legacy",
    wrap((req) =>
      s.auth
        .legacy(req.cookies.pethub_community)
        .then((v) => ({ csrf: v.csrf })),
    ),
  );
  r.post(
    "/auth/upgrade",
    wrap(async (req) => {
      const legacy = await s.auth.legacy(req.cookies.pethub_community);
      csrf(req, legacy);
      return s.auth.upgrade(req.cookies.pethub_community, req.body);
    }),
  );
  r.post(
    "/login",
    wrap(async (req, res) => {
      await s.auth.limited(
        "login-ip",
        require("./limits").requestIP(req, env),
        40,
      );
      const v = await s.login(req.body || {});
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
  const groups = require("./groups")(s);
  r.post(
    "/onboarding/finish",
    wrap(async (req) => {
      await req.community.user.update({ onboarded_at: s.now() });
      return { ok: true };
    }),
  );
  r.get(
    "/groups",
    wrap((req) => groups.list(req.community, req.query)),
  );
  r.post(
    "/groups",
    wrap((req) => groups.create(req.community, req.body)),
  );
  r.put(
    "/groups/:id/membership",
    wrap((req) => groups.join(req.community, req.params.id, true)),
  );
  r.delete(
    "/groups/:id/membership",
    wrap((req) => groups.join(req.community, req.params.id, false)),
  );
  // Administration has its own opaque server session and explicit platform roles.
  const adminAuth = require("./admin-auth")(s, { env, adminAccounts }),
    admin = require("./admin")(s);
  a.post(
    "/login",
    wrap(async (req, res) => {
      const v = await adminAuth.login(
        req.body || {},
        require("./limits").requestIP(req, env),
      );
      res.cookie("pethub_community_admin", v.raw, adminCookie);
      return { ok: true, csrf: v.csrf, role: v.role };
    }),
  );
  a.use(async (req, res, next) => {
    try {
      req.communityAdmin = await adminAuth.context(
        req.cookies.pethub_community_admin,
      );
      csrf(req, req.communityAdmin);
      next();
    } catch (e) {
      next(e);
    }
  });
  const onlyAdmin = (req, res, next) =>
    req.communityAdmin.role === "admin"
      ? next()
      : res
          .status(403)
          .json({ erro: "Recurso exclusivo do administrador geral." });
  a.get(
    "/session",
    wrap((req) => ({
      id: req.communityAdmin.id,
      name: req.communityAdmin.name,
      role: req.communityAdmin.role,
      csrf: req.communityAdmin.csrf,
    })),
  );
  a.post(
    "/logout",
    wrap(async (req, res) => {
      await m.AdminSession.destroy({
        where: { id: req.communityAdmin.session.id },
      });
      res.clearCookie("pethub_community_admin", {
        ...adminCookie,
        maxAge: undefined,
      });
      return { ok: true };
    }),
  );
  a.get(
    "/overview",
    wrap(() => admin.totals()),
  );
  a.get(
    "/stats",
    onlyAdmin,
    wrap((req) => admin.stats(req.query)),
  );
  a.get(
    "/participants",
    onlyAdmin,
    wrap((req) => admin.participants(req.query)),
  );
  a.get(
    "/participants/:id",
    onlyAdmin,
    wrap((req) => admin.participant(req.params.id)),
  );
  a.post(
    "/participants/:id/action",
    onlyAdmin,
    wrap((req) => admin.sanction(req.communityAdmin, req.params.id, req.body)),
  );
  a.get(
    "/reports",
    wrap((req) => admin.reports(req.query)),
  );
  a.get(
    "/reports/:id",
    wrap((req) => admin.reportDetail(req.params.id)),
  );
  a.post(
    "/reports/:id/decision",
    wrap((req) => {
      const b = req.body;
      if (
        req.communityAdmin.role === "moderator" &&
        (["block"].includes(b.action) ||
          (b.action === "suspend" &&
            new Date(b.until) > +s.now() + 7 * 86400000))
      )
        throw fail("Ação exclusiva do administrador geral.", 403);
      return admin.decide(req.communityAdmin, req.params.id, b);
    }),
  );
  a.get(
    "/contents/post/:id/comments",
    wrap((req) => admin.comments(req.params.id, req.query)),
  );
  a.get(
    "/contents/:kind",
    wrap((req) => admin.contents(req.params.kind, req.query)),
  );
  a.post(
    "/moderate",
    wrap((req) => {
      if (
        req.communityAdmin.role === "moderator" &&
        req.body.state === "active"
      )
        throw fail("Restauração exclusiva do administrador geral.", 403);
      return admin.moderate(req.communityAdmin, req.body);
    }),
  );
  a.get(
    "/media/:id",
    wrap(async (req, res) => {
      const file = await s.adminMedia(req.params.id);
      res.type(file.tipo).send(file.bytes);
    }),
  );
  a.get(
    "/moderation",
    wrap((req) => admin.moderation(req.query)),
  );
  a.get(
    "/audit",
    wrap((req) =>
      s
        .page(m.Audit, {}, req.query)
        .then((r) => ({ items: r.rows, next: r.next })),
    ),
  );
  a.get(
    "/settings",
    onlyAdmin,
    wrap(() => s.settings()),
  );
  a.put(
    "/settings",
    onlyAdmin,
    wrap((req) => admin.saveSettings(req.communityAdmin, req.body)),
  );
  // Mutations invalidate this process's dashboard cache; DB remains source of truth.
  for (const model of [
    m.User,
    m.Post,
    m.Report,
    m.Profile,
    m.Event,
    m.Group,
    m.Activity,
    m.Comment,
  ])
    for (const hook of ["afterCreate", "afterUpdate", "afterDestroy"])
      model.addHook(hook, "community-admin-cache", () => admin.invalidate());
  function errors(e, req, res, next) {
    if (res.headersSent) return next(e);
    if (e.name === "SequelizeUniqueConstraintError")
      return res.status(409).json({
        erro: "Esse identificador já está em uso. Atualize e tente novamente.",
      });
    const dbCode = e.original?.code || e.parent?.code;
    if (dbCode === "ER_NO_SUCH_TABLE" || e.original?.errno === 1146)
      return res.status(503).json({
        erro: "A estrutura da Comunidade ainda não foi preparada. Execute backend/comunidade/migrate.js para aplicar a migração 002.",
        codigo: "COMMUNITY_MIGRATION_REQUIRED",
      });
    res.status(e.status || 503).json({
      erro: e.status
        ? e.message
        : "Não foi possível concluir agora. Tente novamente.",
      ...(e.code ? { codigo: e.code } : {}),
    });
  }
  r.use(errors);
  a.use(errors);
  return { router: r, admin: a };
}
module.exports = { routes };
