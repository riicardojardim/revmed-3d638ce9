## Painel Admin Completo

Reorganização e expansão do painel `/app/admin` para que o administrador tenha controle total sobre o site, planos, usuários, pagamentos, integrações de tracking e aparência — tudo direto pela UI, sem precisar mexer em código.

### Visão geral das novas abas

```text
/app/admin
 ├─ Visão geral        (dashboard com gráficos)
 ├─ Usuários           (gestão completa de contas)
 ├─ Planos             (CRUD de planos)
 ├─ Pagamentos         (assinaturas + financeiro)
 ├─ Conteúdo           (checklists, flashcards, resumos — já existe)
 ├─ Aparência          (logo, cores, identidade visual)
 ├─ Integrações        (Pixel Facebook, TikTok, GA4, etc.)
 └─ Configurações      (nome do site, textos legais, etc.)
```

### 1. Dashboard (Visão geral) com gráficos

KPIs e gráficos no topo do painel:
- Total de usuários · Ativos hoje · Novos nos últimos 7/30 dias
- MRR estimado (soma das assinaturas ativas pagas)
- Conversão: cadastrados vs. assinantes pagos
- Gráfico de barras: **assinaturas por plano** (qual plano vende mais)
- Gráfico de linha: **novas assinaturas por dia** (últimos 30 dias)
- Pizza: **pagos vs. trial vs. free**
- Top especialidades treinadas, top estações, engajamento (já existe parcial)

### 2. Usuários — gestão completa

Listagem (busca + filtros por plano, status, role) com ações por linha:
- Ver perfil completo (estatísticas, histórico)
- **Mudar e-mail** (via server function admin)
- **Resetar senha** (envia link de recuperação OU define senha temporária)
- **Mudar role** (aluno / professor / admin)
- **Adicionar dias** ao plano atual ("+30 dias grátis")
- **Remover dias** do plano
- **Atribuir plano** (escolher plano + duração em dias)
- **Cancelar assinatura**
- **Excluir usuário**
- Mostrar: data de criação, último login, plano atual, data de expiração, status de pagamento

Criar usuário manualmente (modal): e-mail, nome, senha temporária, role, plano inicial.

### 3. Planos — CRUD completo

Lista de planos com:
- Criar novo plano (nome, slug, preço, descrição, features, dias de trial, permissões `allows_candidato` / `allows_ator`, ativo)
- Editar plano existente
- Arquivar/desativar
- Excluir (com checagem se há assinaturas ativas)
- Reordenar para exibição

### 4. Pagamentos / Assinaturas

Aba dedicada com:
- Tabela de **todas as assinaturas**: usuário, plano, status (active/trialing/canceled), início, fim, valor
- Filtros: pagos, em trial, expirados, cancelados
- Export CSV
- Resumo financeiro: receita do mês, projeção, churn
- Histórico por usuário (clica e abre detalhe)

> Observação: como ainda não há gateway de pagamento conectado, "pago" hoje significa "assinatura ativa cadastrada manualmente pelo admin". Quando integrar Stripe/Paddle no futuro, os webhooks alimentam essa mesma tabela.

### 5. Aparência — identidade visual editável

Editar via UI e salvar em uma tabela `site_settings`:
- **Logo** (upload para storage bucket público `site-assets`)
- **Favicon**
- **Cores principais** (color pickers — primary, mint, accent, background)
- **Nome do site** e tagline
- Preview em tempo real

As cores são aplicadas via CSS variables injetadas no `<head>` a partir das settings (override sobre `src/styles.css`).

### 6. Integrações — Pixels e analytics

Aba para colar IDs/scripts:
- **Facebook Pixel ID**
- **TikTok Pixel ID**
- **Google Analytics 4 (GA4)** — measurement ID
- **Google Tag Manager**
- **Meta Conversions API** (token opcional)
- Campo livre "Scripts customizados no `<head>`" e "no `</body>`"

Os snippets são injetados no `__root.tsx` carregando as settings, sem rebuild.

### 7. Configurações gerais

- Nome do site, descrição padrão (SEO), e-mail de contato
- Textos legais (termos, privacidade) — editor markdown
- Mensagens do sistema (boas-vindas, e-mails)

---

### O que vai mudar no banco

Novas tabelas e ajustes:
- `site_settings` (singleton): logo_url, favicon_url, colors jsonb, site_name, tagline, fb_pixel_id, tiktok_pixel_id, ga4_id, gtm_id, custom_head_html, custom_body_html, terms_md, privacy_md
- Bucket de storage `site-assets` (público) para logo/favicon
- Coluna `last_sign_in_at` lida da `auth.users` via server function admin (já existe nativamente)
- RLS: leitura pública de `site_settings` (campos públicos), escrita só para admin

### O que vai mudar no código

- `src/routes/app.admin.tsx` — refatorar como layout com sub-rotas + sidebar de navegação interna
- Novas rotas: `app.admin.usuarios.tsx` (já existe — turbinada), `app.admin.planos.tsx`, `app.admin.pagamentos.tsx`, `app.admin.aparencia.tsx`, `app.admin.integracoes.tsx`, `app.admin.configuracoes.tsx`
- `app.admin.index.tsx` — virar dashboard real com gráficos (usar `recharts`, já comum no projeto)
- Server functions admin (`*.functions.ts`) usando `supabaseAdmin` para: criar usuário, mudar e-mail, resetar senha, ajustar dias de plano, atribuir plano, etc. — todas protegidas por checagem de `has_role(uid, 'admin')`
- `__root.tsx` — carregar `site_settings` no SSR e injetar cores + pixels + scripts
- Hook `useSiteSettings()` para componentes que precisam do logo/cores

### Entrega em fases

Para não virar uma PR monstruosa, sugiro entregar em 3 etapas (cada uma já útil sozinha):

1. **Fase 1 — Fundação + Usuários + Planos**
   Tabela `site_settings`, refator da navegação do admin, gestão completa de usuários (todas as ações) e CRUD de planos.

2. **Fase 2 — Pagamentos + Dashboard com gráficos**
   Aba de pagamentos/assinaturas e dashboard rico com gráficos.

3. **Fase 3 — Aparência + Integrações + Configurações**
   Editor de logo/cores, pixels (FB/TikTok/GA4) e textos legais.

Se aprovar, começo já pela **Fase 1**. Quer assim, ou prefere uma ordem diferente?
