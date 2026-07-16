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
  leads: UserLite[];
}

export interface ScheduleEntry {
  id: number;
  ressortId: number;
  floor: string;
  titel: string;
  startMin: number; // Minuten seit 16:00
  endMin: number;
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
