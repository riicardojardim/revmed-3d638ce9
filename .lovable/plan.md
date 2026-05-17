# Plano: Entrada Premium da Estação ("Prontuário + Crachá")

Vou entregar uma primeira versão completa, navegável e responsiva, em 4 frentes: **banco**, **realtime/lobby**, **animação** e **roteamento por papel**.

## 1. Banco de dados (migration)

Ajustes mínimos em `training_rooms` e `training_room_participants` (mantendo o que já existe):

- `training_rooms`: adicionar `actor_ready boolean default false`, `candidate_ready boolean default false`, `starting_at timestamptz`. Status passa a aceitar: `waiting | candidate_joined | actor_ready | candidate_ready | starting | in_progress | finished`.
- `training_room_participants`: adicionar `is_ready boolean default false`, `display_name text`, `last_seen_at timestamptz default now()`.
- Habilitar Realtime (`REPLICA IDENTITY FULL` + `ALTER PUBLICATION supabase_realtime ADD TABLE ...`) para ambas as tabelas.

RLS já existente é mantida (host/admin editam sala; participante edita o próprio registro).

## 2. Pré-sala (Lobby)

Nova rota `/app/sala/$code/lobby` (e redirect a partir de `/app/entrar/$code` para o lobby, em vez de ir direto para candidato/paciente).

Componentes novos em `src/components/room/`:
- `RoomLobby` — orquestra tudo.
- `ParticipantStatusCard` — mostra cada participante com avatar, papel, "Pronto/Aguardando".
- `InviteLinkBox` — código grande + botão "Copiar link".
- `ReadyButton` — alterna `is_ready` do participante atual.
- `StartStationButton` — só host/ator/avaliador; seta `status = 'starting'` + `starting_at = now()`.

Realtime: subscribe em `training_rooms:id=eq.<id>` e `training_room_participants:room_id=eq.<id>`. Quando `status` vira `starting`, mostra o overlay.

Cabeçalho com: nome da estação, especialidade, duração, código, aviso de privacidade por papel.

## 3. Animação "Prontuário + Crachá" (4–6s)

Bundle em `src/components/room/intro/`:
- `StationIntroOverlay` — fullscreen, gradient azul-noite + vinheta, decide qual sequência rodar com base no papel.
- `AnimatedCredentialCard` — crachá vertical institucional (nome, papel, estação, especialidade), entra de baixo com `slide-up` + leve `scale-in`.
- `AnimatedClinicalRecord` — cartão/pasta clínica horizontal com rotação 3D suave (`rotateY` + `perspective`).
- `SlidingMedicalDoor` — dois painéis verticais translúcidos verde-menta/azul que abrem do centro para os lados.
- `CountdownOverlay` — "3 → 2 → 1 → Estação iniciada" com scale+blur.
- `CandidateEntrySequence` / `ActorEntrySequence` — orquestram a timeline com Framer Motion (`motion` + `AnimatePresence`). Para o ator, inclui mini-ficha do roteiro deslizando ao lado do crachá.

Timing alvo (≈5,2s): fade-in fundo (0.4s) → títulos (0.6s) → crachá (1.0s) → prontuário 3D (1.0s) → portas abrem (0.8s) + countdown (1.2s) → "Estação iniciada" (0.2s) → redirect.

Identidade: tokens existentes (`night`, `mint`, `medical`), tipografia display, sombras suaves, **sem neon/gamer**. Tudo via classes Tailwind + tokens em `src/styles.css` (sem cores hardcoded).

## 4. Sincronização + redirecionamento

- Host clica "Iniciar estação" → update `status='starting', starting_at=now()`.
- Ambos os clientes recebem evento Realtime → montam `StationIntroOverlay`.
- Quando a sequência termina localmente:
  - Host (só ele, para evitar corrida) faz update `status='in_progress'`.
  - Cada cliente redireciona pelo seu papel:
    - `candidato` → `/app/sala/$code/candidato`
    - `ator` / `paciente` / `avaliador` → `/app/sala/$code/paciente` (tela do ator já existente)
  - (Mantenho as rotas atuais `sala.$code.candidato` / `sala.$code.paciente` em vez de criar `/app/simulacao/:id/...` para não quebrar o fluxo já implementado.)

Se um participante chega depois de `status='starting'`/`in_progress`, vai direto para a tela do papel (sem animação re-rodando).

## 5. Responsividade & acessibilidade

- Layout em `grid` adaptativo; crachá/prontuário escalam por `clamp()`.
- Countdown central com `text-[clamp(6rem,18vw,12rem)]`.
- Respeita `prefers-reduced-motion`: animações encurtadas para fade simples + countdown.
- Sem vazar informação entre papéis: candidato nunca recebe `patient_script`/checklist na pré-sala nem na intro.

## Detalhes técnicos

- Framer Motion já é compatível; instalar se ainda não houver (`bun add framer-motion`).
- Tudo client-side; sem novas server functions (operações via `supabase` browser client com RLS existente).
- Migration roda **antes** das edições de código (regra do projeto).
- Não toco em `src/integrations/supabase/*` nem em `routeTree.gen.ts`.

## Entrega

Ao fim você terá: lobby premium funcional com Realtime, animação institucional de 4–6s sincronizada, redirect por papel, e um fluxo testável abrindo dois navegadores (host + convidado pelo link/código).

Posso seguir?