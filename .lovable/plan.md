# Responsividade Tablet — Sweep Completo

Você está vendo o preview em **768px** (tablet) e várias seções estão estourando: texto cortando, cards apertados, mockup mal posicionado no Hero. Vou tratar tablet (`md:` 768–1023) como uma faixa própria — não como "desktop pequeno".

A estratégia geral em todas as telas será a mesma:
- Layouts em grid 2/3 colunas viram **1 coluna empilhada** no tablet (quebra só em `lg:` 1024+).
- Fontes do tipo `text-5xl/6xl` caem para `text-3xl/4xl` no tablet.
- Padding/gaps reduzidos (`md:p-6` em vez de `md:p-10`).
- Botões/CTAs ganham `w-full` ou empilham quando o texto não cabe lado a lado.
- Mockups e ilustrações vão **abaixo** do texto principal (ordem natural do fluxo) até `lg:`.

## Fase 1 — Landing page (`/`)

A página inteira (`src/routes/index.tsx`, ~1300 linhas) precisa de passada seção por seção:

1. **Hero**: mockup vai pra baixo do título no tablet, botões abaixo do mockup, fontes reduzidas, KPI tiles em 2 colunas (não 4).
2. **Faixa de stats "+320 / +1.2k / 87% / 10min"** — visível na sua screenshot estourando: vira grid 2x2 no tablet em vez de 4 colunas.
3. **Como Funciona** (`ComoFunciona.tsx`) — passos empilhados, ícones e tipografia menores.
4. **Comparativo** — tabela responsiva, scroll horizontal se necessário.
5. **Depoimentos** (`Depoimentos.tsx`) — cards do marquee com largura adequada pra tablet.
6. **Mentoria** — já está OK (usa `lg:` no grid), só ajuste fino de fontes.
7. **Investimento/Planos** — cards 1 coluna no tablet (não 3).
8. **FAQ** — padding e largura.
9. **CTA final "Pronto pra treinar"** — fonte menor, botão tamanho proporcional (sua screenshot mostra ele OK mas o título está enorme).
10. **Footer** — colunas reorganizadas (2 em vez de 4 no tablet).

## Fase 2 — Shell do app autenticado

- **AppLayout** (`app.tsx`) + **AppSideNav** — sidebar deve **colapsar/recolher** no tablet (atualmente o sidebar fixo come muita largura).
- **Topbar** do app: ações resumidas, evitar overflow.
- **Dashboard** (`app.index.tsx`) — KPIs em 2 colunas, painéis lado-a-lado viram empilhados.

## Fase 3 — Páginas principais do usuário

Cobertura sistemática em:
- `app.checklists.tsx`, `app.flashcards.index.tsx`, `app.flashcards.desempenho.tsx`
- `app.resumos.tsx`, `app.resumos.$id.tsx`
- `app.videoaulas.tsx`, `app.aulas.tsx`
- `app.sala.$code.{index,banca,candidato,paciente}.tsx` (sala de simulação)
- `app.simulacao.$id.tsx`, `app.resultado.$id.tsx`, `app.historico.tsx`
- `app.progresso.tsx`, `app.cronograma.tsx`
- `app.perfil.tsx`, `app.comunidade.tsx`, `app.novidades.tsx`, `app.suporte.tsx`, `app.feedback.tsx`

## Fase 4 — Admin

Cobertura em todas as `app.admin.*.tsx` (usuários, estações, flashcards, resumos, vídeoaulas, planos, pagamentos, aparência, conteúdo, integrações). Tabelas viram cards no tablet quando muitas colunas; ações dos cards reorganizadas.

## Fase 5 — Páginas públicas de auth

`login.tsx`, `cadastro.tsx`, `reset-password.tsx`, `convite.$code.tsx`, `e.$code.tsx`, `app.entrar.*` — ajuste do card central + ilustração lateral.

---

## Como vou executar

Isso são **50+ arquivos** e ~15.000 linhas. **Não vou tentar fazer tudo em uma única resposta** — o resultado seria superficial e quebraria coisas. Proponho dois caminhos:

**Opção A — Fazer agora a Fase 1 inteira (Landing)**, que é onde a maior parte dos visitantes vão entrar pelo tablet, e te entregar isso polido nesta rodada. Depois seguimos Fase 2/3/4 nas próximas mensagens, uma por vez.

**Opção B — Fazer Fase 1 (Landing) + Fase 2 (Shell + Dashboard)** nesta rodada, deixando o app autenticado já navegável em tablet, e depois entrar nas telas internas.

Recomendo **Opção A** — landing é a porta de entrada e tem mais variedade visual (cada seção é diferente); fazendo bem feito ela já me dá os padrões (breakpoints, tamanhos de fonte, gaps) que reaplico mecanicamente nas telas internas depois. Me diz qual prefere e eu sigo.
