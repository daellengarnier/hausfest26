CREATE TABLE "activity_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"actorUserId" integer,
	"typ" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"refTyp" text NOT NULL,
	"refId" integer NOT NULL,
	"gelesen" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"commentId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "comment_mentions_commentId_userId_pk" PRIMARY KEY("commentId","userId")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"parentTyp" text NOT NULL,
	"parentId" integer NOT NULL,
	"autorUserId" integer,
	"text" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"datum" text NOT NULL,
	"startzeit" text DEFAULT '' NOT NULL,
	"endzeit" text
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"organisatorUserId" integer,
	"ressortId" integer,
	"status" text DEFAULT 'umfrage_laeuft' NOT NULL,
	"fixierterSlotId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"inhalt" text DEFAULT '' NOT NULL,
	"aktualisiertVon" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_meetingId_unique" UNIQUE("meetingId")
);
--> statement-breakpoint
CREATE TABLE "ressort_leads" (
	"ressortId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "ressort_leads_ressortId_userId_pk" PRIMARY KEY("ressortId","userId")
);
--> statement-breakpoint
CREATE TABLE "ressorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"farbe" text DEFAULT '#6366f1' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slotId" integer NOT NULL,
	"userId" integer NOT NULL,
	"verfuegbarkeit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_ressorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"name" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_assignees" (
	"todoId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "todo_assignees_todoId_userId_pk" PRIMARY KEY("todoId","userId")
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"subRessortId" integer,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"fristDatum" text,
	"erstelltVon" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"rolle" text DEFAULT 'mitglied' NOT NULL,
	"avatarColor" text DEFAULT '#64748b' NOT NULL,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_commentId_comments_id_fk" FOREIGN KEY ("commentId") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_autorUserId_users_id_fk" FOREIGN KEY ("autorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organisatorUserId_users_id_fk" FOREIGN KEY ("organisatorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_aktualisiertVon_users_id_fk" FOREIGN KEY ("aktualisiertVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressort_leads" ADD CONSTRAINT "ressort_leads_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressort_leads" ADD CONSTRAINT "ressort_leads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_votes" ADD CONSTRAINT "slot_votes_slotId_meeting_slots_id_fk" FOREIGN KEY ("slotId") REFERENCES "public"."meeting_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_votes" ADD CONSTRAINT "slot_votes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_ressorts" ADD CONSTRAINT "sub_ressorts_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_todoId_todos_id_fk" FOREIGN KEY ("todoId") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_subRessortId_sub_ressorts_id_fk" FOREIGN KEY ("subRessortId") REFERENCES "public"."sub_ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_erstelltVon_users_id_fk" FOREIGN KEY ("erstelltVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_user" ON "activity_items" USING btree ("userId","gelesen");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parentTyp","parentId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_slot_user" ON "slot_votes" USING btree ("slotId","userId");