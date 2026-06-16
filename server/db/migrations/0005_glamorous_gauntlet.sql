ALTER TABLE "role_permission" DROP CONSTRAINT "role_permission_role_id_permission_id_unique";--> statement-breakpoint
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_user_id_role_id_unique";--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_permissionId_unique" UNIQUE("role_id","permission_id");--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_userId_roleId_unique" UNIQUE("user_id","role_id");