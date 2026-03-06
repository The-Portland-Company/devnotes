CREATE OR REPLACE FUNCTION devnotes_unread_counts(p_user_id UUID)
RETURNS TABLE (
  bug_report_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.bug_report_id,
    COUNT(*)::BIGINT AS unread_count
  FROM bug_report_messages m
  LEFT JOIN bug_report_message_reads r
    ON r.message_id = m.id
   AND r.user_id = p_user_id
  WHERE p_user_id = auth.uid()
    AND m.author_id <> p_user_id
    AND r.message_id IS NULL
  GROUP BY m.bug_report_id
$$;

GRANT EXECUTE ON FUNCTION devnotes_unread_counts(UUID) TO authenticated;
