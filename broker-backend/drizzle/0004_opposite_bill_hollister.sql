CREATE INDEX IF NOT EXISTS "deliveries_product_id_idx" ON "deliveries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledgers_customer_recorded_idx" ON "ledgers" USING btree ("customer_id","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledgers_order_id_idx" ON "ledgers" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_delivery_id_idx" ON "orders" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");