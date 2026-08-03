CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Member',
  last_active timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  share_salah boolean NOT NULL DEFAULT false,
  share_quran boolean NOT NULL DEFAULT false,
  share_dhikr boolean NOT NULL DEFAULT false,
  share_streak boolean NOT NULL DEFAULT false,
  share_last_active boolean NOT NULL DEFAULT false,
  hide_prayer_times boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.daily_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  prayers text[] NOT NULL DEFAULT '{}',
  quran_pages integer NOT NULL DEFAULT 0,
  dhikr integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_progress TO authenticated;
GRANT ALL ON public.daily_progress TO service_role;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.encouragements TO authenticated;
GRANT ALL ON public.encouragements TO service_role;
ALTER TABLE public.encouragements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_member(_family_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members m WHERE m.family_id = _family_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.shares_family_with(_other uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members a
    JOIN public.family_members b ON a.family_id = b.family_id
    WHERE a.user_id = _user_id AND b.user_id = _other
  );
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "family profile read" ON public.profiles FOR SELECT TO authenticated USING (public.shares_family_with(id, auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "families read" ON public.families FOR SELECT TO authenticated USING (public.is_family_member(id, auth.uid()));
CREATE POLICY "families create" ON public.families FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "families owner update" ON public.families FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "families owner delete" ON public.families FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "members read" ON public.family_members FOR SELECT TO authenticated USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "members join self" ON public.family_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members update self" ON public.family_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members leave" ON public.family_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "progress own" ON public.daily_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "encouragements read" ON public.encouragements FOR SELECT TO authenticated USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "encouragements send" ON public.encouragements FOR INSERT TO authenticated
  WITH CHECK (from_user = auth.uid() AND public.is_family_member(family_id, auth.uid()) AND public.is_family_member(family_id, to_user));
CREATE POLICY "encouragements delete own" ON public.encouragements FOR DELETE TO authenticated USING (from_user = auth.uid());

CREATE OR REPLACE FUNCTION public.join_family_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO fid FROM public.families WHERE upper(invite_code) = upper(trim(_code));
  IF fid IS NULL THEN RAISE EXCEPTION 'No family found with that invite code'; END IF;
  INSERT INTO public.family_members (family_id, user_id)
  VALUES (fid, auth.uid())
  ON CONFLICT (family_id, user_id) DO NOTHING;
  RETURN fid;
END;
$$;

CREATE OR REPLACE FUNCTION public.peek_family_by_code(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name FROM public.families WHERE upper(invite_code) = upper(trim(_code));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1), 'Member'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encouragements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;

CREATE UNIQUE INDEX IF NOT EXISTS families_invite_code_uidx ON public.families (upper(invite_code));

CREATE OR REPLACE FUNCTION public.create_family(_name text)
RETURNS TABLE (id uuid, name text, invite_code text, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  base text;
  code text;
  fid uuid;
  attempts int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF coalesce(trim(_name), '') = '' THEN RAISE EXCEPTION 'Family name is required'; END IF;

  base := upper(regexp_replace(trim(_name), '[^a-zA-Z]', '', 'g'));
  base := coalesce(nullif(left(base, 8), ''), 'FAMILY');

  LOOP
    attempts := attempts + 1;
    code := base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.families f WHERE upper(f.invite_code) = code);
    IF attempts > 25 THEN
      code := base || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.families (name, invite_code, created_by)
  VALUES (trim(_name), code, uid)
  RETURNING families.id INTO fid;

  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (fid, uid, 'owner')
  ON CONFLICT (family_id, user_id) DO UPDATE SET role = 'owner';

  RETURN QUERY
    SELECT f.id, f.name, f.invite_code, f.created_by FROM public.families f WHERE f.id = fid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_family_progress(_since date)
RETURNS TABLE (
  user_id uuid,
  day date,
  prayers text[],
  quran_pages integer,
  dhikr integer,
  streak integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dp.user_id,
    dp.day,
    CASE WHEN dp.user_id = auth.uid() OR COALESCE(s.share_salah, false)  THEN dp.prayers     ELSE '{}'::text[] END,
    CASE WHEN dp.user_id = auth.uid() OR COALESCE(s.share_quran, false)  THEN dp.quran_pages ELSE 0 END,
    CASE WHEN dp.user_id = auth.uid() OR COALESCE(s.share_dhikr, false)  THEN dp.dhikr       ELSE 0 END,
    CASE WHEN dp.user_id = auth.uid() OR COALESCE(s.share_streak, false) THEN dp.streak      ELSE 0 END,
    dp.updated_at
  FROM public.daily_progress dp
  LEFT JOIN LATERAL (
    SELECT
      bool_or(t.share_salah)  AS share_salah,
      bool_or(t.share_quran)  AS share_quran,
      bool_or(t.share_dhikr)  AS share_dhikr,
      bool_or(t.share_streak) AS share_streak
    FROM public.family_members t
    JOIN public.family_members me
      ON me.family_id = t.family_id AND me.user_id = auth.uid()
    WHERE t.user_id = dp.user_id
  ) s ON true
  WHERE auth.uid() IS NOT NULL
    AND dp.day >= _since
    AND (
      dp.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.family_members a
        JOIN public.family_members b ON a.family_id = b.family_id
        WHERE a.user_id = auth.uid() AND b.user_id = dp.user_id
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_family_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shares_family_with(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_family_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.peek_family_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_family(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_family_progress(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_family_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.peek_family_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_family(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_family_progress(date) TO authenticated;