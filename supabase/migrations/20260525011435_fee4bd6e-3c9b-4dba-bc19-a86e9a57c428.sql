INSERT INTO public.provider_settings (category, provider_key, provider_label, is_active)
VALUES ('payment', 'herospark', 'Herospark', false)
ON CONFLICT (category, provider_key) DO NOTHING;