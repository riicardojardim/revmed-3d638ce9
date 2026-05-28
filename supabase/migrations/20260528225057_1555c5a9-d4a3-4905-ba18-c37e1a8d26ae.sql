CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/app',
    interval_days INTEGER DEFAULT 2,
    active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_notifications TO authenticated;
GRANT ALL ON public.scheduled_notifications TO service_role;

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage schedules
CREATE POLICY "Admins can manage scheduled notifications" 
ON public.scheduled_notifications 
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_scheduled_notifications_updated_at ON public.scheduled_notifications;
CREATE TRIGGER update_scheduled_notifications_updated_at
BEFORE UPDATE ON public.scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample notifications
INSERT INTO public.scheduled_notifications (title, body, url, interval_days)
VALUES 
('Hora de treinar! 🩺', 'Não deixe seu rastro de estudo esfriar. Vamos praticar um checklist agora?', '/app/checklists', 2),
('Novo checklist disponível! 📄', 'Confira as últimas estações adicionadas e fique à frente na sua preparação.', '/app/checklists', 3),
('Dica do dia: Flashcards! 🧠', 'Já revisou seus flashcards hoje? A repetição espaçada é a chave para a memorização.', '/app/flashcards', 2)
ON CONFLICT DO NOTHING;