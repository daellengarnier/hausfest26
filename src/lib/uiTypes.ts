// Reine TypeScript-Typen für die Client-UI (ohne Server-/Drizzle-Importe).
export type Rolle = "admin" | "mitglied";
export type TodoStatus = "offen" | "in_arbeit" | "erledigt";
export type Verfuegbarkeit = "ja" | "vielleicht" | "nein";
export type MeetingStatus = "umfrage_laeuft" | "terminFixiert" | "erledigt";
export type ActivityTyp = "mention" | "zuweisung" | "neuer_kommentar" | "sitzung";

export interface User {
  id: number;
  name: string;
  email: string;
  rolle: Rolle;
  avatarColor: string;
  avatarAttachmentId: number | null;
  mustChangePassword: boolean;
}

export interface UserLite {
  id: number;
  name: string;
  avatarColor: string;
  email?: string;
}

export interface RessortSummary {
  id: number;
  name: string;
  beschreibung: string;
  farbe: string;
  reihenfolge: number;
  hatZeitplan?: boolean;
  hatActs?: boolean;
  hatFinanzen?: boolean;
  leads: UserLite[];
  openTodos: number;
  totalTodos: number;
  nextMeeting: { id: number; titel: string; datum: string; startzeit: string } | null;
  lastActivity: string | null;
}

export interface Ressort {
  id: number;
  name: string;
  beschreibung: string;
  farbe: string;
  hatZeitplan?: boolean;
  hatFinanzen?: boolean;
  hatActs?: boolean;
  leads: UserLite[];
}

export interface Attachment {
  id: number;
  filename: string;
  mime: string;
  size: number;
}

export interface Expense {
  id: number;
  betragCents: number;
  waehrung: string;
  kategorie: string;
  beschreibung: string;
  datum: string | null;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userColor: string | null;
  actId: number | null;
  belegId: number | null;
  belegMime: string | null;
  belegFilename: string | null;
}

export interface CategoryBudget {
  kategorie: string;
  betragCents: number;
}

export interface ShoppingItem {
  id: number;
  ressortId: number;
  subRessortId: number | null;
  titel: string;
  menge: string;
  erledigt: boolean;
}

export interface ShoppingGroup {
  id: number;
  name: string;
  farbe: string;
  subRessorts: { id: number; name: string }[];
  items: ShoppingItem[];
}

export type ActRubrik = "techrider" | "hospitality" | "sonstiges";

export interface ActFile {
  id: number;
  attachmentId: number;
  filename: string;
  mime: string;
  size: number;
  rubrik: ActRubrik;
}

export interface Act {
  id: number;
  name: string;
  typ: "band" | "dj" | "andere";
  kostenCents: number | null;
  uebernachtung: boolean;
  anzahlPersonen: number | null;
  promotext: string;
  notiz: string;
  getIn: string;
  soundcheck: string;
  createdAt: string;
  createdByName: string | null;
  files: ActFile[];
  slot: { entryId: number; floor: string; startMin: number; endMin: number } | null;
}

export type BoardKind = "programm" | "bars";

export interface ScheduleFloor {
  id: number;
  ressortId: number;
  board?: BoardKind;
  name: string;
  farbe: string;
  reihenfolge: number;
}

export interface ScheduleEntry {
  id: number;
  ressortId: number;
  board?: BoardKind;
  floor: string;
  titel: string;
  startMin: number; // Minuten seit 16:00
  endMin: number;
  notiz?: string;
  anzahlLeute?: number | null;
  gageCents?: number | null;
  actId?: number | null;
  files?: Attachment[];
}

export interface ScheduleMarker {
  id: number;
  ressortId: number;
  board?: BoardKind;
  titel: string;
  startMin: number;
  endMin: number;
  farbe: string;
}

export interface SubRessort {
  id: number;
  ressortId: number;
  name: string;
  beschreibung: string;
  reihenfolge: number;
}

export interface Todo {
  id: number;
  ressortId: number;
  subRessortId: number | null;
  titel: string;
  beschreibung: string;
  status: TodoStatus;
  fristDatum: string | null;
  erstelltVon: number | null;
  createdAt: string;
  updatedAt: string;
  assignees: UserLite[];
  commentCount?: number;
  ressort?: { id: number; name: string; farbe: string };
  subRessort?: { id: number; name: string } | null;
  ressortName?: string;
  ressortFarbe?: string;
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
  autorUserId: number | null;
  autorName: string | null;
  autorColor: string | null;
  mentions: { id: number; name: string }[];
}

export interface ProtocolRef {
  id: number;
  meetingId: number;
  titel: string;
  updatedAt: string;
}

export interface MeetingListItem {
  id: number;
  titel: string;
  status: MeetingStatus;
  ressortId: number | null;
  ressortName: string | null;
  ressortFarbe: string | null;
  organisatorName: string | null;
  fixierterSlotId: number | null;
  fixDatum: string | null;
  fixStartzeit: string | null;
}

export interface SlotVote {
  userId: number;
  name: string;
  avatarColor: string;
  verfuegbarkeit: Verfuegbarkeit;
}

export interface MeetingSlot {
  id: number;
  meetingId: number;
  datum: string;
  startzeit: string;
  endzeit: string | null;
  votes: SlotVote[];
  tally: { ja: number; vielleicht: number; nein: number };
}

export interface MeetingDetail {
  meeting: {
    id: number;
    titel: string;
    beschreibung: string;
    organisatorUserId: number | null;
    organisatorName: string | null;
    ressortId: number | null;
    ressortName: string | null;
    ressortFarbe: string | null;
    status: MeetingStatus;
    fixierterSlotId: number | null;
    createdAt: string;
  };
  slots: MeetingSlot[];
  protocol: { id: number; meetingId: number; inhalt: string; updatedAt: string } | null;
}

export interface ActivityItem {
  id: number;
  typ: ActivityTyp;
  text: string;
  refTyp: string;
  refId: number;
  gelesen: boolean;
  createdAt: string;
  actorName: string | null;
  actorColor: string | null;
}
