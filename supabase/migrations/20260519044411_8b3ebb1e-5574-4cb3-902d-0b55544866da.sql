
-- Adiciona campos necessários no perfil para o novo cadastro
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS selected_plan text;

-- Índice único para CPF (permite nulos pra contas antigas)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf) WHERE cpf IS NOT NULL;

-- Garante que selected_plan só aceite valores válidos
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_selected_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_selected_plan_check
  CHECK (selected_plan IS NULL OR selected_plan IN ('completo','mensal','ator'));
