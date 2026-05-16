UPDATE public.user_subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'ator'),
    status = 'active',
    current_period_end = now() + interval '30 days'
WHERE user_id = '69785bdc-e7a7-4985-843b-9b45a3c64573';