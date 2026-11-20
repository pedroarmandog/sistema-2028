"use strict";
module.exports = (s) => {
  const { m, fail, key, text, uuid } = s,
    { Op } = require("sequelize");
  async function list(c, q = {}) {
    const scope = await s.scope(c),
      where = {
        state: "active",
        ...(scope.b.length ? { user_id: { [Op.notIn]: scope.b } } : {}),
      };
    if (q.q)
      where.name = {
        [Op.like]: "%" + text(q.q, 100).replace(/[\\%_]/g, "\\$&") + "%",
      };
    const r = await s.page(m.Group, where, q);
    return {
      items: await Promise.all(
        r.rows.map(async (g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category,
          own: g.user_id === c.user.id,
          members: await m.Member.count({ where: { group_id: g.id } }),
          joined: !!(await m.Member.count({
            where: { group_id: g.id, user_id: c.user.id },
          })),
        })),
      ),
      next: r.next,
    };
  }
  async function create(c, b) {
    if (!(await s.settings()).groupsEnabled)
      throw fail("Criação de comunidades pausada.", 403);
    if (
      (await m.Group.count({
        where: { user_id: c.user.id, state: "active" },
      })) >= 5
    )
      throw fail("Limite de cinco comunidades por conta.");
    const row = await m.Group.create({
      id: uuid(),
      user_id: c.user.id,
      name: text(b.name, 100, true),
      description: text(b.description, 1500, true),
      category: text(b.category, 80),
    });
    await m.Member.create({ id: uuid(), user_id: c.user.id, group_id: row.id });
    return { id: row.id };
  }
  async function join(c, id, on) {
    const row = await m.Group.findOne({
      where: { id: key(id), state: "active" },
    });
    if (!row || (await s.scope(c)).b.includes(row.user_id))
      throw fail("Comunidade indisponível.", 404);
    const where = { user_id: c.user.id, group_id: row.id };
    if (on) await m.Member.findOrCreate({ where, defaults: { id: uuid() } });
    else {
      if (row.user_id === c.user.id)
        throw fail("O responsável deve permanecer na comunidade.");
      await m.Member.destroy({ where });
    }
    return { ok: true };
  }
  return { list, create, join };
};
