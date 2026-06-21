CREATE TABLE "mfa_challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mfa_challenge_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "mfa_challenge" ADD CONSTRAINT "mfa_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_permission_role_id_idx" ON "role_permission" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_user_id_idx" ON "user_role" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");