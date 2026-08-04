/*
# Add previous_order_status column to deliveries

1. Modified Tables
- `deliveries`
  - Added `previous_order_status` (text, nullable) — stores the order's status
    before it was changed to "Доставляется" when a delivery is scheduled.
    Used to restore the original status if the delivery is deleted.

2. Security
- No RLS or policy changes. Existing deliveries policies remain unchanged.

3. Important Notes
- The column is nullable so existing deliveries rows are unaffected.
- On delete of a delivery, the app reads this column and restores the order's
  status to the saved value (instead of leaving it stuck at "Доставляется").
*/

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS previous_order_status text;
