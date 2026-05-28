-- Add new columns to plans table for landing page synchronization
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS old_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS discount_tag TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT,
ADD COLUMN IF NOT EXISTS highlight BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Update existing plans with initial data from landing page
UPDATE public.plans SET 
  tagline = 'Treine como paciente',
  cta_text = 'Entrar como ator',
  accent_color = 'from-mint/20'
WHERE slug = 'ator';

UPDATE public.plans SET 
  tagline = 'App REVMED completo',
  old_price_cents = 89700,
  discount_tag = '33% OFF',
  cta_text = 'Começar agora',
  highlight = true,
  accent_color = 'from-primary/25'
WHERE slug = 'completo';

-- Ensure we have the mentoria plan in the DB as well, handling jsonb features correctly
INSERT INTO public.plans (slug, name, description, price_cents, tagline, cta_text, highlight, accent_color, active, features)
VALUES (
  'mentoria', 
  'Mentoria 1:5', 
  'Programa completo com mentor presente, Turmas Programadas de 5 pessoas, psicólogo no time, WhatsApp 24h e plataforma inclusa.', 
  0, 
  'Acompanhamento humano + plataforma', 
  'Falar no WhatsApp', 
  false, 
  'from-amber-500/20', 
  true, 
  '["Tudo do plano Plataforma", "20 encontros práticos ao vivo", "10 encontros extras nas grandes áreas", "6 sessões com psicólogo do programa", "Grupo geral + comunidade exclusiva", "WhatsApp 24h com acesso direto ao mentor", "Cronograma personalizado de estudos"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  tagline = EXCLUDED.tagline,
  cta_text = EXCLUDED.cta_text,
  accent_color = EXCLUDED.accent_color;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
