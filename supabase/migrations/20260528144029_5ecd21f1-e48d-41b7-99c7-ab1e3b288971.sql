UPDATE public.plans SET price_cents = 14700 WHERE slug = 'ator';
UPDATE public.plans SET price_cents = 59700 WHERE slug = 'completo';

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug text NOT NULL,
  amount_cents integer NOT NULL,
  method text NOT NULL CHECK (method IN ('pix','card')),
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text UNIQUE,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  mp_status_detail text,
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_mp_id ON public.payments(mp_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();