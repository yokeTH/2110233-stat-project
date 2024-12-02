-- Create table for A/B test events
CREATE TABLE IF NOT EXISTS ab_test_events (
  id TEXT PRIMARY KEY,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  response TEXT NOT NULL CHECK (response IN ('yes', 'no')),
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create separate indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_variant ON ab_test_events(variant);
CREATE INDEX IF NOT EXISTS idx_created_at ON ab_test_events(created_at);
CREATE INDEX IF NOT EXISTS idx_session ON ab_test_events(session_id);

-- Create view for quick statistics
CREATE VIEW IF NOT EXISTS ab_test_statistics AS
WITH stats AS (
  SELECT 
    variant,
    response,
    COUNT(*) as count,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY variant) as REAL) as percentage
  FROM ab_test_events
  GROUP BY variant, response
)

SELECT 
  variant,
  SUM(CASE WHEN response = 'yes' THEN count ELSE 0 END) as yes_count,
  SUM(CASE WHEN response = 'no' THEN count ELSE 0 END) as no_count,
  CAST(SUM(CASE WHEN response = 'yes' THEN count ELSE 0 END) * 100.0 / SUM(count) as REAL) as conversion_rate
FROM stats
GROUP BY variant;