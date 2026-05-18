
-- 1) room_material_deliveries: vincular cada entrega à estação
ALTER TABLE public.room_material_deliveries
  ADD COLUMN IF NOT EXISTS station_id text;

-- Backfill: preenche com o station_id atual da sala
UPDATE public.room_material_deliveries d
SET station_id = r.station_id
FROM public.training_rooms r
WHERE d.room_id = r.id AND d.station_id IS NULL;

-- Garante NOT NULL (linhas órfãs recebem string vazia)
UPDATE public.room_material_deliveries SET station_id = '' WHERE station_id IS NULL;
ALTER TABLE public.room_material_deliveries
  ALTER COLUMN station_id SET NOT NULL,
  ALTER COLUMN station_id SET DEFAULT '';

ALTER TABLE public.room_material_deliveries
  DROP CONSTRAINT IF EXISTS room_material_deliveries_room_id_material_id_key;

ALTER TABLE public.room_material_deliveries
  ADD CONSTRAINT room_material_deliveries_room_station_material_key
  UNIQUE (room_id, station_id, material_id);

-- 2) room_evaluations: chave única passa a incluir station_id
ALTER TABLE public.room_evaluations
  DROP CONSTRAINT IF EXISTS room_evaluations_room_evaluator_candidate_key;

ALTER TABLE public.room_evaluations
  ADD CONSTRAINT room_evaluations_room_evaluator_candidate_station_key
  UNIQUE (room_id, evaluator_id, candidate_id, station_id);
