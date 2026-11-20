"use strict";
const { Op, fn, col } = require("sequelize"),
  crypto = require("node:crypto"),
  { models } = require("./models");
const fail = (message, status = 400) =>
  Object.assign(Error(message), { status });
const text = (v, max = 500, required = false) => {
  if (v == null && !required) return "";
  if (
    typeof v !== "string" ||
    v.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) ||
    (required && !v.trim())
  )
    throw fail("Revise os campos informados.");
  return v.trim();
};
const uuid = () => crypto.randomUUID(),
  hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
const key = (v) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v))
    throw fail("Identificador inválido.");
  return v;
};
const handle = (v) => {
  v = text(v, 30, true).toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(v))
    throw fail("O @ deve ter 3 a 30 letras, números ou _.");
  return v;
};
function create({
  ERP,
  media,
  sendMail,
  env = process.env,
  cost = 12,
  now = () => new Date(),
}) {
  const db = ERP.sequelize,
    m = models(db);
  const defaults = {
    rules:
      "Respeite pessoas e animais. Não publique dados privados, violência, spam ou conteúdo sem autorização.",
    interests: ["Passeios", "Cuidados", "Adoção", "Cachorros", "Gatos"],
    reportReasons: [
      "Spam",
      "Assédio",
      "Conteúdo impróprio",
      "Golpe ou fraude",
      "Violência contra animais",
      "Dados pessoais",
      "Outros",
    ],
    maxPostImages: 6,
    maxImageMB: 8,
    maxPostText: 3000,
    postsPerHour: 30,
    info: "",
    groupsEnabled: true,
    eventsEnabled: true,
  };
  let configCache,
    configAt = 0;
  async function settings() {
    if (configCache && Date.now() - configAt < 5000) return configCache;
    const row = await m.Setting.findByPk("platform");
    configCache = { ...defaults, ...(row?.value || {}) };
    configAt = Date.now();
    return configCache;
  }
  function invalidateSettings() {
    configCache = null;
  }
  async function ensureActive(user) {
    if (!user) throw fail("Conta indisponível.", 401);
    if (
      user.state === "suspended" &&
      user.suspended_until &&
      new Date(user.suspended_until) <= now()
    ) {
      await user.update({ state: "active", suspended_until: null });
      await audit("system", "suspension_expired", user.id);
    }
    if (user.state !== "active")
      throw fail(
        user.state === "blocked"
          ? "Conta bloqueada. Procure o suporte da plataforma."
          : "Conta suspensa ou indisponível.",
        403,
      );
  }
  async function track(user) {
    const day = new Date(+now() - 3 * 3600000).toISOString().slice(0, 10);
    if (
      user.last_active_at &&
      +now() - new Date(user.last_active_at) < 5 * 60000 &&
      new Date(+new Date(user.last_active_at) - 3 * 3600000)
        .toISOString()
        .slice(0, 10) === day
    )
      return;
    await m.Activity.findOrCreate({
      where: { user_id: user.id, day },
      defaults: { id: uuid() },
    });
    if (
      !user.last_active_at ||
      +now() - new Date(user.last_active_at) > 5 * 60000
    )
      await user.update({ last_active_at: now() });
  }

  async function audit(actor, action, target, details = {}, transaction) {
    await m.Audit.create(
      {
        id: uuid(),
        actor_id: String(actor),
        action,
        target_id: String(target),
        details,
      },
      { transaction },
    );
  }
  async function context(raw) {
    if (typeof raw !== "string" || raw.length > 100)
      throw fail("Entre para continuar.", 401);
    const session = await m.Session.findByPk(hash(raw));
    if (!session || new Date(session.expires_at) <= now())
      throw fail("Sessão expirada. Entre novamente.", 401);
    const user = await m.User.findByPk(session.user_id);
    await ensureActive(user);
    if (!user.email)
      throw Object.assign(
        fail(
          "Atualize sua conta social anterior para o cadastro público.",
          401,
        ),
        { code: "LEGACY_UPGRADE_REQUIRED" },
      );
    if (!user.verified_at)
      throw Object.assign(fail("Confirme seu e-mail antes de acessar.", 403), {
        code: "EMAIL_UNVERIFIED",
      });
    if (session.auth_version !== user.auth_version)
      throw fail("Sessão encerrada. Entre novamente.", 401);
    await track(user);
    const profiles = await m.Profile.findAll({
      where: { user_id: user.id, state: "active" },
      order: [["createdAt", "ASC"]],
    });
    return { user, profiles, session, csrf: hash("csrf:" + raw) };
  }
  const ownProfile = (c, id) => {
    const p = c.profiles.find((p) => p.id === id);
    if (!p) throw fail("Escolha um perfil da sua conta.", 403);
    return p;
  };
  const profileDTO = (p) => ({
    id: p.id,
    kind: p.kind,
    handle: p.handle,
    name: p.name,
    bio: p.bio || "",
    city: p.city || "",
    species: p.species || "",
    breed: p.breed || "",
    interests: p.interests || "",
    avatar: p.avatar_id ? "/api/comunidade/media/" + p.avatar_id : null,
    cover: p.cover_id ? "/api/comunidade/media/" + p.cover_id : null,
  });
  async function self(c) {
    const cfg = await settings();
    return {
      user: {
        id: c.user.id,
        role: "member",
        canEvents: cfg.eventsEnabled,
        consented: !!c.user.consent_at,
        emailVerified: !!c.user.verified_at,
        onboarded: !!c.user.onboarded_at,
      },
      profiles: c.profiles.map(profileDTO),
      platform: cfg,
      csrf: c.csrf,
    };
  }
  async function ownedMedia(c, id) {
    if (!id) return null;
    const v = await m.Media.findOne({
      where: { id: key(id), user_id: c.user.id },
    });
    if (!v) throw fail("Arquivo não pertence à sua conta.", 403);
    return v;
  }
  async function saveProfile(c, b, id) {
    const editing = id ? ownProfile(c, id) : null;
    if (!editing && c.profiles.length >= 12)
      throw fail("Limite de perfis atingido.");
    const values = {
      name: text(b.name, 80, true),
      handle: handle(b.handle),
      bio: text(b.bio, 500),
      city: text(b.city, 100),
      interests: text(b.interests, 200),
    };
    for (const field of ["avatar_id", "cover_id"])
      if (b[field] !== undefined) {
        await ownedMedia(c, b[field]);
        values[field] = b[field] || null;
      }
    if (!editing) {
      if (b.consent !== true || b.adult !== true)
        throw fail(
          "Confirme que tem 18 anos ou mais e autorize os dados públicos escolhidos.",
        );
      if (b.pet_id || b.company)
        throw fail(
          "Cadastre o pet diretamente na Comunidade, sem vínculo com empresa.",
        );
      values.kind = b.kind === "pet" ? "pet" : "tutor";
      if (values.kind === "tutor") values.tutor_owner = c.user.id;
      if (values.kind === "tutor" && c.profiles.some((p) => p.kind === "tutor"))
        throw fail("Sua conta já tem um perfil de tutor.", 409);
      if (values.kind === "pet") {
        values.species = text(b.species, 60, true);
        values.breed = text(b.breed, 80);
      }
    }
    if (editing?.kind === "pet") {
      values.species = text(b.species ?? editing.species, 60, true);
      values.breed = text(b.breed ?? editing.breed, 80);
    }
    const p = await db.transaction(async (transaction) => {
      let result;
      if (editing) {
        await editing.update(values, { transaction });
        result = editing;
      } else {
        result = await m.Profile.create(
          { id: uuid(), user_id: c.user.id, ...values },
          { transaction },
        );
        await c.user.update(
          { consent_at: now(), policy_version: "2026-11-18" },
          { transaction },
        );
      }
      return result;
    });
    return profileDTO(p);
  }
  async function blocked(c) {
    const b = await m.Block.findAll({
      where: { [Op.or]: [{ from_user: c.user.id }, { to_user: c.user.id }] },
    });
    return [
      ...new Set(
        b.map((x) => (x.from_user === c.user.id ? x.to_user : x.from_user)),
      ),
    ];
  }
  async function scope(c) {
    const blocks = await blocked(c),
      suspended = await m.User.findAll({
        where: {
          [Op.or]: [{ state: { [Op.ne]: "active" } }, { verified_at: null }],
        },
        attributes: ["id"],
      }),
      b = [...blocks, ...suspended.map((x) => x.id)];
    const follows = await m.Follow.findAll({
      where: { from_id: { [Op.in]: c.profiles.map((p) => p.id) } },
    });
    const hidden = await m.Profile.findAll({
      where: { state: { [Op.ne]: "active" } },
      attributes: ["id"],
    });
    const hiddenGroups = await m.Group.findAll({
      where: { state: { [Op.ne]: "active" } },
      attributes: ["id"],
    });
    return {
      b,
      g: hiddenGroups.map((g) => g.id),
      hidden: hidden.map((p) => p.id),
      following: follows.map((x) => x.to_id),
      own: c.profiles.map((p) => p.id),
    };
  }
  function audience(c, s) {
    return {
      state: "active",
      [Op.and]: [
        ...(s.hidden?.length ? [{ profile_id: { [Op.notIn]: s.hidden } }] : []),
        ...(s.g?.length
          ? [
              {
                [Op.or]: [
                  { group_id: null },
                  { group_id: { [Op.notIn]: s.g } },
                ],
              },
            ]
          : []),
      ],
      ...(s.b.length ? { user_id: { [Op.notIn]: s.b } } : {}),
      [Op.or]: [
        { visibility: "publico" },
        { user_id: c.user.id },
        { visibility: "seguidores", profile_id: { [Op.in]: s.following } },
      ],
    };
  }
  async function visiblePost(c, id) {
    const s = await scope(c),
      post = await m.Post.findOne({
        where: { id: key(id), ...audience(c, s) },
      });
    if (!post || (post.expires_at && new Date(post.expires_at) <= now()))
      throw fail("Publicação não encontrada.", 404);
    return post;
  }
  function cursor(where, value) {
    if (!value) return where;
    let v;
    try {
      v = JSON.parse(Buffer.from(value, "base64url"));
      if (!/^[0-9a-f-]{36}$/i.test(v.id) || !Number.isFinite(Date.parse(v.at)))
        throw Error();
    } catch {
      throw fail("Paginação inválida.");
    }
    return {
      [Op.and]: [
        where,
        {
          [Op.or]: [
            { createdAt: { [Op.lt]: new Date(v.at) } },
            { createdAt: new Date(v.at), id: { [Op.lt]: v.id } },
          ],
        },
      ],
    };
  }
  async function page(model, where, { after, limit = 15 } = {}) {
    const n = Math.floor(Math.min(Math.max(Number(limit) || 15, 1), 30)),
      rows = await model.findAll({
        where: cursor(where, after),
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
        limit: n + 1,
      });
    const more = rows.length > n;
    if (more) rows.pop();
    const last = rows.at(-1);
    return {
      rows,
      next: more
        ? Buffer.from(
            JSON.stringify({ id: last.id, at: last.createdAt }),
          ).toString("base64url")
        : null,
    };
  }
  async function postsDTO(c, posts) {
    if (!posts.length) return [];
    const ids = posts.map((p) => p.id),
      profiles = await m.Profile.findAll({
        where: { id: { [Op.in]: posts.map((p) => p.profile_id) } },
      }),
      links = await m.PostMedia.findAll({
        where: { post_id: { [Op.in]: ids } },
        order: [["position", "ASC"]],
      }),
      medias = await m.Media.findAll({
        where: { id: { [Op.in]: links.map((l) => l.media_id) } },
      });
    async function counts(model) {
      const rows = await model.findAll({
        where: {
          post_id: { [Op.in]: ids },
          ...(model === m.Comment ? { state: "active" } : {}),
        },
        attributes: ["post_id", [fn("COUNT", col("id")), "total"]],
        group: ["post_id"],
        raw: true,
      });
      return Object.fromEntries(rows.map((r) => [r.post_id, Number(r.total)]));
    }
    const [likes, comments, mine, saved] = await Promise.all([
      counts(m.Like),
      counts(m.Comment),
      m.Like.findAll({
        where: { user_id: c.user.id, post_id: { [Op.in]: ids } },
      }),
      m.Save.findAll({
        where: { user_id: c.user.id, post_id: { [Op.in]: ids } },
      }),
    ]);
    return posts.map((p) => ({
      id: p.id,
      author: profileDTO(profiles.find((a) => a.id === p.profile_id)),
      text: p.text,
      kind: p.kind,
      color: p.color,
      visibility: p.visibility,
      createdAt: p.createdAt,
      expiresAt: p.expires_at,
      own: p.user_id === c.user.id,
      likes: likes[p.id] || 0,
      comments: comments[p.id] || 0,
      liked: mine.some((x) => x.post_id === p.id),
      saved: saved.some((x) => x.post_id === p.id),
      media: links
        .filter((x) => x.post_id === p.id)
        .map((l) => {
          const a = medias.find((a) => a.id === l.media_id);
          return {
            id: a.id,
            url: "/api/comunidade/media/" + a.id,
            width: a.width,
            height: a.height,
          };
        }),
    }));
  }
  async function feed(c, q = {}) {
    const s = await scope(c);
    let where = {
      ...audience(c, s),
      kind: q.kind === "momento" ? "momento" : "post",
      ...(q.kind === "momento" ? { expires_at: { [Op.gt]: now() } } : {}),
    };
    if (q.kind === "momento")
      where.profile_id = { [Op.in]: [...s.following, ...s.own] };
    if (q.profile) where.profile_id = key(q.profile);
    if (q.group) where.group_id = key(q.group);
    if (q.filter === "seguindo") where.profile_id = { [Op.in]: s.following };
    if (q.saved === "1") {
      const saves = await m.Save.findAll({ where: { user_id: c.user.id } });
      where.id = { [Op.in]: saves.map((x) => x.post_id) };
    }
    if (q.q)
      where.text = {
        [Op.like]: "%" + text(q.q, 100).replace(/[\\%_]/g, "\\$&") + "%",
      };
    const result = await page(m.Post, where, q);
    return { items: await postsDTO(c, result.rows), next: result.next };
  }
  async function publish(c, b) {
    if (!c.user.consent_at)
      throw fail("Conclua seu perfil e consentimento.", 403);
    const cfg = await settings();
    const recent = await m.Post.count({
      where: {
        user_id: c.user.id,
        createdAt: { [Op.gte]: new Date(+now() - 3600000) },
      },
    });
    if (recent >= cfg.postsPerHour)
      throw fail(
        "Limite de publicações por hora atingido. Aguarde um pouco.",
        429,
      );
    if (b.group_id) {
      const group = await m.Group.findOne({
        where: { id: key(b.group_id), state: "active" },
      });
      if (
        !group ||
        !(await m.Member.count({
          where: { group_id: group.id, user_id: c.user.id },
        }))
      )
        throw fail("Entre na comunidade antes de publicar.", 403);
    }
    const p = ownProfile(c, key(b.profile_id)),
      content = text(b.text, cfg.maxPostText),
      mediaIds = Array.isArray(b.media) ? [...new Set(b.media)] : [];
    if (mediaIds.length > cfg.maxPostImages || (!content && !mediaIds.length))
      throw fail("Adicione uma legenda ou uma foto.");
    const kind = b.kind === "momento" ? "momento" : "post";
    if (kind === "momento" && mediaIds.length !== 1)
      throw fail("Um Momento precisa de uma foto.");
    if (!["publico", "seguidores", "privado"].includes(b.visibility))
      throw fail("Visibilidade inválida.");
    if (!/^[a-zA-Z0-9_-]{16,64}$/.test(b.idempotency || ""))
      throw fail("Reabra o editor e tente novamente.");
    const existing = await m.Post.findOne({
      where: { user_id: c.user.id, idempotency: b.idempotency },
    });
    if (existing) return (await postsDTO(c, [existing]))[0];
    for (const id of mediaIds) await ownedMedia(c, id);
    const post = await db.transaction(async (transaction) => {
      const row = await m.Post.create(
        {
          id: uuid(),
          profile_id: p.id,
          group_id: b.group_id || null,
          user_id: c.user.id,
          text: content,
          kind,
          visibility: b.visibility,
          idempotency: b.idempotency,
          color: /^#[a-f0-9]{6}$/i.test(b.color || "") ? b.color : null,
          expires_at: kind === "momento" ? new Date(+now() + 86400000) : null,
        },
        { transaction },
      );
      await m.PostMedia.bulkCreate(
        mediaIds.map((id, i) => ({
          id: uuid(),
          post_id: row.id,
          media_id: id,
          position: i,
        })),
        { transaction },
      );
      return row;
    });
    return (await postsDTO(c, [post]))[0];
  }
  async function notify(c, userId, kind, target, actor) {
    if (c.user.id !== userId)
      await m.Notification.create({
        id: uuid(),
        user_id: userId,
        actor_id: actor || c.profiles[0]?.id || c.user.id,
        kind,
        target_id: target,
      });
  }
  async function reaction(c, id, type, on, actor) {
    if (actor) ownProfile(c, key(actor));
    const post = await visiblePost(c, id),
      model = type === "like" ? m.Like : m.Save,
      where = { user_id: c.user.id, post_id: post.id };
    if (on) {
      const [, created] = await model.findOrCreate({
        where,
        defaults: { id: uuid() },
      });
      if (created && type === "like")
        await notify(c, post.user_id, "like", post.id, actor);
    } else await model.destroy({ where });
    return (await postsDTO(c, [post]))[0];
  }
  async function profile(c, id) {
    const p = await m.Profile.findOne({
      where: { id: key(id), state: "active" },
    });
    if (!p || (await scope(c)).b.includes(p.user_id))
      throw fail("Perfil não encontrado.", 404);
    const [followers, following, posts, isFollowing] = await Promise.all([
      m.Follow.count({ where: { to_id: p.id } }),
      m.Follow.count({ where: { from_id: p.id } }),
      m.Post.count({
        where: {
          ...audience(c, await scope(c)),
          profile_id: p.id,
          kind: "post",
        },
      }),
      m.Follow.count({
        where: {
          from_id: { [Op.in]: c.profiles.map((a) => a.id) },
          to_id: p.id,
        },
      }),
    ]);
    return {
      ...profileDTO(p),
      own: p.user_id === c.user.id,
      followers,
      following,
      posts,
      isFollowing: !!isFollowing,
    };
  }
  async function follow(c, id, actor, on) {
    const target = await profile(c, id),
      p = ownProfile(c, key(actor));
    if (p.id === id) throw fail("Escolha outro perfil.");
    const where = { from_id: p.id, to_id: id };
    if (on) {
      const [, created] = await m.Follow.findOrCreate({
        where,
        defaults: { id: uuid() },
      });
      if (created) {
        const dest = await m.Profile.findByPk(id);
        await notify(c, dest.user_id, "follow", id, p.id);
      }
    } else await m.Follow.destroy({ where });
    return profile(c, id);
  }
  async function comment(c, id, b) {
    const post = await visiblePost(c, id),
      author = ownProfile(c, key(b.profile_id));
    if (
      (await m.Comment.count({
        where: {
          user_id: c.user.id,
          createdAt: { [Op.gte]: new Date(+now() - 3600000) },
        },
      })) >= 100
    )
      throw fail("Limite de comentários por hora atingido.", 429);
    if (b.parent_id) {
      const parent = await m.Comment.findOne({
        where: { id: key(b.parent_id), post_id: post.id, state: "active" },
      });
      if (!parent) throw fail("Comentário indisponível.", 404);
    }
    const row = await m.Comment.create({
      id: uuid(),
      user_id: c.user.id,
      profile_id: author.id,
      post_id: post.id,
      parent_id: b.parent_id || null,
      text: text(b.text, 1000, true),
    });
    await notify(c, post.user_id, "comment", post.id, author.id);
    return {
      id: row.id,
      text: row.text,
      author: profileDTO(author),
      parentId: row.parent_id,
      own: true,
      createdAt: row.createdAt,
    };
  }
  async function comments(c, id, q) {
    await visiblePost(c, id);
    const s = await scope(c),
      r = await page(
        m.Comment,
        {
          post_id: id,
          state: "active",
          ...(s.hidden.length ? { profile_id: { [Op.notIn]: s.hidden } } : {}),
          ...(s.b.length ? { user_id: { [Op.notIn]: s.b } } : {}),
        },
        q,
      ),
      profiles = await m.Profile.findAll({
        where: { id: { [Op.in]: r.rows.map((x) => x.profile_id) } },
      });
    return {
      items: r.rows.map((x) => ({
        id: x.id,
        text: x.text,
        parentId: x.parent_id,
        author: profileDTO(profiles.find((p) => p.id === x.profile_id)),
        own: x.user_id === c.user.id,
        createdAt: x.createdAt,
      })),
      next: r.next,
    };
  }
  async function upload(c, file) {
    if (!c.user.consent_at) throw fail("Conclua o consentimento.", 403);
    const cfg = await settings();
    if (
      (await m.Media.count({
        where: {
          user_id: c.user.id,
          createdAt: { [Op.gte]: new Date(+now() - 3600000) },
        },
      })) >= 50
    )
      throw fail("Limite de uploads por hora atingido.", 429);
    if (!file || file.buffer.length > cfg.maxImageMB * 1024 * 1024)
      throw fail("Envie uma foto de até 8 MB.");
    const sharp = require("sharp"),
      metadata = await sharp(file.buffer, { limitInputPixels: 25000000 })
        .metadata()
        .catch(() => null);
    if (
      !metadata ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      metadata.pages > 1
    )
      throw fail("Formato inválido. Use JPEG, PNG ou WebP estático.");
    const bytes = await sharp(file.buffer, { limitInputPixels: 25000000 })
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer(),
      size = await sharp(bytes).metadata(),
      digest = hash(bytes),
      reference = "community/users/" + c.user.id + "/" + digest + ".webp";
    await media().store.gravar(reference, bytes, "image/webp", digest);
    const row = await m.Media.create({
      id: uuid(),
      user_id: c.user.id,
      empresa_id: 0,
      reference,
      mime: "image/webp",
      width: size.width,
      height: size.height,
      size: bytes.length,
    });
    return {
      id: row.id,
      url: "/api/comunidade/media/" + row.id,
      width: row.width,
      height: row.height,
    };
  }
  async function readMedia(c, id) {
    const row = await m.Media.findByPk(key(id));
    if (!row) throw fail("Foto indisponível.", 404);
    let allowed = row.user_id === c.user.id;
    if (!allowed && !(await scope(c)).b.includes(row.user_id)) {
      allowed = !!(await m.Profile.count({
        where: {
          state: "active",
          [Op.or]: [{ avatar_id: id }, { cover_id: id }],
        },
      }));
      if (!allowed) {
        const refs = await m.PostMedia.findAll({ where: { media_id: id } });
        for (const r of refs) {
          try {
            await visiblePost(c, r.post_id);
            allowed = true;
            break;
          } catch {}
        }
      }
    }
    if (!allowed) throw fail("Foto indisponível.", 404);
    return readStored(row);
  }
  async function remove(c, kind, id) {
    const model = kind === "post" ? m.Post : m.Comment,
      row = await model.findByPk(key(id));
    if (!row || row.user_id !== c.user.id)
      throw fail("Conteúdo indisponível.", 403);
    await db.transaction(async (transaction) => {
      await row.update({ state: "removed" }, { transaction });
      await audit(c.user.id, "remove_" + kind, id, {}, transaction);
    });
    return { ok: true };
  }
  async function block(c, id, on) {
    const p = await m.Profile.findByPk(key(id));
    if (!p || p.user_id === c.user.id) throw fail("Perfil inválido.");
    const where = { from_user: c.user.id, to_user: p.user_id };
    if (on) await m.Block.findOrCreate({ where, defaults: { id: uuid() } });
    else await m.Block.destroy({ where });
    return { ok: true };
  }
  async function report(c, b) {
    const map = {
      post: m.Post,
      profile: m.Profile,
      comment: m.Comment,
      event: m.Event,
      group: m.Group,
    };
    const model = map[b.kind];
    if (!model)
      throw fail("Tipo de conteúdo ainda não disponível para denúncia.");
    const row = await model.findByPk(key(b.target_id));
    if (!row) throw fail("Conteúdo indisponível.", 404);
    if (b.kind === "post") await visiblePost(c, row.id);
    if (b.kind === "comment") await visiblePost(c, row.post_id);
    if (b.kind === "profile") await profile(c, row.id);
    if (
      ["event", "group"].includes(b.kind) &&
      (await scope(c)).b.includes(row.user_id)
    )
      throw fail("Conteúdo indisponível.", 404);
    const recent = await m.Report.count({
      where: {
        user_id: c.user.id,
        createdAt: { [Op.gte]: new Date(+now() - 3600000) },
      },
    });
    if (recent >= 20)
      throw fail("Limite de denúncias atingido. Aguarde um pouco.", 429);
    const snapshot = {
      name: row.name || row.title || "",
      text: row.text || row.bio || row.description || "",
      kind: row.kind || b.kind,
      state: row.state,
    };
    if (b.kind === "post")
      snapshot.media = (
        await m.PostMedia.findAll({ where: { post_id: row.id } })
      ).map((x) => x.media_id);
    await m.Report.create({
      id: uuid(),
      user_id: c.user.id,
      target_user: row.user_id,
      kind: b.kind,
      target_id: row.id,
      reason: text(b.reason, 1000, true),
      snapshot,
    });
    return { ok: true };
  }
  async function explore(c, q) {
    const s = await scope(c),
      where = {
        state: "active",
        ...(s.b.length ? { user_id: { [Op.notIn]: s.b } } : {}),
      };
    if (q.q)
      where[Op.or] = ["handle", "name", "species", "interests", "city"].map(
        (k) => ({
          [k]: {
            [Op.like]: "%" + text(q.q, 100).replace(/[\\%_]/g, "\\$&") + "%",
          },
        }),
      );
    const r = await page(m.Profile, where, q);
    return { items: r.rows.map(profileDTO), next: r.next };
  }
  async function adminMedia(id) {
    const row = await m.Media.findByPk(key(id));
    if (!row) throw fail("Foto indisponível.", 404);
    return readStored(row);
  }
  async function readStored(row) {
    if (row.reference.startsWith("community/users/"))
      return { bytes: await media().store.ler(row.reference), tipo: row.mime };
    return media().ler(Number(row.empresa_id), row.reference);
  }
  const auth = require("./auth").auth(
    { m, db, now, uuid, hash, fail, text, ensureActive },
    { sendMail: sendMail || require("./mail").mailer(env).send, env, cost },
  );
  return {
    adminMedia,
    m,
    db,
    ERP,
    now,
    auth,
    login: auth.login,
    ensureActive,
    settings,
    invalidateSettings,
    defaults,
    hash,
    context,
    self,
    saveProfile,
    feed,
    publish,
    reaction,
    profile,
    follow,
    comment,
    comments,
    upload,
    readMedia,
    remove,
    block,
    report,
    explore,
    ownProfile,
    visiblePost,
    profileDTO,
    postsDTO,
    page,
    audit,
    notify,
    scope,
    fail,
    text,
    key,
    uuid,
  };
}
module.exports = { create, fail, text, key, uuid, hash };
