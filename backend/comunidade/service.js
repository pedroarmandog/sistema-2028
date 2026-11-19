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
function create({ ERP, portal, media, now = () => new Date() }) {
  const db = ERP.sequelize,
    m = models(db),
    getPortal = () => (typeof portal === "function" ? portal() : portal);
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
  async function validLinks(userId) {
    const links = await m.Link.findAll({
        where: { user_id: userId, enabled: true },
      }),
      valid = [];
    for (const link of links) {
      const company = await m.Company.findByPk(link.empresa_id);
      if (!company?.enabled) continue;
      const cfg = await getPortal().m.Config.findByPk(link.empresa_id);
      if (!cfg?.ativo) continue;
      const account = await getPortal().auth.m.Conta.findByPk(link.conta_id);
      if (!account?.ativo || account.versao !== link.portal_version) continue;
      const enterprise = await ERP.Empresa.findByPk(link.empresa_id);
      if (
        !enterprise ||
        enterprise.ativo === false ||
        enterprise.ativa === false
      )
        continue;
      const client = await ERP.Cliente.findOne({
        where: { id: account.cliente_id, empresa_id: link.empresa_id },
      });
      if (client && client.ativo !== false) valid.push({ link, account });
    }
    return valid;
  }
  async function prove(input) {
    let token;
    const p = getPortal();
    await p.auth.login(input, {
      cookie(_, v) {
        token = v;
      },
    });
    try {
      return await p.auth.contexto(token);
    } finally {
      await p.auth.logout(
        { cookies: { pethub_cliente: token } },
        { clearCookie() {} },
      );
    }
  }
  async function login(input) {
    const tutor = await prove(input),
      company = await m.Company.findByPk(tutor.empresaId);
    if (!company?.enabled)
      throw fail("Este estabelecimento ainda não liberou a Comunidade.", 403);
    const session = await db.transaction(async (transaction) => {
      const link = await m.Link.findByPk(tutor.contaId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!link?.enabled)
        throw fail("Peça a liberação do seu acesso ao PetHub.", 403);
      let user = link.user_id
        ? await m.User.findByPk(link.user_id, { transaction })
        : null;
      if (!user) {
        user = await m.User.create({ id: uuid() }, { transaction });
      }
      if (user.state !== "active")
        throw fail("Seu acesso à Comunidade está suspenso.", 403);
      await link.update(
        { user_id: user.id, portal_version: tutor.conta.versao },
        { transaction },
      );
      const raw = crypto.randomBytes(32).toString("base64url");
      await m.Session.create(
        {
          id: hash(raw),
          user_id: user.id,
          expires_at: new Date(+now() + 30 * 86400000),
        },
        { transaction },
      );
      return { raw, user };
    });
    return session;
  }
  async function context(raw) {
    if (typeof raw !== "string" || raw.length > 100)
      throw fail("Entre para continuar.", 401);
    const s = await m.Session.findByPk(hash(raw));
    if (!s || new Date(s.expires_at) <= now())
      throw fail("Sua sessão expirou. Entre novamente.", 401);
    const user = await m.User.findByPk(s.user_id);
    if (user?.state !== "active") throw fail("Acesso indisponível.", 403);
    const links = await validLinks(user.id);
    if (!links.length)
      throw fail("Sua liberação de acesso não está ativa.", 403);
    const profiles = await m.Profile.findAll({
      where: { user_id: user.id, state: "active" },
      order: [["createdAt", "ASC"]],
    });
    return { user, links, profiles, session: s, csrf: hash("csrf:" + raw) };
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
    const pets = [];
    for (const { link, account } of c.links) {
      const rows = await ERP.Pet.findAll({
        where: { empresa_id: link.empresa_id, cliente_id: account.cliente_id },
      });
      pets.push(
        ...rows
          .filter((p) => p.ativo !== false)
          .map((p) => ({
            id: String(p.id),
            company: String(link.empresa_id),
            name: p.nome,
            species: p.especie,
            linked: c.profiles.some(
              (q) =>
                String(q.pet_id) === String(p.id) &&
                String(q.source_company) === String(link.empresa_id),
            ),
          })),
      );
    }
    return {
      user: {
        id: c.user.id,
        role: c.user.role,
        canEvents: c.user.can_events,
        consented: !!c.user.consent_at,
      },
      profiles: c.profiles.map(profileDTO),
      pets,
      csrf: c.csrf,
    };
  }
  async function linkAccount(c, input) {
    const tutor = await prove(input);
    await db.transaction(async (transaction) => {
      const company = await m.Company.findByPk(tutor.empresaId, {
          transaction,
        }),
        link = await m.Link.findByPk(tutor.contaId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      if (!company?.enabled || !link?.enabled)
        throw fail("Este vínculo não tem liberação.", 403);
      if (link.user_id && link.user_id !== c.user.id)
        throw fail(
          "Essa identidade já está vinculada a outra conta social.",
          409,
        );
      await link.update(
        { user_id: c.user.id, portal_version: tutor.conta.versao },
        { transaction },
      );
      await audit(c.user.id, "link_account", link.conta_id, {}, transaction);
    });
    return { ok: true };
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
      values.kind = b.pet_id ? "pet" : "tutor";
      if (values.kind === "tutor") values.tutor_owner = c.user.id;
      if (values.kind === "tutor" && c.profiles.some((p) => p.kind === "tutor"))
        throw fail("Sua conta já tem um perfil de tutor.", 409);
      if (b.pet_id) {
        const link = c.links.find(
          (x) => String(x.link.empresa_id) === String(b.company),
        );
        if (!link) throw fail("Pet indisponível.", 403);
        const pet = await ERP.Pet.findOne({
          where: {
            id: b.pet_id,
            empresa_id: link.link.empresa_id,
            cliente_id: link.account.cliente_id,
          },
        });
        if (!pet || pet.ativo === false) throw fail("Pet indisponível.", 403);
        values.pet_id = pet.id;
        values.source_company = link.link.empresa_id;
        values.species = text(b.species, 60);
        values.breed = text(b.breed, 80);
      }
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
        where: { state: { [Op.ne]: "active" } },
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
    return {
      b,
      hidden: hidden.map((p) => p.id),
      following: follows.map((x) => x.to_id),
      own: c.profiles.map((p) => p.id),
    };
  }
  function audience(c, s) {
    return {
      state: "active",
      ...(s.hidden?.length
        ? { [Op.and]: [{ profile_id: { [Op.notIn]: s.hidden } }] }
        : {}),
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
    const p = ownProfile(c, key(b.profile_id)),
      content = text(b.text, 3000),
      mediaIds = Array.isArray(b.media) ? [...new Set(b.media)] : [];
    if (mediaIds.length > 6 || (!content && !mediaIds.length))
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
    if (!file || file.buffer.length > 8 * 1024 * 1024)
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
      company = c.links[0].link.empresa_id;
    const saved = await media().salvar(Number(company), bytes, "community", {
      publico: false,
    });
    const row = await m.Media.create({
      id: uuid(),
      user_id: c.user.id,
      empresa_id: company,
      reference: saved.url,
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
    return media().ler(Number(row.empresa_id), row.reference);
  }
  async function remove(c, kind, id) {
    const model = kind === "post" ? m.Post : m.Comment,
      row = await model.findByPk(key(id));
    if (
      !row ||
      (row.user_id !== c.user.id && !["moderator"].includes(c.user.role))
    )
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
    if (!["post", "profile", "comment", "event"].includes(b.kind))
      throw fail("Tipo inválido.");
    const map = {
      post: m.Post,
      profile: m.Profile,
      comment: m.Comment,
      event: m.Event,
    };
    if (!(await map[b.kind].findByPk(key(b.target_id))))
      throw fail("Conteúdo indisponível.", 404);
    await m.Report.create({
      id: uuid(),
      user_id: c.user.id,
      kind: b.kind,
      target_id: b.target_id,
      reason: text(b.reason, 1000, true),
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
    return media().ler(Number(row.empresa_id), row.reference);
  }
  return {
    adminMedia,
    m,
    db,
    ERP,
    now,
    portal: getPortal,
    login,
    context,
    self,
    linkAccount,
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
