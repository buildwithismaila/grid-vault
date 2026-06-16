ALTER TYPE "public"."role_enum" RENAME TO "system_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Viewer'::text;--> statement-breakpoint
DROP TYPE "public"."system_role";--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('Superadmin', 'Admin', 'HQ Asset Manager', 'Regional Technical Manager', 'Technical Manager', 'Service Centre Technician', 'Finance Officer', 'Stores Officer', 'Auditor', 'Viewer');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'Viewer'::"public"."system_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."system_role" USING "role"::"public"."system_role";--> statement-breakpoint
ALTER TABLE "auth" ADD COLUMN "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "auth" ADD COLUMN "mfa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "auth" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;