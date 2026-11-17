CREATE TABLE IF NOT EXISTS billing_audit_log (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  actor_hash TEXT,
  plan TEXT CHECK (plan IS NULL OR plan IN ('starter', 'pro', 'team')),
  reference_id TEXT,
  status_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS billing_audit_log_created_at ON billing_audit_log(created_at);
CREATE INDEX IF NOT EXISTS billing_audit_log_request_id ON billing_audit_log(request_id);
