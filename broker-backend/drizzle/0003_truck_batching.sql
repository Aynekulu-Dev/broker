CREATE TYPE "public"."delivery_status" AS ENUM('COLLECTING', 'FULL', 'PAYMENT_REQUESTED', 'DISPATCHED');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'AWAITING_PAYMENT' BEFORE 'APPROVED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'PAYMENT_SUBMITTED' BEFORE 'APPROVED';--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "vehicle_plate_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "driver_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "driver_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "dispatched_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "dispatched_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_receipt_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "status" "delivery_status" DEFAULT 'COLLECTING' NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "filled_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "payment_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "batch_capacity" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
-- Backfill: every delivery row that existed before this migration was
-- created only at actual truck-dispatch time under the old code, so it
-- is historically DISPATCHED, not COLLECTING (the column's default,
-- which only applies to batches created going forward).
UPDATE "deliveries" SET "status" = 'DISPATCHED' WHERE "dispatched_at" IS NOT NULL;
