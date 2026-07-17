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
  // Optionales Profilbild (Attachment). Ohne = Initialen auf Farbe.
  avatarAttachmentId: integer("avatarAttachmentId"),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // false = vorbelegtes Profil (Platzhalter), das noch niemand übernommen hat.
  claimed: boolean("claimed").notNull().default(true),
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
  // Ressort Finanzen bekommt eine Ausgaben-/Belegverwaltung.
  hatFinanzen: boolean("hatFinanzen").notNull().default(false),
  // Ressort Acts verwaltet Bands/DJs (Rider, Kosten, Übernachtung, Promo).
  hatActs: boolean("hatActs").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Datei-Uploads (Belege, Rider …) – klein gehalten, base64 in der DB.
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  dataB64: text("dataB64").notNull(),
  uploadedBy: integer("uploadedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Ausgaben/Belege. Betrag in Rappen (Integer) gegen Rundungsfehler.
// userId = wer ausgelegt hat (der/die es dem eigenen Konto zuschreibt).
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  betragCents: integer("betragCents").notNull(),
  waehrung: text("waehrung").notNull().default("CHF"),
  kategorie: text("kategorie").notNull().default("Sonstiges"),
  beschreibung: text("beschreibung").notNull().default(""),
  datum: text("datum"), // 'YYYY-MM-DD'
  belegId: integer("belegId").references(() => attachments.id, { onDelete: "set null" }),
  // Automatisch aus einem Act gepflegte Ausgabe (Gage) – hält Acts & Finanzen synchron.
  actId: integer("actId").references(() => acts.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Web-Push-Abos (ein Eintrag pro Gerät/Browser einer Person).
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Einfache Key-Value-Einstellungen (z. B. Defizitgarantie, separat vom Budget).
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// Budget (Plan) je Kostenstelle – ein Zielbetrag pro Kategorie.
// Gesamtbudget = Summe über alle Kostenstellen.
export const categoryBudgets = pgTable("category_budgets", {
  kategorie: text("kategorie").primaryKey(),
  betragCents: integer("betragCents").notNull().default(0),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// Veraltet: früher Budgetposten (Plan). Bleibt als leere Tabelle bestehen,
// Budget läuft jetzt über category_budgets; Gagen sind Ausgaben (expenses.actId).
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  kategorie: text("kategorie").notNull().default("Sonstiges"),
  titel: text("titel").notNull().default(""),
  betragCents: integer("betragCents").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  createdBy: integer("createdBy").references(() => users.id, { onDelete: "set null" }),
  actId: integer("actId").references(() => acts.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Acts (Bands/DJs). Zentrale „Ordner" mit allen Infos & Dateien pro Act.
// Optional mit einem Line-up-Eintrag verknüpft (schedule_entries.actId).
export const acts = pgTable("acts", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  typ: text("typ").notNull().default("band"), // 'band' | 'dj' | 'andere'
  kostenCents: integer("kostenCents"), // Gage – fließt in Finanzen (Posten „Gagen")
  uebernachtung: boolean("uebernachtung").notNull().default(false),
  anzahlPersonen: integer("anzahlPersonen"),
  promotext: text("promotext").notNull().default(""),
  notiz: text("notiz").notNull().default(""),
  createdBy: integer("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Dateien eines Acts, gruppiert nach Rubrik (Techrider, Hospitality, Weitere).
export const actFiles = pgTable("act_files", {
  id: serial("id").primaryKey(),
  actId: integer("actId")
    .notNull()
    .references(() => acts.id, { onDelete: "cascade" }),
  attachmentId: integer("attachmentId")
    .notNull()
    .references(() => attachments.id, { onDelete: "cascade" }),
  rubrik: text("rubrik").notNull().default("sonstiges"), // 'techrider' | 'hospitality' | 'sonstiges'
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

// Einkaufsartikel je Ressort/Sub-Ressort (gemeinsame Einkaufsliste).
export const shoppingItems = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  subRessortId: integer("subRessortId").references(() => subRessorts.id, { onDelete: "set null" }),
  titel: text("titel").notNull(),
  menge: text("menge").notNull().default(""),
  erledigt: boolean("erledigt").notNull().default(false),
  createdBy: integer("createdBy").references(() => users.id, { onDelete: "set null" }),
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

// Ein Zeitplan-Ressort kann mehrere „Boards" haben – dieselbe Timeline-Optik,
// aber getrennte Inhalte: 'programm' (Acts) und 'bars' (Öffnungszeiten).
export type BoardKind = "programm" | "bars";

// Spalten eines Boards (Floors bzw. Bars). Vordefiniert + manuell erweiterbar,
// jeweils mit eigener Farbe und Sortier-Reihenfolge.
export const scheduleFloors = pgTable(
  "schedule_floors",
  {
    id: serial("id").primaryKey(),
    ressortId: integer("ressortId")
      .notNull()
      .references(() => ressorts.id, { onDelete: "cascade" }),
    board: text("board").$type<BoardKind>().notNull().default("programm"),
    name: text("name").notNull(),
    farbe: text("farbe").notNull().default("#6366f1"),
    reihenfolge: integer("reihenfolge").notNull().default(0),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_floor_ressort_board_name").on(t.ressortId, t.board, t.name)],
);

// Einträge eines Boards (Acts bzw. Öffnungszeiten). Zeiten als Minuten seit
// Startzeit 16:00 (0) bis 08:00 des Folgetags (960) – umgeht Mitternachts-Fallen.
export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  board: text("board").$type<BoardKind>().notNull().default("programm"),
  floor: text("floor").notNull().default(""),
  titel: text("titel").notNull().default(""),
  startMin: integer("startMin").notNull(),
  endMin: integer("endMin").notNull(),
  // Zusatzinfos für Acts/Programmpunkte (alles optional).
  notiz: text("notiz").notNull().default(""),
  anzahlLeute: integer("anzahlLeute"),
  gageCents: integer("gageCents"),
  // Verknüpfung zum Act-„Ordner" (Rider, Kosten …) im Acts-Ressort.
  actId: integer("actId").references(() => acts.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// Dateien (Techrider, Hospitality …) zu einem Zeitplan-Eintrag.
export const scheduleEntryFiles = pgTable(
  "schedule_entry_files",
  {
    entryId: integer("entryId")
      .notNull()
      .references(() => scheduleEntries.id, { onDelete: "cascade" }),
    attachmentId: integer("attachmentId")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.attachmentId] })],
);

// Zeitfenster-Marker: dezentes Band über die volle Breite (alle Floors),
// z. B. „Nachtessen 18:00–20:00". Rein informativ, schwächer als Einträge.
export const scheduleMarkers = pgTable("schedule_markers", {
  id: serial("id").primaryKey(),
  ressortId: integer("ressortId")
    .notNull()
    .references(() => ressorts.id, { onDelete: "cascade" }),
  board: text("board").$type<BoardKind>().notNull().default("programm"),
  titel: text("titel").notNull().default(""),
  startMin: integer("startMin").notNull(),
  endMin: integer("endMin").notNull(),
  farbe: text("farbe").notNull().default("#f59e0b"),
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
