-- Reatribui aulas com especialidades fora da lista oficial do Revalida
UPDATE public.video_lessons
SET specialty = 'Clínica Médica', updated_at = now()
WHERE specialty NOT IN (
  'Clínica Médica',
  'Cirurgia',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Medicina de Família e Comunidade'
);
