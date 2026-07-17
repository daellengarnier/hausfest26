CREATE TABLE "schedule_entry_files" (
	"entryId" integer NOT NULL,
	"attachmentId" integer NOT NULL,
	CONSTRAINT "schedule_entry_files_entryId_attachmentId_pk" PRIMARY KEY("entryId","attachmentId")
);
--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "notiz" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "anzahlLeute" integer;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "gageCents" integer;--> statement-breakpoint
ALTER TABLE "schedule_entry_files" ADD CONSTRAINT "schedule_entry_files_entryId_schedule_entries_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."schedule_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entry_files" ADD CONSTRAINT "schedule_entry_files_attachmentId_attachments_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;