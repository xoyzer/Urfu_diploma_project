CREATE TABLE IF NOT EXISTS order_delivery_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL DEFAULT 'манипулятор 5т',
  trip_count integer NOT NULL DEFAULT 1,
  cost_per_trip numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(10,2) GENERATED ALWAYS AS (trip_count * cost_per_trip) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_delivery_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_order_delivery_trips" ON order_delivery_trips FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_order_delivery_trips" ON order_delivery_trips FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update_order_delivery_trips" ON order_delivery_trips FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "delete_order_delivery_trips" ON order_delivery_trips FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);