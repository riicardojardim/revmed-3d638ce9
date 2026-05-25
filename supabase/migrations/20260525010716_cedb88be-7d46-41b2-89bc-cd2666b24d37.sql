-- Adiciona campo api_secret para provedores que precisam de key+secret (ex: LiveKit)
ALTER TABLE public.provider_settings ADD COLUMN api_secret TEXT;

-- Atualiza os providers de live_video para terem webhook_url padrão
UPDATE public.provider_settings
SET webhook_url = '/api/public/webhooks/live/' || provider_key
WHERE category = 'live_video';

UPDATE public.provider_settings
SET webhook_url = '/api/public/webhooks/payment/' || provider_key
WHERE category = 'payment';

UPDATE public.provider_settings
SET webhook_url = '/api/public/webhooks/video/' || provider_key
WHERE category = 'video_upload';
