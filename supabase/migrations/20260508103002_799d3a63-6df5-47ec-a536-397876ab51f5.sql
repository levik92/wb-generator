
CREATE OR REPLACE FUNCTION public.get_admin_conversations(
  _enc_key text,
  _offset integer DEFAULT 0,
  _limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
  result jsonb;
BEGIN
  -- Allow only admins or service_role
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (auth.jwt() ->> 'role') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT count(*) INTO total_count FROM public.support_conversations;

  WITH last_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.sender_type,
      m.created_at,
      m.encrypted_content
    FROM public.support_messages m
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  msg_counts AS (
    SELECT conversation_id, count(*)::int AS cnt
    FROM public.support_messages
    GROUP BY conversation_id
  ),
  page AS (
    SELECT
      c.id,
      c.visitor_id,
      c.user_id,
      c.channel,
      c.status,
      c.ai_enabled,
      c.needs_admin_attention,
      c.created_at,
      c.updated_at,
      lm.sender_type AS last_message_sender,
      lm.created_at AS last_message_at,
      CASE
        WHEN lm.encrypted_content IS NOT NULL
          THEN public.decrypt_support_message_edge(lm.encrypted_content, _enc_key)
        ELSE ''
      END AS last_message,
      COALESCE(mc.cnt, 0) AS message_count,
      p.email AS user_email
    FROM public.support_conversations c
    LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
    LEFT JOIN msg_counts mc ON mc.conversation_id = c.id
    LEFT JOIN public.profiles p ON p.id = c.user_id
    ORDER BY
      c.needs_admin_attention DESC NULLS LAST,
      COALESCE(lm.created_at, c.updated_at) DESC
    OFFSET _offset
    LIMIT _limit
  )
  SELECT jsonb_build_object(
    'conversations', COALESCE(jsonb_agg(to_jsonb(page)), '[]'::jsonb),
    'total', total_count
  ) INTO result
  FROM page;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_conversations(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_conversations(text, integer, integer) TO authenticated, service_role;
