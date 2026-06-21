-- Security audit log table
CREATE TABLE "security_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "actor_id" uuid REFERENCES "user"(id) ON DELETE SET NULL,
  "actor_email" varchar(255),
  "action" varchar(50) NOT NULL,
  "resource_type" varchar(50),
  "resource_id" varchar(255),
  "target_user_id" uuid,
  "details" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "outcome" varchar(10) NOT NULL DEFAULT 'SUCCESS',
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "audit_log_action_idx" ON "security_audit_log"("action");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "security_audit_log"("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_user_id_idx" ON "security_audit_log"("target_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "security_audit_log"("created_at");
