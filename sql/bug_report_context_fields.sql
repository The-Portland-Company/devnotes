-- react-devnotes: bug report AI context fields
ALTER TABLE bug_reports
  ADD COLUMN IF NOT EXISTS expected_behavior TEXT,
  ADD COLUMN IF NOT EXISTS actual_behavior TEXT,
  ADD COLUMN IF NOT EXISTS capture_context JSONB;

COMMENT ON COLUMN bug_reports.capture_context IS
  'Client-side diagnostic context captured at report creation (browser, viewport, route label, timestamp)';
