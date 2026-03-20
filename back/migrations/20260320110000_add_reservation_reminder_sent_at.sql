-- Track when 24h / 2h reminders were sent so we don't send twice (manual or heartbeat).
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMPTZ NULL;
