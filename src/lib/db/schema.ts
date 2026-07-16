// Drizzle-Schema (Postgres) für die Hausfest-Orga.
// Einheitliche Hierarchie: Ressort → (optional) Sub-Ressort → Todo → Diskussion.
// Dazu Sitzungen (Doodle + Protokoll) und eine In-App-Inbox.
//
// Nach Änderungen: `npm run db:generate` → neue Migration in ./drizzle.
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export type Rolle = "admin" | "mitglied";
export type TodoStatus = "offen" | "in_arbeit" | "erledigt";
export type Verfuegbarkeit = "ja" | "vielleicht" | "nein";
export type MeetingStatus = "umfrage_laeuft" | "terminFixiert" | "erledigt";
export type ActivityTyp = "mention" | "zuweisung" | "neuer_kommentar" | "sitzung";
export type ParentTyp = "todo" | "ressort";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  rolle: text("rolle").$type<Rolle>().notNull().default("mitglied"),
  avatarColor: text("avatarColor").notNull().default("#64748b"),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
});

export const ressorts = pgTable("ressorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  farbe: text("farbe").notNull().default("#6366f1"),
  reihenfolge: integer("reihenfolge").notNull().default(0),
  // Ressorts mit Zeitplan (z. B. Programm) zeigen einen zusätzlichen Timeline-Tab.
  hatZeitplan: boolean("hatZeitplan").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const ressortLeads = pgTable(
  "ressort_leads",
  {
    ressortId: integer("ressortId")
      .notNull()
      .references(() => ressorts.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ressortId, t.userId] })],
);

export const subRessorts = pgTable("sub_ressorts", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  reihenfolge: integer("reihenfolge").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  subRessortId: integer("subRessortId").references(() => subRessorts.id, {
    onDelete: "set null",
  }),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  status: text("status").$type<TodoStatus>().notNull().default("offen"),
  fristDatum: text("fristDatum"), // 'YYYY-MM-DD' oder null
  erstelltVon: integer("erstelltVon").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const todoAssignees = pgTable(
  "todo_assignees",
  {
    todoId: integer("todoId")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.todoId, t.userId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    parentTyp: text("parentTyp").$type<ParentTyp>().notNull(),
    parentId: integer("parentId").notNull(),
    autorUserId: integer("autorUserId").references(() => users.id, { onDelete: "set null" }),
    text: text("text").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_comments_parent").on(t.parentTyp, t.parentId)],
);

export const commentMentions = pgTable(
  "comment_mentions",
  {
    commentId: integer("commentId")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  organisatorUserId: integer("organisatorUserId").references(() => users.id, {
    onDelete: "set null",
  }),
  ressortId: integer("ressortId").references(() => ressorts.id, { onDelete: "set null" }),
  status: text("status").$type<MeetingStatus>().notNull().default("umfrage_laeuft"),
  fixierterSlotId: integer("fixierterSlotId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingSlots = pgTable("meeting_slots", {
  id: serial("id").primaryKey(),
  meetingId: integer("meetingId")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  datum: text("datum").notNull(), // 'YYYY-MM-DD'
  startzeit: text("startzeit").notNull().default(""),
  endzeit: text("endzeit"),
});

export const slotVotes = pgTable(
  "slot_votes",
  {
    id: serial("id").primaryKey(),
    slotId: integer("slotId")
      .notNull()
      .references(() => meetingSlots.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verfuegbarkeit: text("verfuegbarkeit").$type<Verfuegbarkeit>().notNull(),
  },
  (t) => [uniqueIndex("uq_slot_user").on(t.slotId, t.userId)],
);

export const protocols = pgTable("protocols", {
  id: serial("id").primaryKey(),
  meetingId: integer("meetingId")
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: "cascade" }),
  inhalt: text("inhalt").notNull().default(""),
  aktualisiertVon: integer("aktualisiertVon").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// Zeitplan-Einträge (Programm-Floors über die Nacht). Zeiten als Minuten seit
// Startzeit 16:00 (0) bis 08:00 des Folgetags (960) – umgeht Mitternachts-Fallen.
export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  floor: text("floor").notNull().default(""),
  titel: text("titel").notNull(),
  startMin: integer("startMin").notNull(),
  endMin: integer("endMin").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const activityItems = pgTable(
  "activity_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: integer("actorUserId").references(() => users.id, { onDelete: "set null" }),
    typ: text("typ").$type<ActivityTyp>().notNull(),
    text: text("text").notNull().default(""),
    refTyp: text("refTyp").notNull(),
    refId: integer("refId").notNull(),
    gelesen: boolean("gelesen").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_activity_user").on(t.userId, t.gelesen)],
);
