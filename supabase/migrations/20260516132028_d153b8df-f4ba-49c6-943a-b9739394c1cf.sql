-- ============ FLASHCARDS ============
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  specialty TEXT NOT NULL,
  topic TEXT,
  deck TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published flashcards or own"
ON public.flashcards FOR SELECT TO authenticated
USING (published = true OR created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Professors/admins create flashcards"
ON public.flashcards FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(),'professor') OR has_role(auth.uid(),'admin')));

CREATE POLICY "Owners/admins update flashcards"
ON public.flashcards FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Owners/admins delete flashcards"
ON public.flashcards FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ FLASHCARD REVIEWS (spaced repetition) ============
CREATE TABLE public.flashcard_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease NUMERIC NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_quality INTEGER,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reviews"
ON public.flashcard_reviews FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_flashcard_reviews_updated_at
BEFORE UPDATE ON public.flashcard_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SUMMARIES (Resumos) ============
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  topic TEXT,
  content_md TEXT NOT NULL,
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published summaries or own"
ON public.summaries FOR SELECT TO authenticated
USING (published = true OR created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Professors/admins create summaries"
ON public.summaries FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(),'professor') OR has_role(auth.uid(),'admin')));

CREATE POLICY "Owners/admins update summaries"
ON public.summaries FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Owners/admins delete summaries"
ON public.summaries FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_summaries_updated_at
BEFORE UPDATE ON public.summaries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TRAINING ROOMS ============
CREATE TABLE public.training_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  station_id TEXT NOT NULL,
  station_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | running | finished
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.training_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.training_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidato', -- candidato | avaliador | observador
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
ALTER TABLE public.training_room_participants ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to look up rooms (needed to join by code)
CREATE POLICY "Authenticated view rooms"
ON public.training_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated create own room"
ON public.training_rooms FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host/admin update room"
ON public.training_rooms FOR UPDATE TO authenticated
USING (host_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Host/admin delete room"
ON public.training_rooms FOR DELETE TO authenticated
USING (host_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_training_rooms_updated_at
BEFORE UPDATE ON public.training_rooms
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "View participants of accessible rooms"
ON public.training_room_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users join rooms as themselves"
ON public.training_room_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own participation"
ON public.training_room_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users leave / host removes"
ON public.training_room_participants FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.training_rooms r WHERE r.id = room_id AND (r.host_id = auth.uid() OR has_role(auth.uid(),'admin')))
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_room_participants;

-- ============ PLANS ============
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active plans"
ON public.plans FOR SELECT TO authenticated USING (active = true OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage plans"
ON public.plans FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage subscriptions"
ON public.user_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default plans
INSERT INTO public.plans (slug, name, description, price_cents, features) VALUES
  ('free', 'Gratuito', 'Acesso limitado para conhecer a plataforma', 0, '["3 estações por mês","Checklist básico"]'::jsonb),
  ('premium', 'Premium', 'Acesso completo a estações e correção automática', 14900, '["Estações ilimitadas","Flashcards e resumos","Sala de treino em dupla"]'::jsonb),
  ('mentoria', 'Mentoria', 'Tudo do Premium + correções de professores', 39900, '["Tudo do Premium","Correção por professores","Mentorias ao vivo"]'::jsonb);
