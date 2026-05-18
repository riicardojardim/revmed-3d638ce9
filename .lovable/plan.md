## Visão geral

Adicionar um sistema social leve estilo Instagram, integrado ao fluxo de Sala de Treino que já existe. O anfitrião escolhe um checklist do banco, convida um amigo, e a sala abre com ele como **ator** e o amigo como **candidato** — respeitando a regra de que o candidato só vê a **especialidade**, nunca o título do checklist.

## 1. Username público (@handle)

- Cada perfil ganha um `username` único (ex: `fernandojardim`), exibido como `@fernandojardim`.
- Campo editável em **Perfil** (com validação: 3–20 chars, `a-z0-9._`, único, case-insensitive).
- Em todo lugar onde aparece o nome do usuário (avatar, lista de participantes da sala, crachá), passa a aparecer também o `@username` discreto.

## 2. Adicionar amigos

Nova página **`/app/amigos`** (com item no menu lateral) com 3 abas:

- **Meus amigos** — lista com avatar, nome, @username, botão "Convidar pra sala" e menu (remover).
- **Solicitações** — pendentes recebidas (aceitar / recusar) e enviadas (cancelar).
- **Buscar** — campo único que casa por nome, e-mail ou @username; botão "Adicionar" envia pedido.

Toda relação começa como **pedido** → o outro lado precisa **aceitar** pra virar amizade.

## 3. Convite pra sala (fluxo top)

A partir de **Meus amigos** ou do **Banco de Checklists**:

1. Anfitrião clica "Convidar amigo" → modal escolhe **checklist** (busca + filtro por especialidade, reaproveitando o modal "Todos os checklists" que acabamos de fazer) e **amigo**.
2. Sistema cria a `training_room` em modo `dupla`, com o anfitrião como **ator** (host) e gera convite pendente pro amigo.
3. Amigo recebe notificação **dentro do app** (sino no topo + badge + página `/app/amigos` → aba **Convites**).
4. Amigo clica "Entrar" → cai direto na sala como **candidato**.
5. Na tela do candidato, ele vê **apenas a especialidade** (chip colorido) — exatamente como o fluxo atual de `/app/sala/$code/candidato`. O ator vê tudo.

## 4. Notificações in-app

- Componente **sino** no header do app (`src/routes/app.tsx`) com badge de não-lidos.
- Tabela `notifications` simples; eventos: `friend_request_received`, `friend_request_accepted`, `room_invite_received`, `room_invite_cancelled`.
- Realtime via Supabase Channels — chega na hora.

## Detalhes técnicos

### Banco (migration)

```sql
-- 1. Username em profiles
ALTER TABLE profiles ADD COLUMN username citext UNIQUE;
ALTER TABLE profiles ADD CONSTRAINT username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9._]{3,20}$');

-- 2. Amizades (par único, qualquer ordem)
CREATE TABLE friendships (
  id uuid PK,
  user_a uuid NOT NULL,  -- sempre o menor uuid
  user_b uuid NOT NULL,  -- sempre o maior uuid
  created_at timestamptz,
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

-- 3. Solicitações de amizade
CREATE TABLE friend_requests (
  id uuid PK,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  status text DEFAULT 'pending',  -- pending|accepted|declined|cancelled
  created_at timestamptz,
  responded_at timestamptz,
  UNIQUE(from_user, to_user)
);

-- 4. Convites pra sala
CREATE TABLE room_invites (
  id uuid PK,
  room_id uuid NOT NULL REFERENCES training_rooms,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  station_id uuid NOT NULL,
  status text DEFAULT 'pending',  -- pending|accepted|declined|cancelled|expired
  created_at timestamptz,
  responded_at timestamptz
);

-- 5. Notificações
CREATE TABLE notifications (
  id uuid PK,
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz
);
```

Mais: RLS estrito (cada usuário só vê o que lhe diz respeito), realtime habilitado em `notifications`, `room_invites` e `friend_requests`, e índices nas FKs.

### Frontend

- **Nova rota:** `src/routes/app.amigos.tsx` (3 abas).
- **Edição em:** `src/routes/app.perfil.tsx` (campo @username com validação ao vivo).
- **Componentes novos:**
  - `NotificationBell.tsx` (sino + dropdown) — montado em `src/routes/app.tsx`.
  - `InviteFriendToRoomDialog.tsx` (passo checklist → passo amigo → envia).
  - `FriendSearchInput.tsx`.
- **Banco de Checklists:** botão extra "Convidar amigo" nos cards e no modal "Ver todas".
- **Sala do candidato:** já oculta o título; só garantir que a especialidade aparece com o chip colorido (e nada além disso).

### Sincronização

- Sino: subscription em `notifications` (filtro `user_id=eq.{me}`).
- Lista de convites: subscription em `room_invites`.
- Quando o convidado aceita, ele é navegado pra `/app/sala/$code/candidato`, e a sala (já com realtime existente) atualiza pro ator automaticamente.

## Fora de escopo (deixado pra depois)

- Notificações por WhatsApp / e-mail (você escolheu "só in-app").
- Convite com agendamento futuro.
- Convite em massa / grupos de estudo.
- Bloquear usuário.

## Entrega

1. Migration (tabelas + RLS + realtime).
2. Username em perfil.
3. Página `/app/amigos` (3 abas + ações).
4. Sino de notificações no header.
5. Botão "Convidar amigo" no Banco de Checklists + diálogo do fluxo.
6. Rota de aceite → sala como candidato (com checklist invisível, só especialidade).

Posso seguir?