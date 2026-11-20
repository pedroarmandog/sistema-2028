"use strict";
const { Op, fn, col, literal } = require("sequelize");
module.exports = (s) => {
  const { m, db, fail, text, key, uuid, now } = s;
  let cached,
    at = 0;
  const day = (d) =>
      new Date(+new Date(d) - 3 * 3600000).toISOString().slice(0, 10),
    start = (d) => new Date(d + "T03:00:00.000Z");
  const safeUser = (u) => ({
    id: u.id,
    email: u.email,
    state: u.state,
    verified: !!u.verified_at,
    createdAt: u.createdAt,
    lastActiveAt: u.last_active_at,
    suspendedUntil: u.suspended_until,
  });
  function invalidate() {
    cached = null;
  }
  async function totals() {
    if (cached && Date.now() - at < 15000) return cached;
    const today = day(now()),
      month = today.slice(0, 7) + "-01",
      since = (n) => new Date(+now() - n * 86400000);
    const active = async (days) =>
      m.Activity.count({
        distinct: true,
        col: "user_id",
        where: { day: { [Op.gte]: day(since(days - 1)) } },
      });
    const [
      users,
      active7,
      active30,
      todayUsers,
      monthUsers,
      verified,
      posts,
      reports,
      pets,
      groups,
      events,
      postsToday,
      commentsToday,
      weekUsers,
      suspended,
      unverified,
      moments,
      blocked,
    ] = await Promise.all([
      m.User.count(),
      active(7),
      active(30),
      m.User.count({ where: { createdAt: { [Op.gte]: start(today) } } }),
      m.User.count({ where: { createdAt: { [Op.gte]: start(month) } } }),
      m.User.count({ where: { verified_at: { [Op.ne]: null } } }),
      m.Post.count({ where: { kind: "post", state: "active" } }),
      m.Report.count({ where: { state: { [Op.in]: ["open", "reviewing"] } } }),
      m.Profile.count({ where: { kind: "pet", state: "active" } }),
      m.Group.count({ where: { state: "active" } }),
      m.Event.count({ where: { state: "active" } }),
      m.Post.count({
        where: { kind: "post", createdAt: { [Op.gte]: start(today) } },
      }),
      m.Comment.count({ where: { createdAt: { [Op.gte]: start(today) } } }),
      m.User.count({ where: { createdAt: { [Op.gte]: since(7) } } }),
      m.User.count({ where: { state: "suspended" } }),
      m.User.count({ where: { verified_at: null } }),
      m.Post.count({ where: { kind: "momento" } }),
      m.User.count({ where: { state: "blocked" } }),
    ]);
    cached = {
      users,
      active7,
      active30,
      todayUsers,
      monthUsers,
      verified,
      posts,
      reports,
      pets,
      groups,
      events,
      postsToday,
      commentsToday,
      weekUsers,
      suspended,
      unverified,
      moments,
      blocked,
      postsTotal: await m.Post.count({ where: { kind: "post" } }),
      active30Ratio: users ? Math.round((active30 / users) * 1000) / 10 : 0,
      generatedAt: now(),
      activityDefinition:
        "Conta verificada com ao menos uma requisição autenticada aceita no aplicativo no dia; dias de Brasília. Não representa presença online.",
    };
    at = Date.now();
    return cached;
  }
  async function stats(q = {}) {
    const days = [7, 30, 90, 365].includes(Number(q.days))
        ? Number(q.days)
        : 30,
      from = start(day(new Date(+now() - (days - 1) * 86400000))),
      quote = db.getDialect() === "sqlite" ? '"' : "`",
      dateExpr =
        db.getDialect() === "sqlite"
          ? `date(${quote}createdAt${quote}, '-3 hours')`
          : `DATE(DATE_SUB(${quote}createdAt${quote}, INTERVAL 3 HOUR))`;
    async function series(model, where = {}) {
      const rows = await model.findAll({
        where: { createdAt: { [Op.gte]: from }, ...where },
        attributes: [
          [literal(dateExpr), "day"],
          [fn("COUNT", col("id")), "value"],
        ],
        group: [literal(dateExpr)],
        raw: true,
      });
      return Object.fromEntries(rows.map((x) => [x.day, Number(x.value)]));
    }
    const [
      users,
      posts,
      likes,
      comments,
      moments,
      follows,
      rsvps,
      groups,
      members,
      activities,
    ] = await Promise.all([
      series(m.User),
      series(m.Post, { kind: "post" }),
      series(m.Like),
      series(m.Comment),
      series(m.Post, { kind: "momento" }),
      series(m.Follow),
      series(m.RSVP),
      series(m.Group),
      series(m.Member),
      m.Activity.findAll({
        where: { day: { [Op.gte]: day(from) } },
        attributes: [
          "day",
          [fn("COUNT", fn("DISTINCT", col("user_id"))), "value"],
        ],
        group: ["day"],
        raw: true,
      }),
    ]);
    const act = Object.fromEntries(
        activities.map((r) => [r.day, Number(r.value)]),
      ),
      list = [];
    for (let i = 0; i < days; i++) {
      const d = day(new Date(+from + i * 86400000));
      list.push({
        day: d,
        users: users[d] || 0,
        active: act[d] || 0,
        posts: posts[d] || 0,
        likes: likes[d] || 0,
        comments: comments[d] || 0,
        moments: moments[d] || 0,
        follows: follows[d] || 0,
        rsvps: rsvps[d] || 0,
        groups: groups[d] || 0,
        members: members[d] || 0,
      });
    }
    const returns = await m.Activity.findAll({
      where: { day: { [Op.gte]: day(from) } },
      attributes: ["user_id", [fn("COUNT", col("id")), "days"]],
      group: ["user_id"],
      having: literal("COUNT(*) > 1"),
      raw: true,
    });
    const popularRows = await m.Like.findAll({
      attributes: ["post_id", [fn("COUNT", col("id")), "likes"]],
      group: ["post_id"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 5,
      raw: true,
    });
    const popular = await Promise.all(
      popularRows.map(async (r) => {
        const p = await m.Post.findByPk(r.post_id);
        return p
          ? {
              id: p.id,
              text: p.text,
              likes: Number(r.likes),
              comments: await m.Comment.count({
                where: { post_id: p.id, state: "active" },
              }),
            }
          : null;
      }),
    );
    return {
      days,
      series: list,
      returningUsers: returns.length,
      averageActiveDays: await (async () => {
        const unique = await m.Activity.count({
          distinct: true,
          col: "user_id",
          where: { day: { [Op.gte]: day(from) } },
        });
        return unique
          ? Math.round(
              (list.reduce((n, r) => n + r.active, 0) / unique) * 100,
            ) / 100
          : 0;
      })(),
      popular: popular.filter(Boolean),
      definition:
        "Séries por dia de Brasília. Curtidas, seguidores e presenças refletem registros ainda existentes; retiradas não têm histórico de evento nesta versão.",
    };
  }
  function filters(q) {
    const where = {};
    if (
      q.status &&
      ["active", "suspended", "blocked", "deleted"].includes(q.status)
    )
      where.state = q.status;
    if (q.verified === "yes") where.verified_at = { [Op.ne]: null };
    if (q.verified === "no") where.verified_at = null;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from))
        where.createdAt[Op.gte] = start(q.from);
      if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to))
        where.createdAt[Op.lt] = new Date(+start(q.to) + 86400000);
    }
    if (q.activity === "active")
      where.last_active_at = { [Op.gte]: new Date(+now() - 7 * 86400000) };
    if (q.activity === "inactive")
      where[Op.or] = [
        { last_active_at: null },
        { last_active_at: { [Op.lt]: new Date(+now() - 7 * 86400000) } },
      ];
    return where;
  }
  async function participants(q = {}) {
    let where = filters(q);
    if (q.q) {
      const term = "%" + text(q.q, 100).replace(/[\\%_]/g, "\\$&") + "%",
        profiles = await m.Profile.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: term } },
              { handle: { [Op.like]: term } },
            ],
          },
          attributes: ["user_id"],
        });
      where = {
        [Op.and]: [
          where,
          {
            [Op.or]: [
              { email: { [Op.like]: term } },
              { id: { [Op.in]: profiles.map((p) => p.user_id) } },
            ],
          },
        ],
      };
    }
    const r = await s.page(m.User, where, q);
    return {
      items: await Promise.all(
        r.rows.map(async (u) => {
          const profile = await m.Profile.findOne({
            where: { user_id: u.id, kind: "tutor" },
          });
          return {
            ...safeUser(u),
            profile: profile
              ? {
                  ...s.profileDTO(profile),
                  avatar: profile.avatar_id
                    ? "/api/comunidade-admin/media/" + profile.avatar_id
                    : null,
                }
              : null,
            pets: await m.Profile.count({
              where: { user_id: u.id, kind: "pet", state: "active" },
            }),
            posts: await m.Post.count({
              where: { user_id: u.id, kind: "post", state: "active" },
            }),
            reports: await m.Report.count({ where: { target_user: u.id } }),
          };
        }),
      ),
      next: r.next,
    };
  }
  async function participant(id) {
    const u = await m.User.findByPk(key(id));
    if (!u) throw fail("Conta indisponível.", 404);
    return {
      ...safeUser(u),
      profiles: (await m.Profile.findAll({ where: { user_id: u.id } })).map(
        s.profileDTO,
      ),
      posts: await m.Post.findAll({
        where: { user_id: u.id, visibility: "publico" },
        attributes: ["id", "text", "state", "kind", "createdAt"],
        limit: 20,
        order: [["createdAt", "DESC"]],
      }),
      reports: await m.Report.findAll({
        where: { target_user: u.id },
        limit: 20,
        order: [["createdAt", "DESC"]],
      }),
      sanctions: await m.Sanction.findAll({
        where: { user_id: u.id },
        limit: 50,
        order: [["createdAt", "DESC"]],
      }),
    };
  }
  async function sanction(admin, id, b, outerTransaction) {
    if (
      !["warn", "suspend", "reactivate", "block", "erasure"].includes(b.action)
    )
      throw fail("Ação inválida.");
    const reason = text(b.reason, 1000, true);
    let until = null;
    if (admin.role === "moderator" && !["warn", "suspend"].includes(b.action))
      throw fail("Ação exclusiva do administrador geral.", 403);
    if (b.action === "suspend") {
      until = new Date(b.until);
      if (
        !Number.isFinite(+until) ||
        until <= now() ||
        until > +now() + (admin.role === "moderator" ? 7 : 366) * 86400000
      )
        throw fail("Prazo de suspensão inválido.");
    }
    const work = async (transaction) => {
      const u = await m.User.findByPk(key(id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!u || u.state === "deleted") throw fail("Conta indisponível.", 404);
      if (
        admin.role === "moderator" &&
        u.state === "blocked" &&
        b.action !== "warn"
      )
        throw fail(
          "Conta bloqueada exige revisão do administrador geral.",
          403,
        );
      if (b.action !== "warn") {
        const state = {
          suspend: "suspended",
          reactivate: "active",
          block: "blocked",
          erasure: "deleted",
        }[b.action];
        await u.update(
          { state, suspended_until: until, auth_version: u.auth_version + 1 },
          { transaction },
        );
        await m.Session.destroy({ where: { user_id: u.id }, transaction });
        if (b.action === "erasure") {
          for (const model of [m.Post, m.Profile, m.Comment])
            await model.update(
              { state: "removed" },
              { where: { user_id: u.id }, transaction },
            );
          await m.Privacy.create(
            { id: uuid(), user_id: u.id, kind: "erasure" },
            { transaction },
          );
        }
      }
      await m.Sanction.create(
        {
          id: uuid(),
          user_id: u.id,
          admin_id: admin.id,
          action: b.action,
          reason,
          until,
          report_id: b.report_id || null,
        },
        { transaction },
      );
      await s.audit(
        admin.id,
        "user_" + b.action,
        u.id,
        { reason, until, result: u.state },
        transaction,
      );
    };
    if (outerTransaction) await work(outerTransaction);
    else await db.transaction(work);
    invalidate();
    return { ok: true };
  }
  async function reports(q = {}) {
    const where = {};
    if (
      q.status &&
      ["open", "reviewing", "resolved", "rejected"].includes(q.status)
    )
      where.state = q.status;
    else where.state = { [Op.in]: ["open", "reviewing"] };
    if (q.kind) where.kind = text(q.kind, 20);
    const r = await s.page(m.Report, where, q);
    return {
      items: r.rows.map((x) => ({
        id: x.id,
        kind: x.kind,
        targetId: x.target_id,
        reporterId: x.user_id,
        targetUser: x.target_user,
        reason: x.reason,
        state: x.state,
        priority: x.priority,
        createdAt: x.createdAt,
      })),
      next: r.next,
    };
  }
  const modelMap = {
    post: m.Post,
    comment: m.Comment,
    profile: m.Profile,
    event: m.Event,
    group: m.Group,
  };
  async function reportDetail(id) {
    const row = await m.Report.findByPk(key(id));
    if (!row) throw fail("Denúncia indisponível.", 404);
    const target = await modelMap[row.kind]?.findByPk(row.target_id);
    const media =
      row.kind === "post"
        ? (
            await m.PostMedia.findAll({ where: { post_id: row.target_id } })
          ).map((r) => r.media_id)
        : row.snapshot?.media || [];
    return {
      id: row.id,
      kind: row.kind,
      state: row.state,
      reason: row.reason,
      targetId: row.target_id,
      targetUser: row.target_user,
      reporterId: row.user_id,
      content: target
        ? {
            id: target.id,
            name: target.name || target.title || "",
            text: target.text || target.bio || target.description || "",
            state: target.state,
            media,
          }
        : row.snapshot,
      related: await m.Report.findAll({
        where: { target_id: row.target_id },
        limit: 30,
      }),
      audit: await m.Audit.findAll({
        where: { target_id: row.target_id },
        limit: 30,
        order: [["createdAt", "DESC"]],
      }),
    };
  }
  async function decide(admin, id, b) {
    const reason = text(b.reason, 1000, true);
    if (
      ![
        "review",
        "reject",
        "resolve",
        "hide",
        "remove",
        "warn",
        "suspend",
        "block",
      ].includes(b.action)
    )
      throw fail("Decisão inválida.");
    await db.transaction(async (transaction) => {
      const report = await m.Report.findByPk(key(id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!report) throw fail("Denúncia indisponível.", 404);
      if (
        ["resolved", "rejected"].includes(report.state) &&
        b.action !== "review"
      )
        throw fail(
          "Esta denúncia já foi encerrada. Atualize a lista ou reabra para análise.",
          409,
        );
      if (["warn", "suspend", "block"].includes(b.action)) {
        if (!report.target_user) throw fail("Responsável indisponível.");
        await sanction(
          admin,
          report.target_user,
          { ...b, report_id: report.id },
          transaction,
        );
      }
      if (["hide", "remove"].includes(b.action)) {
        const target = await modelMap[report.kind]?.findByPk(report.target_id, {
          transaction,
        });
        if (target)
          await target.update(
            { state: b.action === "hide" ? "hidden" : "removed" },
            { transaction },
          );
      }
      await report.update(
        {
          state:
            b.action === "review"
              ? "reviewing"
              : b.action === "reject"
                ? "rejected"
                : "resolved",
          decision: reason,
          reviewed_by: admin.id,
          reviewed_at: now(),
        },
        { transaction },
      );
      await s.audit(
        admin.id,
        "report_" + b.action,
        report.target_id,
        { report: report.id, reason, result: report.state },
        transaction,
      );
    });
    invalidate();
    return { ok: true };
  }
  async function contents(kind, q = {}) {
    const model = modelMap[kind];
    if (!model) throw fail("Tipo inválido.");
    const where = {};
    if (q.state) where.state = text(q.state, 16);
    if (q.author) where.user_id = key(q.author);
    if (q.kind && kind === "post") where.kind = text(q.kind, 12);
    if (q.q) {
      const field =
        kind === "group" ? "name" : kind === "event" ? "title" : "text";
      where[field] = {
        [Op.like]: "%" + text(q.q, 100).replace(/[\\%_]/g, "\\$&") + "%",
      };
    }
    if (q.from || q.to)
      Object.assign(where, filters({ from: q.from, to: q.to }));
    if (kind === "post" && q.media === "photo") {
      const media = await m.PostMedia.findAll({ attributes: ["post_id"] });
      where.id = { [Op.in]: media.map((r) => r.post_id) };
    }
    if (q.reported === "yes") {
      const reports = await m.Report.findAll({
        where: { kind },
        attributes: ["target_id"],
      });
      where.id = { [Op.in]: reports.map((r) => r.target_id) };
    }
    const r = await s.page(model, where, q);
    return {
      items: await Promise.all(
        r.rows.map(async (row) => {
          const p = await m.Profile.findOne({
            where: row.profile_id
              ? { id: row.profile_id }
              : { user_id: row.user_id, kind: "tutor" },
          });
          return {
            id: row.id,
            name: row.name || row.title || "",
            text: row.text || row.description || "",
            kind: row.kind || kind,
            state: row.state,
            createdAt: row.createdAt,
            author: p ? s.profileDTO(p) : null,
            city: row.city,
            startsAt: row.starts_at,
            members:
              kind === "group"
                ? await m.Member.count({ where: { group_id: row.id } })
                : undefined,
            participants:
              kind === "event"
                ? await m.RSVP.count({ where: { event_id: row.id } })
                : undefined,
            likes:
              kind === "post"
                ? await m.Like.count({ where: { post_id: row.id } })
                : undefined,
            comments:
              kind === "post"
                ? await m.Comment.count({
                    where: { post_id: row.id, state: "active" },
                  })
                : undefined,
            media:
              kind === "post"
                ? (
                    await m.PostMedia.findAll({ where: { post_id: row.id } })
                  ).map((r) => r.media_id)
                : [],
            reports: await m.Report.count({
              where: { kind, target_id: row.id },
            }),
          };
        }),
      ),
      next: r.next,
    };
  }
  async function comments(id, q = {}) {
    if (!(await m.Post.findByPk(key(id))))
      throw fail("Publicação indisponível.", 404);
    const r = await s.page(m.Comment, { post_id: id }, q);
    return {
      items: await Promise.all(
        r.rows.map(async (c) => {
          const p = await m.Profile.findByPk(c.profile_id);
          return {
            id: c.id,
            text: c.text,
            state: c.state,
            createdAt: c.createdAt,
            author: p ? s.profileDTO(p) : null,
          };
        }),
      ),
      next: r.next,
    };
  }
  async function moderate(admin, b) {
    const model = modelMap[b.kind];
    if (!model) throw fail("Tipo inválido.");
    if (
      !["hidden", "removed", "active", "cancelled", "suspended"].includes(
        b.state,
      ) ||
      (b.state === "suspended" && b.kind !== "group") ||
      (b.state === "cancelled" && b.kind !== "event")
    )
      throw fail("Estado inválido.");
    const row = await model.findByPk(key(b.id));
    if (!row) throw fail("Conteúdo indisponível.", 404);
    const reason = text(b.reason, 1000, true);
    await db.transaction(async (transaction) => {
      await row.update({ state: b.state }, { transaction });
      await s.audit(
        admin.id,
        "moderate_" + b.kind,
        row.id,
        { state: b.state, reason },
        transaction,
      );
    });
    invalidate();
    return { ok: true };
  }
  async function saveSettings(admin, b) {
    const number = (key, min, max) => {
      if (!Number.isInteger(b[key]) || b[key] < min || b[key] > max)
        throw fail("Limite inválido: " + key);
      return b[key];
    };
    const list = (key, max) => {
      if (!Array.isArray(b[key]) || !b[key].length || b[key].length > max)
        throw fail("Lista inválida: " + key);
      return [...new Set(b[key].map((x) => text(x, 80, true)))];
    };
    const value = {
      rules: text(b.rules, 5000, true),
      info: text(b.info, 500),
      reportReasons: list("reportReasons", 20),
      interests: list("interests", 30),
      maxPostImages: number("maxPostImages", 1, 6),
      maxImageMB: number("maxImageMB", 1, 8),
      maxPostText: number("maxPostText", 100, 3000),
      postsPerHour: number("postsPerHour", 1, 100),
      groupsEnabled: b.groupsEnabled === true,
      eventsEnabled: b.eventsEnabled === true,
    };
    await db.transaction(async (transaction) => {
      await m.Setting.upsert({ id: "platform", value }, { transaction });
      await s.audit(
        admin.id,
        "platform_settings",
        "platform",
        { fields: Object.keys(value) },
        transaction,
      );
    });
    s.invalidateSettings();
    return value;
  }
  async function moderation(q = {}) {
    return {
      counts: {
        suspended: await m.User.count({ where: { state: "suspended" } }),
        blocked: await m.User.count({ where: { state: "blocked" } }),
      },
      suspended: await participants({ ...q, status: "suspended" }),
      blocked: await participants({ ...q, status: "blocked" }),
      recentAudit: await s.page(m.Audit, {}, q),
      recentSanctions: await s.page(m.Sanction, {}, q),
      authLimits: await m.AuthLimit.count({
        where: { attempts: { [Op.gte]: 3 }, expires_at: { [Op.gt]: now() } },
      }),
      mailFailures: await m.Mail.count({
        where: {
          state: "failed",
          createdAt: { [Op.gte]: new Date(+now() - 86400000) },
        },
      }),
    };
  }
  return {
    totals,
    stats,
    participants,
    participant,
    sanction,
    reports,
    reportDetail,
    decide,
    contents,
    comments,
    moderate,
    saveSettings,
    moderation,
    invalidate,
  };
};
