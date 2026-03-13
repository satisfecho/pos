-- Fix reservation_date and reservation_time column types.
-- Some environments have these as timestamp; the app expects DATE and TIME.
ALTER TABLE reservation
  ALTER COLUMN reservation_date TYPE DATE USING reservation_date::date,
  ALTER COLUMN reservation_time TYPE TIME USING reservation_time::time;
