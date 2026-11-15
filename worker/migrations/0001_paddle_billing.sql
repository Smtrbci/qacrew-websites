CREATE TABLE IF NOT EXISTS paddle_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forge_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'team')),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  transaction_id TEXT,
  occurred_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS forge_subscriptions_user_status ON forge_subscriptions(user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS paddle_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'team')),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  event_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS paddle_transactions_user ON paddle_transactions(user_id, occurred_at);
