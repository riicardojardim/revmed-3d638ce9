UPDATE public.custom_stations
SET bibliographic_references = '[
  {"url": "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-ofidicos/publicacoes/oficio-circular-no-02-2014-cgdt-devit-svs-ms/view", "label": "Ofício Circular nº 02/2014 - Acidentes ofídicos (Ministério da Saúde)"},
  {"url": "https://www.icict.fiocruz.br/sites/www.icict.fiocruz.br/files/Manual-de-Diagnostico-e-Tratamento-de-Acidentes-por-Animais-Pe--onhentos.pdf", "label": "Manual de Diagnóstico e Tratamento de Acidentes por Animais Peçonhentos (ICICT/Fiocruz)"}
]'::jsonb
WHERE id = 'a2222222-2222-2222-2222-222222222222';