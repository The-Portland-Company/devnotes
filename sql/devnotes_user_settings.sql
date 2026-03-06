-- react-devnotes: per-user display settings (toolbar/floating)
CREATE TABLE IF NOT EXISTS devnotes_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_mode VARCHAR(20) NOT NULL DEFAULT 'toolbar'
    CHECK (display_mode IN ('toolbar', 'floating')),
  floating_position VARCHAR(20) NOT NULL DEFAULT 'bottom-right'
    CHECK (floating_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  floating_opacity DECIMAL NOT NULL DEFAULT 1.0
    CHECK (floating_opacity BETWEEN 0.1 AND 1.0),
  icon_style VARCHAR(20) NOT NULL DEFAULT 'alert'
    CHECK (icon_style IN ('alert', 'bug', 'message', 'clipboard')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE devnotes_user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'devnotes_user_settings'
      AND policyname = 'Users can manage own devnotes settings'
  ) THEN
    CREATE POLICY "Users can manage own devnotes settings"
      ON devnotes_user_settings
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION update_devnotes_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_devnotes_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER trigger_devnotes_user_settings_updated_at
      BEFORE UPDATE ON devnotes_user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_devnotes_user_settings_updated_at();
  END IF;
END
$$;
