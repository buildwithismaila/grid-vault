-- Remove is_system column from role table
ALTER TABLE "role" DROP COLUMN IF EXISTS "is_system";--> statement-breakpoint

-- Change user.role from enum to varchar(100)
ALTER TABLE "user" ALTER COLUMN "role" TYPE varchar(100);--> statement-breakpoint

-- Drop old enum types
DROP TYPE IF EXISTS "system_role";--> statement-breakpoint
DROP TYPE IF EXISTS "role_enum";