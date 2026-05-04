/*
  # Add DELETE policy for inventory_transactions

  Allows authenticated users to delete inventory transaction records.
*/

CREATE POLICY "Authenticated users can delete inventory transactions"
  ON inventory_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);