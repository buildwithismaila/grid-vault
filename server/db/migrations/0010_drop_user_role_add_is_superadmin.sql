-- Drop user.role column, add is_superadmin boolean
ALTER TABLE "user" ADD COLUMN "is_superadmin" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
DROP INDEX IF EXISTS "user_role_idx";
