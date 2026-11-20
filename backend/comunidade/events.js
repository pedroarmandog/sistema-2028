"use strict";
module.exports = function events(s) {
  const { m, fail, text, key, uuid, now } = s;
  async function list(c, q = {}) {
    const { Op } = require("sequelize"),
      where = { state: "active", starts_at: { [Op.gte]: now() } };
    if (q.city)
      where.city = {
        [Op.like]: "%" + text(q.city, 100).replace(/[\\%_]/g, "\\$&") + "%",
      };
    const { b, hidden } = await s.scope(c);
    if (hidden.length) where.profile_id = { [Op.notIn]: hidden };
    if (b.length) where.user_id = { [Op.notIn]: b };
    const r = await s.page(m.Event, where, q),
      mine = await m.RSVP.findAll({ where: { user_id: c.user.id } });
    return {
      items: await Promise.all(
        r.rows.map(async (e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          city: e.city,
          place: e.place,
          startsAt: e.starts_at,
          own: e.user_id === c.user.id,
          attending: mine.some((r) => r.event_id === e.id),
          participants: await m.RSVP.count({ where: { event_id: e.id } }),
          organizer: await s.profile(c, e.profile_id),
        })),
      ),
      next: r.next,
    };
  }
  async function save(c, b, id) {
    if (!(await s.settings()).eventsEnabled)
      throw fail("A criação de eventos está pausada pela plataforma.", 403);
    let row;
    if (id) {
      row = await m.Event.findOne({
        where: { id: key(id), user_id: c.user.id },
      });
      if (!row) throw fail("Evento indisponível.", 404);
    }
    if (
      !id &&
      (await m.Event.count({
        where: { user_id: c.user.id, state: "active" },
      })) >= 10
    )
      throw fail("Limite de dez eventos ativos por conta.");
    const p = s.ownProfile(c, key(b.profile_id)),
      date = new Date(b.startsAt);
    if (
      !Number.isFinite(+date) ||
      date <= now() ||
      date > +now() + 366 * 86400000
    )
      throw fail("Escolha uma data futura dentro de um ano.");
    const values = {
      profile_id: p.id,
      title: text(b.title, 120, true),
      description: text(b.description, 2000, true),
      city: text(b.city, 100, true),
      place: text(b.place, 200, true),
      starts_at: date,
    };
    if (row) await row.update(values);
    else
      row = await m.Event.create({ id: uuid(), user_id: c.user.id, ...values });
    await s.audit(c.user.id, id ? "edit_event" : "create_event", row.id);
    return { id: row.id };
  }
  async function rsvp(c, id, on) {
    const { Op } = require("sequelize"),
      row = await m.Event.findOne({
        where: { id: key(id), state: "active", starts_at: { [Op.gt]: now() } },
      });
    if (
      !row ||
      (await s.scope(c)).b.includes(row.user_id) ||
      (await s.scope(c)).hidden.includes(row.profile_id)
    )
      throw fail("Evento indisponível.", 404);
    const where = { event_id: id, user_id: c.user.id };
    if (on) await m.RSVP.findOrCreate({ where, defaults: { id: uuid() } });
    else await m.RSVP.destroy({ where });
    return {
      attending: on,
      participants: await m.RSVP.count({ where: { event_id: id } }),
    };
  }
  async function cancel(c, id) {
    const row = await m.Event.findOne({
      where: { id: key(id), user_id: c.user.id },
    });
    if (!row) throw fail("Evento indisponível.", 404);
    await row.update({ state: "cancelled" });
    await s.audit(c.user.id, "cancel_event", row.id);
    const attendance = await m.RSVP.findAll({ where: { event_id: id } });
    for (const r of attendance) await s.notify(c, r.user_id, "event", id);
    return { ok: true };
  }
  return { list, save, rsvp, cancel };
};
