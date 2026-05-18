ALTER TABLE public.attempts ALTER COLUMN simulado_id TYPE text USING simulado_id::text;
ALTER TABLE public.training_rooms ALTER COLUMN simulado_id TYPE text USING simulado_id::text;