-- 1) Allow decimal points on checklist items
ALTER TABLE public.station_checklist_items
  ALTER COLUMN points TYPE numeric USING points::numeric;

-- 2) Recompute points for ACLS station from the maximum level value in each item's levels JSONB
UPDATE public.station_checklist_items ci
SET points = sub.max_pts
FROM (
  SELECT id,
         COALESCE((
           SELECT MAX( (lvl->>'points')::numeric )
           FROM jsonb_array_elements(levels) AS lvl
         ), points) AS max_pts
  FROM public.station_checklist_items
  WHERE station_id = 'a1111111-1111-1111-1111-111111111111'
) AS sub
WHERE ci.id = sub.id
  AND ci.station_id = 'a1111111-1111-1111-1111-111111111111';