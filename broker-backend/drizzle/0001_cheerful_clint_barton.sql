ALTER TABLE "users" ADD COLUMN "access_code_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_access_code_hash_unique" UNIQUE("access_code_hash");