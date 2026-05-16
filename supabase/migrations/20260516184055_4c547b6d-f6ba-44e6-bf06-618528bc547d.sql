UPDATE public.custom_stations
SET deliverable_materials = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'name' ILIKE '%ritmo%' THEN jsonb_set(elem, '{content}', '""'::jsonb)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(deliverable_materials) elem
)
WHERE id = 'a1111111-1111-1111-1111-111111111111';