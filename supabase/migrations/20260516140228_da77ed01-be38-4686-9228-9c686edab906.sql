
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allows_candidato boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_ator boolean NOT NULL DEFAULT true;

INSERT INTO public.plans (slug, name, description, price_cents, features, active, trial_days, allows_candidato, allows_ator)
VALUES ('free', 'Grátis', '3 dias de acesso completo para você experimentar a plataforma.', 0,
        '["3 dias de acesso completo","Treine como médico ou ator","+600 checklists","Flashcards e resumos","Estatísticas de estudo"]'::jsonb,
        true, 3, true, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features, active = true, trial_days = 3,
  allows_candidato = true, allows_ator = true;

INSERT INTO public.plans (slug, name, description, price_cents, features, active, trial_days, allows_candidato, allows_ator)
VALUES ('completo', 'Completo', 'Treine como médico/candidato ou como ator/avaliador. Acesso até o dia da prova.', 80000,
        '["Acesso até o dia da prova","Treine como médico ou ator/avaliador","+600 checklists atualizados","+450 flashcards","Treinamentos ilimitados","Estatísticas, CHAT e Grupo WhatsApp","Crie seus próprios checklists com IA","Correção por IA com feedback técnico"]'::jsonb,
        true, 0, true, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features, active = true, trial_days = 0,
  allows_candidato = true, allows_ator = true;

INSERT INTO public.plans (slug, name, description, price_cents, features, active, trial_days, allows_candidato, allows_ator)
VALUES ('ator', 'Ator', 'Exclusivo para avaliar — você atua como paciente simulado e médico avaliador.', 17000,
        '["Acesso até o dia da prova","Atue como ator/avaliador","+600 checklists atualizados","Treinamentos ilimitados","Use a plataforma como avaliador"]'::jsonb,
        true, 0, false, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features, active = true, trial_days = 0,
  allows_candidato = false, allows_ator = true;

UPDATE public.user_subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'completo')
WHERE plan_id IN (SELECT id FROM public.plans WHERE slug IN ('premium','mentoria'));

DELETE FROM public.plans WHERE slug IN ('premium','mentoria');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_free_plan uuid;
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
  IF v_role = 'admin' THEN
    v_role := 'aluno';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  SELECT id INTO v_free_plan FROM public.plans WHERE slug = 'free' LIMIT 1;
  IF v_free_plan IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_end)
    VALUES (NEW.id, v_free_plan, 'trialing', now() + interval '3 days')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Give privileged users (admin/professor) a permanent Completo subscription
WITH priv AS (
  SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','professor')
)
INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_end)
SELECT p.user_id, (SELECT id FROM public.plans WHERE slug = 'completo'), 'active', now() + interval '10 years'
FROM priv p
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = 'active',
  current_period_end = EXCLUDED.current_period_end;
