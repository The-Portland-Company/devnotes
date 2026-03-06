-- =============================================================================
-- react-devnotes: Database Schema
-- =============================================================================
-- Run this SQL against your Supabase (or Postgres) database to set up
-- the tables required by react-devnotes.
--
-- Requires: Supabase Auth (auth.users)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Profiles table (auto-synced from Supabase Auth)
-- ---------------------------------------------------------------------------
-- This table is required for creator/assignee name lookups.
-- If your project already has a `profiles` table with id, email, and
-- full_name columns, this section is a safe no-op (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read all profiles (for assignee/creator display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can view profiles'
  ) THEN
    CREATE POLICY "Anyone can view profiles"
      ON profiles FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow users to update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$;

-- Only create the trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Backfill: create profile rows for any existing auth users that don't have one
INSERT INTO profiles (id, email, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1. Bug Report Types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bug_report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default types
INSERT INTO bug_report_types (name, is_default) VALUES
  ('Bug', true),
  ('Feature Request', true),
  ('UI Issue', true),
  ('Performance', true)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE bug_report_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bug report types"
  ON bug_report_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. Task Lists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  share_slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_lists_default
  ON task_lists (is_default)
  WHERE is_default;

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task lists"
  ON task_lists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_task_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_lists_updated_at
  BEFORE UPDATE ON task_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_task_lists_updated_at();

-- Insert default task list
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM task_lists WHERE is_default) THEN
    INSERT INTO task_lists (name, is_default) VALUES ('General', true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION default_task_list_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM task_lists WHERE is_default = true ORDER BY created_at LIMIT 1
$$;

-- ---------------------------------------------------------------------------
-- 3. Bug Reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id UUID NOT NULL DEFAULT default_task_list_id() REFERENCES task_lists(id),
  page_url TEXT NOT NULL,
  x_position DECIMAL NOT NULL,
  y_position DECIMAL NOT NULL,
  target_selector TEXT,
  target_relative_x DOUBLE PRECISION,
  target_relative_y DOUBLE PRECISION,
  types UUID[] NOT NULL DEFAULT '{}',
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  capture_context JSONB,
  response TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Needs Review', 'Resolved', 'Closed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  ai_ready BOOLEAN NOT NULL DEFAULT false,
  ai_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT bug_reports_target_relative_bounds_chk CHECK (
    (target_relative_x IS NULL AND target_relative_y IS NULL) OR
    (target_relative_x BETWEEN 0 AND 1 AND target_relative_y BETWEEN 0 AND 1)
  )
);

-- Add foreign key to profiles for creator lookup
ALTER TABLE bug_reports
  ADD CONSTRAINT bug_reports_creator_profile_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bug_reports_page_url ON bug_reports(page_url);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_by ON bug_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_bug_reports_approved ON bug_reports(approved);
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_ready ON bug_reports(ai_ready);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bug reports"
  ON bug_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_reports_updated_at();

COMMENT ON COLUMN bug_reports.target_selector IS
  'CSS selector pointing to the targeted DOM element when the bug was reported';
COMMENT ON COLUMN bug_reports.target_relative_x IS
  'Relative X offset (0-1) inside the anchored element when known';
COMMENT ON COLUMN bug_reports.target_relative_y IS
  'Relative Y offset (0-1) inside the anchored element when known';
COMMENT ON COLUMN bug_reports.capture_context IS
  'Client-side diagnostic context captured at report creation (browser, viewport, route label, timestamp)';
COMMENT ON COLUMN bug_reports.approved IS
  'Indicates someone can begin working on this bug report';
COMMENT ON COLUMN bug_reports.ai_ready IS
  'Indicates AI can instantly begin working on this bug report';

-- ---------------------------------------------------------------------------
-- 4. Bug Report Messages (Discussion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bug_report_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_report_messages_report_id
  ON bug_report_messages(bug_report_id);

ALTER TABLE bug_report_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bug report messages"
  ON bug_report_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_bug_report_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bug_report_messages_updated_at
  BEFORE UPDATE ON bug_report_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_report_messages_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Message Read Tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bug_report_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES bug_report_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bug_report_message_reads_unique
  ON bug_report_message_reads (message_id, user_id);

ALTER TABLE bug_report_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage bug report reads"
  ON bug_report_message_reads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. Unread Count RPC
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 7. Public Task List Functions (optional, for shared task list access)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public_get_task_list(share_slug text)
RETURNS TABLE (
  id UUID, name TEXT, share_slug TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, share_slug, created_at, updated_at
  FROM task_lists WHERE task_lists.share_slug = public_get_task_list.share_slug LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public_get_task_list_tasks(share_slug text)
RETURNS TABLE (
  id UUID, task_list_id UUID, title TEXT, description TEXT,
  severity VARCHAR, status VARCHAR, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, task_list_id, title, description, severity, status, created_at, updated_at
  FROM bug_reports
  WHERE task_list_id = (
    SELECT id FROM task_lists
    WHERE task_lists.share_slug = public_get_task_list_tasks.share_slug LIMIT 1
  )
  ORDER BY created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public_get_task_list(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_get_task_list_tasks(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. DevNotes User Display Settings
-- ---------------------------------------------------------------------------
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

CREATE POLICY "Users can manage own devnotes settings"
  ON devnotes_user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_devnotes_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_devnotes_user_settings_updated_at
  BEFORE UPDATE ON devnotes_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_devnotes_user_settings_updated_at();
