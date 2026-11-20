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
  const User = def("Users", {
    id,
    state: { ...str(16), defaultValue: "active" },
    role: { ...str(16), defaultValue: "member" },
    can_events: { type: D.BOOLEAN, defaultValue: false },
    consent_at: D.DATE,
    policy_version: D.STRING(20),
  });
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
  const Media = def("Media", {
    id,
    user_id: uid,
    empresa_id: { type: D.BIGINT, allowNull: false },
    reference: str(300),
    mime: str(80),
    width: D.INTEGER,
    height: D.INTEGER,
    size: D.INTEGER,
  });
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
    },
    [idx("reports_queue", ["state", "createdAt"])],
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
  });
}
module.exports = { models };
