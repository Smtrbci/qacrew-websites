ALTER TABLE forge_subscriptions ADD COLUMN workspace_key TEXT;
CREATE INDEX IF NOT EXISTS forge_subscriptions_workspace_status
  ON forge_subscriptions(workspace_key, status, updated_at);
