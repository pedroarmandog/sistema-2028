"use strict";
const { DataTypes: D } = require("sequelize");
function models(db) {
  if (db.__community) return db.__community;
  const id = { type: D.STRING(36), primaryKey: true },
    str = (n) => ({ type: D.STRING(n), allowNull: false }),
    uid = { type: D.STRING(36), allowNull: false };
  const idx = (name, fields, unique = false) => ({
    name: "cm_" + name,
    fields,
    unique,
  });
  const def = (name, fields, indexes = []) =>
    db.models["Community" + name] ||
    db.define(
      "Community" + name,
      Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          key,
          value && typeof value === "object" && !value.key
            ? { ...value }
            : value,
        ]),
      ),
      { tableName: "community_" + name.toLowerCase(), indexes },
    );
  const User = def(
    "Users",
    {
      id,
      state: { ...str(16), defaultValue: "active" },
      role: { ...str(16), defaultValue: "member" },
      can_events: { type: D.BOOLEAN, defaultValue: false },
      consent_at: D.DATE,
      policy_version: D.STRING(20),
      email: { type: D.STRING(254), allowNull: true, unique: true },
      password_hash: D.STRING(100),
      verified_at: D.DATE,
      auth_version: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      last_active_at: D.DATE,
      onboarded_at: D.DATE,
      suspended_until: D.DATE,
    },
    [
      idx("user_state", ["state", "verified_at"]),
      idx("user_active", ["last_active_at"]),
      idx("user_created", ["createdAt", "id"]),
    ],
  );
  const Company = def("Companies", {
    empresa_id: { type: D.BIGINT, primaryKey: true },
    enabled: { type: D.BOOLEAN, defaultValue: false },
  });
  const Link = def(
    "Links",
    {
      conta_id: { type: D.STRING(36), primaryKey: true },
      user_id: D.STRING(36),
      empresa_id: { type: D.BIGINT, allowNull: false },
      enabled: { type: D.BOOLEAN, defaultValue: false },
      portal_version: D.INTEGER,
    },
    [idx("link_user", ["user_id"]), idx("link_company", ["empresa_id"])],
  );
  const Session = def(
    "Sessions",
    {
      id: { type: D.STRING(64), primaryKey: true },
      user_id: uid,
      expires_at: { type: D.DATE, allowNull: false },
      auth_version: D.INTEGER,
    },
    [idx("session_user", ["user_id"])],
  );
  const Profile = def(
    "Profiles",
    {
      id,
      user_id: uid,
      kind: { ...str(12), defaultValue: "tutor" },
      tutor_owner: { type: D.STRING(36), unique: true },
      handle: { ...str(30), unique: true },
      name: str(80),
      bio: D.STRING(500),
      city: D.STRING(100),
      species: D.STRING(60),
      breed: D.STRING(80),
      interests: D.STRING(200),
      avatar_id: D.STRING(36),
      cover_id: D.STRING(36),
      pet_id: D.BIGINT,
      source_company: D.BIGINT,
      state: { ...str(16), defaultValue: "active" },
    },
    [
      idx("profile_owner", ["user_id", "state"]),
      idx("profile_pet", ["source_company", "pet_id"], true),
    ],
  );
  const Media = def(
    "Media",
    {
      id,
      user_id: uid,
      empresa_id: { type: D.BIGINT, allowNull: true },
      reference: str(300),
      mime: str(80),
      width: D.INTEGER,
      height: D.INTEGER,
      size: D.INTEGER,
    },
    [idx("media_time", ["user_id", "createdAt"])],
  );
  const Post = def(
    "Posts",
    {
      id,
      profile_id: uid,
      user_id: uid,
      kind: { ...str(12), defaultValue: "post" },
      text: { type: D.TEXT, allowNull: false },
      visibility: { ...str(16), defaultValue: "publico" },
      state: { ...str(16), defaultValue: "active" },
      expires_at: D.DATE,
      color: D.STRING(7),
      idempotency: str(64),
      group_id: D.STRING(36),
    },
    [
      idx("post_page", ["kind", "state", "createdAt", "id"]),
      idx("post_profile", ["profile_id", "state", "createdAt"]),
      idx("post_retry", ["user_id", "idempotency"], true),
    ],
  );
  const PostMedia = def(
    "Postmedia",
    { id, post_id: uid, media_id: uid, position: D.INTEGER },
    [idx("post_media", ["post_id", "media_id"], true)],
  );
  const Like = def("Likes", { id, user_id: uid, post_id: uid }, [
    idx("like_once", ["user_id", "post_id"], true),
    idx("like_post", ["post_id"]),
  ]);
  const Save = def("Saves", { id, user_id: uid, post_id: uid }, [
    idx("save_once", ["user_id", "post_id"], true),
  ]);
  const Comment = def(
    "Comments",
    {
      id,
      user_id: uid,
      profile_id: uid,
      post_id: uid,
      parent_id: D.STRING(36),
      text: str(1000),
      state: { ...str(16), defaultValue: "active" },
    },
    [idx("comments_post", ["post_id", "createdAt", "id"])],
  );
  const CommentLike = def(
    "Commentlikes",
    { id, user_id: uid, comment_id: uid },
    [idx("comment_like", ["user_id", "comment_id"], true)],
  );
  const Follow = def("Follows", { id, from_id: uid, to_id: uid }, [
    idx("follow_once", ["from_id", "to_id"], true),
    idx("follow_target", ["to_id"]),
  ]);
  const View = def("Views", { id, user_id: uid, post_id: uid }, [
    idx("view_once", ["user_id", "post_id"], true),
  ]);
  const Notification = def(
    "Notifications",
    {
      id,
      user_id: uid,
      actor_id: uid,
      kind: str(20),
      target_id: uid,
      read: { type: D.BOOLEAN, defaultValue: false },
    },
    [idx("notifications_page", ["user_id", "createdAt", "id"])],
  );
  const Block = def("Blocks", { id, from_user: uid, to_user: uid }, [
    idx("block_once", ["from_user", "to_user"], true),
    idx("block_target", ["to_user"]),
  ]);
  const Report = def(
    "Reports",
    {
      id,
      user_id: uid,
      kind: str(20),
      target_id: uid,
      reason: str(1000),
      state: { ...str(16), defaultValue: "open" },
      priority: { type: D.STRING(12), defaultValue: "normal" },
      snapshot: D.JSON,
      target_user: D.STRING(36),
      decision: D.STRING(1000),
      reviewed_by: D.STRING(80),
      reviewed_at: D.DATE,
    },
    [
      idx("reports_queue", ["state", "createdAt"]),
      idx("report_user", ["target_user"]),
    ],
  );
  const Audit = def("Audit", {
    id,
    actor_id: str(80),
    action: str(60),
    target_id: str(80),
    details: D.JSON,
  });
  const Event = def(
    "Events",
    {
      id,
      user_id: uid,
      profile_id: uid,
      title: str(120),
      description: str(2000),
      city: str(100),
      place: str(200),
      starts_at: { type: D.DATE, allowNull: false },
      media_id: D.STRING(36),
      state: { ...str(16), defaultValue: "active" },
    },
    [idx("events_city", ["state", "city", "starts_at"])],
  );
  const RSVP = def("Rsvp", { id, user_id: uid, event_id: uid }, [
    idx("rsvp_once", ["user_id", "event_id"], true),
  ]);
  const Privacy = def("Privacy", {
    id,
    user_id: uid,
    kind: str(20),
    state: { ...str(16), defaultValue: "pending" },
  });
  const Challenge = def(
    "Challenges",
    {
      id: { type: D.STRING(64), primaryKey: true },
      user_id: uid,
      kind: str(16),
      expires_at: { type: D.DATE, allowNull: false },
      used_at: D.DATE,
    },
    [idx("challenge_user", ["user_id", "kind"])],
  );
  const AuthLimit = def("Authlimits", {
    id: { type: D.STRING(64), primaryKey: true },
    attempts: { type: D.INTEGER, defaultValue: 0 },
    expires_at: D.DATE,
  });
  const Mail = def(
    "Mail",
    {
      id,
      user_id: uid,
      kind: str(16),
      state: str(16),
      provider_id: D.STRING(100),
    },
    [idx("mail_user", ["user_id", "createdAt"])],
  );
  const Activity = def(
    "Activity",
    { id, user_id: uid, day: { type: D.DATEONLY, allowNull: false } },
    [
      idx("activity_day", ["user_id", "day"], true),
      idx("activity_date", ["day"]),
    ],
  );
  const Group = def(
    "Groups",
    {
      id,
      user_id: uid,
      name: str(100),
      description: str(1500),
      category: D.STRING(80),
      state: { ...str(16), defaultValue: "active" },
    },
    [idx("group_page", ["state", "createdAt", "id"])],
  );
  const Member = def("Members", { id, user_id: uid, group_id: uid }, [
    idx("member_once", ["user_id", "group_id"], true),
  ]);
  const Sanction = def(
    "Sanctions",
    {
      id,
      user_id: uid,
      admin_id: str(80),
      action: str(30),
      reason: str(1000),
      until: D.DATE,
      report_id: D.STRING(36),
    },
    [idx("sanction_user", ["user_id", "createdAt"])],
  );
  const AdminSession = def("Adminsessions", {
    id: { type: D.STRING(64), primaryKey: true },
    admin_id: { type: D.STRING(80), allowNull: false },
    expires_at: { type: D.DATE, allowNull: false },
  });
  const Setting = def("Settings", {
    id: { type: D.STRING(40), primaryKey: true },
    value: D.JSON,
  });
  for (const [model, name] of [
    [Like, "like"],
    [Comment, "comment"],
    [Follow, "follow"],
    [RSVP, "rsvp"],
    [Member, "member"],
    [Group, "group"],
  ]) {
    const index = idx("metric_" + name, ["createdAt"]);
    if (!model.options.indexes.some((i) => i.name === index.name))
      model.options.indexes.push(index);
  }
  // References only target the isolated social schema; ERP links are verified by the service.
  const fk = (model, field, target, key = "id") => {
    model.rawAttributes[field].references = {
      model: target.getTableName(),
      key,
    };
    model.rawAttributes[field].onDelete = "RESTRICT";
    model.rawAttributes[field].onUpdate = "CASCADE";
    model.refreshAttributes();
  };
  for (const model of [
    Session,
    Profile,
    Media,
    Post,
    Like,
    Save,
    Comment,
    View,
    Notification,
    Report,
    Event,
    RSVP,
    Privacy,
    Challenge,
    Mail,
    Activity,
    Group,
    Member,
    Sanction,
  ])
    fk(model, "user_id", User);
  fk(Link, "user_id", User);
  fk(Link, "empresa_id", Company, "empresa_id");
  for (const model of [Post, Comment, Event]) fk(model, "profile_id", Profile);
  for (const model of [PostMedia, Like, Save, Comment, View])
    fk(model, "post_id", Post);
  fk(PostMedia, "media_id", Media);
  fk(CommentLike, "user_id", User);
  fk(CommentLike, "comment_id", Comment);
  fk(Comment, "parent_id", Comment);
  fk(Follow, "from_id", Profile);
  fk(Follow, "to_id", Profile);
  fk(Block, "from_user", User);
  fk(Block, "to_user", User);
  fk(RSVP, "event_id", Event);
  fk(Member, "group_id", Group);
  return (db.__community = {
    User,
    Company,
    Link,
    Session,
    Profile,
    Media,
    Post,
    PostMedia,
    Like,
    Save,
    Comment,
    CommentLike,
    Follow,
    View,
    Notification,
    Block,
    Report,
    Audit,
    Event,
    RSVP,
    Privacy,
    Challenge,
    AuthLimit,
    Mail,
    Activity,
    Group,
    Member,
    Sanction,
    Setting,
    AdminSession,
  });
}
module.exports = { models };
