
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('aluno', 'professor', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  whatsapp TEXT,
  exam_year TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, whatsapp, exam_year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'exam_year'
  );

  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
    'aluno'::public.app_role
  );
  -- Never let signup metadata grant admin
  IF v_role = 'admin' THEN
    v_role := 'aluno';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Attempts (station tries)
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_title TEXT,
  specialty TEXT,
  score NUMERIC(4,2) NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  used_seconds INTEGER NOT NULL DEFAULT 0,
  checked_items TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'concluida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own attempts"
  ON public.attempts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own attempts"
  ON public.attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own attempts"
  ON public.attempts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers and admins view all attempts"
  ON public.attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX attempts_user_created_idx ON public.attempts (user_id, created_at DESC);
