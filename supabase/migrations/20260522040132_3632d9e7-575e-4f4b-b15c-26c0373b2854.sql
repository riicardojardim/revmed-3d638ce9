UPDATE public.video_lessons
SET video_url = 'https://fvlzmyqioojykoxoboce.supabase.co/storage/v1/object/sign/lesson-videos/demo/revmed-welcome-v2.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mNDllNmM2NC04OGUyLTRhMmItOGJjZi1hOGIyYTg4NDgyN2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsZXNzb24tdmlkZW9zL2RlbW8vcmV2bWVkLXdlbGNvbWUtdjIubXA0IiwiaWF0IjoxNzc5NDIyNDc3LCJleHAiOjE4MTA5NTg0Nzd9.2vje5TrucVi1DveNZ3w0yYpQqABrAY9v3mH7lQCeRZA',
    duration_seconds = 10,
    updated_at = now()
WHERE specialty = 'Direito Médico' AND topic = 'Boas-vindas';