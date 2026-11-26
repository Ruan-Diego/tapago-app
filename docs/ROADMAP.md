# Roadmap de execução — Tá pago

Baseado em [`PRD.md`](PRD.md) e no protótipo em [`design/`](../design/README.md). Este arquivo é o guia operacional para o agente de IA que vai implementar o app, fase por fase.

**Abas deste documento**

0. [Decisões fechadas](#0-decisões-fechadas)
1. [Protocolo de execução (leia antes de qualquer fase)](#1-protocolo-de-execução)
2. [Visão geral das fases](#2-visão-geral-das-fases)
3. [Fases detalhadas (F0 a F8)](#3-fases-detalhadas)
4. [🧑 Intervenção humana](#4--intervenção-humana)
5. [Registro de progresso](#5-registro-de-progresso)

---

## 0. Decisões fechadas

Estas decisões foram tomadas depois da primeira versão do PRD, e o `PRD.md` já foi ajustado a elas. As imagens em `docs/img/` e o `PRD.pdf` ainda mostram a versão antiga. **Se algo divergir, vale o que está aqui.**

| Tema | Decisão | O que muda em relação à primeira versão do PRD |
| --- | --- | --- |
| Contas | **Independentes.** Cada pessoa tem as próprias atividades, loja, saldo e histórico | Nada compartilhado entre contas |
| Plataformas | **Android + web.** Sem iOS | Sem TestFlight, conta Apple, APNs ou Live Activity. Android instalado por APK |
| Web | **Expo Router web** (mesmo código do Android) | React + Vite descartado (ver nota abaixo) |
| Nome | **Tá pago**; a aba se chama **Atividades** | — |
| Registrar negativa | **Igual à positiva: 1 toque, sem confirmação.** O erro se corrige com o desfazer de 10 s (F4) | — |
| Ambientes | **Um projeto Firebase só** (`tapago`) | Sem dev/prod. Testes automatizados rodam no Emulator Suite local |
| Cadastro | **Aberto:** qualquer pessoa pode criar conta | Sem restrição a e-mails. Cada usuário só lê e escreve em `users/{uid}` |
| Plano Firebase | **Só Spark (gratuito), sem cartão.** Nunca usar nada que exija o Blaze | Sem Cloud Functions, Cloud Tasks, Storage nem FCM enviado por servidor (detalhes abaixo) |

**O que o plano Spark muda**

| Recurso | Como fica |
| --- | --- |
| Avisos do timer | **Só notificações locais**, sem servidor. Todo celular Android que vê a sessão (o que iniciou, ou outro em que o app foi aberto depois) agenda os avisos sozinho. Na web, o aviso aparece só com a aba aberta (alerta na página + notificação do navegador) |
| Aviso em aparelho fechado que não iniciou o timer | **Não existe.** Se o timer começou na web, o celular só avisa se o app for aberto pelo menos uma vez depois disso |
| Foto de perfil | Sem Storage. A foto é reduzida para ~256 px (JPEG, ≤ 150 KB) e salva no Firestore em `users/{uid}/avatar/current`. Sem foto, usa a da conta Google ou as iniciais |
| Resumo semanal (F5) | Notificação local agendada no Android (domingo à noite) que abre o Histórico |
| Funciona normal | Auth (e-mail e Google), Firestore com offline, Hosting, regras, Crashlytics, Emulator Suite |
| Cotas grátis | 50 mil leituras e 20 mil escritas por dia no Firestore. Sobra para 2 pessoas, desde que as listas usem paginação e os listeners não sejam recriados à toa |

**Por que Expo e não React + Vite na web.** Como o Android precisa de React Native (Expo) de qualquer jeito, com Expo na web as telas são escritas uma vez e rodam no Android e no navegador. Com React + Vite, cada tela seria feita duas vezes (React Native e React DOM). A lógica (`packages/core`) e o acesso ao Firebase (`packages/data`) seriam compartilhados nos dois casos. Vite só compensaria se o app fosse só web.

---

## 1. Protocolo de execução

Regras obrigatórias para o agente que executar este roadmap.

### 1.1 Uma fase inteira, sem pausa

- **O agente executa a fase inteira de uma vez, do primeiro ao último item, sem parar para pedir confirmação no meio.** Não pergunte "posso continuar?", "quer que eu siga para o próximo item?" ou similares.
- Decisões técnicas pequenas (nome de arquivo, biblioteca equivalente, estrutura de pasta) são tomadas pelo agente, seguindo o PRD e a [aba 0](#0-decisões-fechadas), e registradas em [Registro de progresso](#5-registro-de-progresso) → "Decisões tomadas".
- **Nunca introduzir algo que exija o plano Blaze** (Cloud Functions, Cloud Tasks, Storage, extensões pagas). Se um requisito parecer exigir, usar a alternativa da [aba 0](#0-decisões-fechadas) e registrar.
- Se um item depende de uma ação humana ainda não feita (ver [aba 4](#4--intervenção-humana)), o agente **não para**: usa o Firebase Emulator Suite, valores de exemplo em `.env.example` ou um stub claramente marcado com `// TODO(humano): <HUM-xx>`, segue com o resto da fase e lista a pendência no relatório final.
- O agente só interrompe a fase antes do fim em dois casos:
  1. Um bloqueio que impede **todos** os itens restantes (ex.: o repositório não instala e não há como contornar).
  2. Uma ação destrutiva ou irreversível fora do repositório (apagar dados no projeto Firebase, mudar o plano de cobrança).

### 1.2 Um projeto só: cuidado com dados reais

Como existe um único projeto Firebase, ele é ao mesmo tempo o de desenvolvimento e o de uso real.

- Testes automatizados (core e regras) rodam **sempre no Emulator Suite**, nunca no projeto real.
- O app em modo de desenvolvimento pode apontar para o emulador com `EXPO_PUBLIC_USE_EMULATOR=true`.
- Deploy de regras só depois de os testes de regras passarem no emulador.
- O agente nunca apaga coleções nem documentos no projeto real.

### 1.3 Antes de começar a fase

1. Ler o PRD (seções citadas na fase), a [aba 0](#0-decisões-fechadas) e as telas do `design/canvas/` correspondentes.
2. Conferir na [aba 4](#4--intervenção-humana) quais itens humanos a fase exige e se estão marcados como feitos. Os que faltarem viram pendências no relatório; não são motivo para parar.
3. Atualizar o [Registro de progresso](#5-registro-de-progresso): fase em andamento.

### 1.4 Durante a fase

- **Não fazer commit nem push durante a fase.** Todo o trabalho fica no working tree até o fim.
- Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test` (e os testes de regras no emulador, quando existirem) antes de considerar a fase pronta. Erros encontrados são corrigidos dentro da própria fase.
- Marcar cada item da fase como `[x]` neste arquivo assim que concluído.

### 1.5 No fim da fase (obrigatório)

Ao concluir todos os itens, o agente entrega um relatório curto e **termina perguntando se pode fazer o commit e o push**:

```
## Fase Fx concluída

**Feito:** <lista curta das entregas>
**Verificação:** lint ✅ · typecheck ✅ · testes ✅ (N passaram) · regras ✅
**Pendências humanas:** HUM-xx (motivo) … ou "nenhuma"
**Desvios do PRD:** … ou "nenhum"
**Critério de saída (marco):** atingido / depende de uso real (o que falta)

Arquivos alterados: <resumo do git status>

Posso fazer o commit e o push desta fase para a `main`?
```

- Só depois de um "sim" explícito o agente faz o commit e o push.
- Mensagem de commit: `feat(fx): <resumo da fase>`, em português, **sem nenhuma linha de atribuição ao Claude** (nada de `Co-Authored-By` nem "Generated with Claude Code").
- Se o usuário pedir mudanças, o agente aplica, roda a verificação de novo e pergunta outra vez.
- Depois do push, a fase seguinte só começa quando o usuário pedir.

---

## 2. Visão geral das fases

Cerca de 12 semanas do zero ao uso diário, com o MVP em uso a partir da semana 4.

| Fase | Nome | Duração estimada | Marco (critério de saída) | Requisitos |
| --- | --- | --- | --- | --- |
| F0 | Fundação | 1 semana | As 2 pessoas instalam (APK + web) e entram no app | AUTH-01, 02, 04, 05 |
| F1 | MVP | 3 semanas | 1 semana de uso real sem perder dados | AUTH-06, ACT-01–04, ACT-07, SHOP-01–02, HIST-02, HIST-08 |
| F2 | Inventário e timer | 2 semanas | Aviso chega no celular com o app fechado; na web, com a aba aberta | SHOP-03–04, INV-01–02, TMR-01–05, NOTIF-01–03 |
| F3 | Onboarding e histórico completo | 2 semanas | Pessoa 2 configura sozinha em 2 min | ONB-01–05, PROF-01–02, HIST-01, HIST-03–07 |
| F6 | Hábitos diários e sequências | 1 semana | Hábito completo paga o bônus uma vez; positivas sobem com a sequência e negativas encarecem a cada registro | HAB-01–03, SEQ-01–04 |
| F7 | Missões diárias | 1 semana | Uma missão nova por dia, igual no Android e na web, com o bônus pago uma vez | MIS-01–04 |
| F8 | Animações e visual (UX/UI) | 1 semana | Troca de abas com a gota de vidro no Android e na web, fluida e aprovada pelo usuário | ANIM-01–05 |
| F4 | Polimento | 1 semana | 1 mês de uso diário sem travar | ACT-05 + não funcionais |
| F5 | Extras | quando der | Prioridade pelo uso real | NOTIF-04–05, ACT-06, ONB-06, PROF-03, AUTH-05 (excluir) |

**Ordem de execução:** F0 → F1 → F2 → F3 → **F6 → F7 → F8** → F4 → F5. A tabela está nessa ordem; F6, F7 e F8 entraram depois, e os números evitam renumerar as outras fases.

- O livro-caixa (F1) fica sólido antes de sessão e notificação (F2).
- F6 vem antes de F7, que usa o lançamento de bônus criado nela.
- F6 e F7 vêm antes do polimento, para o desfazer e a validação de saldo (F4) já cobrirem bônus e valores variáveis. As duas dependem só da F1 e podem ser antecipadas se o usuário pedir.
- F8 vem depois das telas novas, para animar tudo de uma vez, e antes da F4, que confere a acessibilidade do visual final.

---

## 3. Fases detalhadas

### F0 · Fundação

**Objetivo:** monorepo funcionando, Firebase configurado, login aberto e builds instaláveis no Android e na web.
**PRD:** Arquitetura técnica, Requisitos não funcionais, Modelo de dados → Regras de segurança.
**Design:** `Marca.dc.html` (tokens, fontes, ícone).
**Intervenção humana necessária:** HUM-01 a HUM-06 (ver [aba 4](#4--intervenção-humana)).

**Base do projeto**
- [x] Monorepo com pnpm workspaces + Turborepo: `apps/app`, `packages/core`, `packages/data`, `packages/ui`, `firebase/`
- [x] TypeScript estrito compartilhado (`tsconfig.base.json`)
- [x] ESLint + Prettier; scripts `lint`, `typecheck`, `test`, `build` no Turborepo
- [x] Vitest configurado em `packages/core`
- [x] App Expo (SDK atual) com Expo Router, rodando em Android e web (sem configuração de iOS)
- [x] `.env.example` com todas as variáveis (config Firebase web, ID OAuth do Google, `EXPO_PUBLIC_USE_EMULATOR`) e `.gitignore` cobrindo `.env*` e `google-services.json`
- [x] CI no GitHub Actions: install, lint, typecheck, test em cada push e PR

**Firebase**
- [x] `firebase.json` + `.firebaserc` apontando para o projeto único `tapago-51ecc` (Spark)
- [x] Emulator Suite configurado (Auth e Firestore) e script `pnpm emulators`
- [x] `firestore.rules` fechadas por `uid` (`users/{uid}/**` só para o dono)
- [x] Cadastro aberto: qualquer pessoa cria conta; o documento `users/{uid}` é criado no primeiro login
- [x] Testes de regras com `@firebase/rules-unit-testing` em `firebase/tests/` (usuário A não lê nem escreve dados do usuário B)
- [x] `packages/data`: camada de acesso com React Native Firebase no Android e JS SDK modular (`persistentLocalCache`) na web, mesma interface

**Autenticação** (AUTH-01, 02, 04, 05)
- [x] Telas: entrar, criar conta, esqueci a senha
- [x] Login com e-mail e senha; sessão mantida ao reabrir
- [x] Login com Google no Android e na web
- [x] Recuperar senha pelo e-mail do Firebase
- [x] Sair: limpa o cache local e cancela as notificações agendadas no aparelho

**Design system** (`packages/ui`)
- [x] Tokens: cores (Tinta, Papel, Branco, Grafite, Borda, Lazer, Ruim, Destaque `#D4FF3A`), tipografia, espaçamento, raios
- [x] Fontes: Space Grotesk, Inter, JetBrains Mono (via `expo-font`)
- [x] Componentes base: botão (primário, secundário, contorno), cartão (normal e tracejado para negativos), campo de texto, abas, valor monetário (`Intl`, pt-BR)
- [x] Layout web com menu lateral; layout mobile com barra de abas

**Distribuição**
- [x] `eas.json` com perfis `development` e `preview` gerando **APK** para Android
- [x] Config plugins do React Native Firebase no `app.config.ts` (só Android; módulos Auth, Firestore e Crashlytics)
- [x] Deploy da web no Firebase Hosting (`firebase deploy --only hosting`)
- [x] Workflow de CI publicando Hosting e regras no push da `main` (usa segredo HUM-05)

**Critério de saída:** as 2 pessoas instalam o APK e abrem a web, e entram cada uma com a própria conta (HUM-06).

---

### F1 · MVP

**Objetivo:** livro-caixa sólido, atividades +/−, loja com compra direta e histórico básico.
**PRD:** Conceitos e regras de negócio (R1–R12), Modelo de dados, "Como cada ação escreve".
**Design:** `Main.dc.html` (abas Atividades, Loja, Histórico), `Loja.dc.html`, `Historico.dc.html`, `Web.dc.html`.
**Intervenção humana necessária:** nenhuma para código. HUM-07 (1 semana de uso real) para o marco.

**Livro-caixa** (`packages/core`)
- [x] Tipos e esquemas Zod: `User`, `Activity`, `ShopItem`, `Entry`, `InventoryItem`, `Session`, `Daily`
- [x] Valores em centavos inteiros (R1); formatação "R$ 18"
- [x] Funções puras: saldo a partir dos lançamentos, agregados `daily`, estatísticas do período, meta semanal (R11), dia limpo e sequência (R12) no fuso do usuário
- [x] Testes Vitest cobrindo todas as regras R1–R12 aplicáveis

**Repositórios** (`packages/data`)
- [x] `activities`, `shop`, `entries`, `profile` com listeners em tempo real
- [x] Um `writeBatch` por ação: lançamento + saldo + `daily` (escrita otimista, funciona offline)
- [x] Cada lançamento copia nome e valor (R2)
- [x] Mesmos dados no Android e na web em até 2 s (AUTH-06)
- [x] Leituras econômicas (cota Spark): histórico lido de `daily`, lançamentos sempre paginados

**Atividades** (ACT-01–04, ACT-07)
- [x] Criar atividade: tipo +/− escolhido antes; rótulos "Você ganha" / "Você perde"
- [x] Editar e arquivar (R10); lançamentos antigos intactos
- [x] Registrar com 1 toque, **positiva ou negativa, sem confirmação**; saldo atualiza em < 100 ms
- [x] Listas "Ganham" e "Custam"; negativas com borda tracejada, botão de contorno e sinal "−"
- [x] Resumo do dia no topo (ganhos, perdas, quantidade)

**Loja** (SHOP-01–02)
- [x] Criar, editar e arquivar itens (nome, preço, duração)
- [x] Comprar: bloqueado se saldo < preço, mostrando quanto falta (R3)
- [x] Nesta fase a compra vai direto para o inventário (o modal "usar agora / guardar" é F2)

**Histórico básico** (HIST-02, HIST-08)
- [x] Cartões: ganhou, perdeu, gastou, tempo bom, lazer, tempo perdido, com variação contra o período anterior
- [x] Atividade recente com paginação

**Regras e testes**
- [x] Regras de `entries`: só `create`; `update` só em `minutes` de `use`; nunca `delete`
- [x] Validação de campos (valor 1–1.000.000, minutos 1–1.440, nome 1–60)
- [x] Testes de regras cobrindo acesso de outro `uid`, campos inválidos e delete bloqueado

**Critério de saída:** 1 semana de uso real pelas 2 pessoas, saldo igual no Android e na web (HUM-07).

---

### F2 · Inventário e timer

**Objetivo:** comprar e usar agora ou guardar, timer confiável entre aparelhos e avisos locais, sem servidor.
**PRD:** Timer e notificações, regras R4–R9.
**Design:** `Main.dc.html` (modal de compra, recibo, inventário, mini timer), `Inventario.dc.html`, `WebInventario.dc.html`, `Notificacoes.dc.html`.
**Intervenção humana necessária:** nenhuma para código. HUM-08 para o marco.

**Inventário** (SHOP-03–04, INV-01–02)
- [x] Modal de compra: "Usar agora" ou "Guardar no inventário" (R4); "Usar agora" bloqueado com timer ativo (R5)
- [x] Recibo "Tá pago." com item, duração, valor, saldo restante e status
- [x] Lista do inventário (mais recente primeiro, data e valor pago)
- [x] Começar item guardado: inicia o timer e remove do inventário

**Timer** (TMR-01–05)
- [x] `state/session` com `id`, `endsAt`, `status`, `remainingMs`, `originDevice`
- [x] Contagem calculada por `endsAt − agora`; sobrevive a fechar o app
- [x] Pausar (congela restante) e retomar (recalcula fim) (R7)
- [x] Encerrar antes: registra minutos reais, sem reembolso (R6); tempo conta no uso (R9)
- [x] Ao abrir depois do fim sem encerrar, fecha a sessão com duração completa
- [x] Mini timer visível nas outras abas, com toque levando ao Inventário
- [x] Sincronização: iniciado no Android aparece na web e vice-versa

**Avisos no Android** (NOTIF-01, 02)
- [x] `expo-notifications`: "Faltam 5 minutos" (só sessões > 5 min) e "Tempo esgotado"
- [x] Qualquer aparelho Android que receba a sessão (ao iniciar, ao abrir o app ou pelo listener) agenda os avisos, identificados pelo `id` da sessão para não duplicar
- [x] Cancelar e reagendar quando a sessão muda (pausar, retomar, encerrar, outro aparelho mexeu)
- [x] Canal de notificação Android e permissão `POST_NOTIFICATIONS` (Android 13+); alarme exato quando permitido
- [x] Testes do agendador (cálculo dos horários e reagendamento) em `packages/core`

**Avisos na web** (NOTIF-01, 03)
- [x] Com a aba aberta: alerta dentro da página + notificação do navegador (Notification API, com permissão), recalculados ao voltar para a aba
- [x] Aviso visível no timer da web: "O aviso só aparece com esta aba aberta"

**Critério de saída:** aviso chega no celular com o app fechado e na web com a aba aberta (HUM-08).

---

### F3 · Onboarding e histórico completo

**Objetivo:** a Pessoa 2 se configura sozinha; histórico com gráficos e filtros.
**PRD:** Jornadas (Primeiro uso, Revisão), requisitos ONB, PROF, HIST.
**Design:** `Onboarding.dc.html` e os passos `Onb*.dc.html`, `Comecar.dc.html`, `Perfil.dc.html`, `Historico.dc.html`, `WebHistorico.dc.html`, `WebOnboarding.dc.html`.
**Intervenção humana necessária:** nenhuma para código. HUM-09 para o marco.

**Onboarding** (ONB-01–05)
- [x] Boas-vindas + "como funciona" (2 telas)
- [x] Nome (obrigatório) e foto (opcional)
- [x] Presets de atividades + e −, valor ajustável com −/+; ≥ 1 positiva para seguir
- [x] Montar a loja com presets; ≥ 1 item para seguir
- [x] Permissão de notificação com contexto; "Agora não" não bloqueia
- [x] Tela final "Pronto" e `onboardingDone = true`

**Perfil** (PROF-01–02)
- [x] Nome e frase
- [x] Foto sem Storage: recortada em círculo, reduzida para ~256 px (JPEG, ≤ 150 KB) e salva em `users/{uid}/avatar/current`; sem foto, usa a da conta Google ou as iniciais
- [x] Regra: `avatar` só para o dono, com limite de tamanho
- [x] Meta semanal e preferências de notificação, válidas em todos os aparelhos

**Histórico completo** (HIST-01, 03–07)
- [x] Filtro 7/30/90 dias aplicado a todos os blocos
- [x] Divisão do tempo bom × lazer × ruim, com a frase "para cada 1 h de lazer…"
- [x] Gráfico de saldo diário (react-native-svg)
- [x] Horas por semana (8 semanas, 3 barras)
- [x] Mapa de constância (13 semanas): sequência, recorde, dias limpos
- [x] Rankings: tempo por atividade, por lazer, onde perdeu
- [x] Painel do histórico em tela grande na web

**Critério de saída:** a Pessoa 2 configura sozinha em 2 min (HUM-09).

---

### F6 · Hábitos diários e sequências

**Objetivo:** atividades positivas podem ser hábitos diários com bônus e valem mais a cada dia de sequência; as negativas custam mais a cada registro.
**Quando:** depois da F3 e antes da F4.
**PRD:** Conceitos e regras de negócio, Modelo de dados. O PRD ainda não cobre esta fase: valem as regras abaixo, e o primeiro item as leva para lá.
**Design:** sem tela no protótipo; partir de `ActivitySheet`, `ActivityCard`, `EntryRow` e dos componentes de `packages/ui`.
**Intervenção humana necessária:** nenhuma para código. HUM-14 para o marco.

**Regras**

- **R13 — Hábito diário** (só positivas). Tem meta de registros por dia (1 a 20) e um bônus em reais. O registro que atinge a meta paga o valor normal e gera **também** o bônus, em lançamento separado. O bônus sai no máximo uma vez por dia em cada atividade; registros além da meta pagam só o valor normal. O progresso zera na virada do dia, no fuso do usuário. O bônus é fixo: não cresce com a sequência.
- **R14 — Sequência positiva.** Cada atividade positiva tem o próprio "aumento por sequência" (pode ser R$ 0) e a própria contagem. Valor do dia = `valor + aumento × dias seguidos anteriores`. Ex.: R$ 100 com aumento de R$ 10 paga 100, 110, 120… Todos os registros do mesmo dia pagam o mesmo valor. Um registro no dia mantém a sequência, mesmo em hábito que não bateu a meta. Um dia inteiro sem registro faz voltar ao valor inicial.
- **R15 — Escalada negativa.** Cada registro soma o valor inicial ao custo: `valor × (registros desde o último zeramento + 1)`. Ex.: R$ 70 custa 70, 140, 210, 280… Vale também para vários registros no mesmo dia. Não zera com o tempo: **só o usuário zera**, na própria atividade.
- **R16 — Teto e cópia.** O valor calculado respeita `LIMITS.valueMax` (R$ 10.000). O lançamento guarda o que foi de fato pago ou cobrado (R2); mudar valor, aumento, meta ou bônus não altera o passado.

**Exemplo no histórico** — escovar os dentes: R$ 50, 3 vezes por dia, bônus de R$ 50, aumento de sequência R$ 0.

| Lançamento | Valor |
| --- | --- |
| Escovar os dentes | + R$ 50 |
| Escovar os dentes | + R$ 50 |
| Escovar os dentes | + R$ 50 |
| **Bônus de hábito completo** · Escovar os dentes (3 de 3 no dia) | + R$ 50 |

**Documentação**
- [x] Levar R13–R16 e os requisitos HAB-01–03 e SEQ-01–04 para o `PRD.md`; ajustar R2, R11 e o modelo de dados

**Livro-caixa** (`packages/core`)
- [x] `Activity` ganha `habit?: { target, bonus }`, `streakStep` e `streak { days, lastDay }` (positivas) e `penaltyCount` (negativas); atividades já existentes ficam sem hábito, com aumento R$ 0 e contagens zeradas
- [x] Novo tipo de lançamento `bonus`, com a origem (hábito ou missão) e `minutes = 0`: soma no saldo, em `earned` e na meta semanal, sem contar como registro nem como tempo
- [x] Lançamentos `earn` e `loss` guardam o que explica o valor (valor inicial e nível da sequência ou da escalada)
- [x] Funções puras para o valor do dia, o custo atual, o progresso do hábito e o direito ao bônus
- [x] Testes de R13–R16: virada do dia e fuso, sequência quebrada, vários registros no dia, meta ultrapassada, teto

**Escritas** (`packages/data`)
- [x] Registrar atualiza a sequência ou a contagem da negativa no mesmo `writeBatch` do lançamento
- [x] Bônus em lote próprio (lançamento + saldo + `daily`) com id fixo `habit_{activityId}_{AAAA-MM-DD}`: se outro aparelho já pagou, só o lote do bônus é recusado e o registro fica
- [x] Anotar a limitação aceita: dois aparelhos offline podem pagar ou cobrar o mesmo nível de sequência ou de escalada

**Formulário** (HAB-01, SEQ-01)
- [x] HAB-01 · Criar e editar positiva: pergunta "É um hábito diário?"; se marcado, pede "Quantas vezes por dia?" e "Bônus ao completar", os dois obrigatórios
- [x] SEQ-01 · Criar e editar positiva: campo "Aumento por dia de sequência", próprio de cada atividade (sugestão inicial R$ 10, aceita R$ 0)
- [x] Negativa não mostra hábito nem aumento; o formulário avisa que o custo sobe a cada registro

**Atividades e histórico** (HAB-02–03, SEQ-02–04)
- [x] SEQ-02 · O cartão mostra o valor que o próximo toque vai pagar ou cobrar
- [x] HAB-02 · O cartão do hábito mostra o progresso do dia ("2 de 3") e o estado "completo"
- [x] SEQ-03 · O cartão positivo mostra os dias de sequência; o negativo, quantos registros houve desde o zeramento
- [x] SEQ-04 · "Zerar custo" na negativa, com confirmação: o próximo registro volta ao valor inicial e o histórico não muda
- [x] HAB-03 · O bônus aparece como linha própria no histórico, identificado como bônus, com aviso na tela quando é pago

**Regras e testes**
- [x] `firestore.rules`: validar os campos novos da atividade; aceitar `bonus` com `minutes = 0` e só com os campos dele
- [x] Testes de regras para os campos novos e para o bônus repetido

**Critério de saída:** uso real com um hábito completado, uma sequência que subiu e quebrou e uma negativa escalada e zerada, com saldo igual no Android e na web (HUM-14).

---

### F7 · Missões diárias

**Objetivo:** o app cria sozinho uma missão por dia, que paga bônus quando cumprida.
**Quando:** depois da F6 e antes da F4.
**PRD:** Conceitos e regras de negócio, Modelo de dados. O PRD ainda não cobre esta fase: valem as regras abaixo, e o primeiro item as leva para lá.
**Design:** sem tela no protótipo; cartão de missão no topo da tela de Atividades, com os componentes de `packages/ui`.
**Intervenção humana necessária:** nenhuma para código. HUM-15 para o marco.

**Regras**

- **R17 — Missão do dia.** Uma por dia, com 2 atividades positivas não arquivadas, sorteadas pelo app. Com menos de 2, não há missão. O par não repete o do dia anterior quando existe outra combinação possível.
- **R18 — Bônus fixo de R$ 100.** A missão é cumprida quando as 2 atividades têm pelo menos 1 registro no dia (em hábitos, 1 registro basta). O bônus é pago uma vez, em lançamento separado, e se soma ao valor das atividades e ao bônus de hábito. Registros feitos no dia antes de a missão ser criada também contam. Missão não cumprida expira na virada do dia, sem penalidade.
- **Sem servidor** (Spark): o app gera a missão ao abrir ou na virada do dia, com sorteio determinado por `uid` + data. A primeira missão gravada no dia vale para todos os aparelhos.

**Documentação**
- [x] Levar R17–R18 e os requisitos MIS-01–04 para o `PRD.md`, com o caminho `users/{uid}/missions/{AAAA-MM-DD}`

**Missões**
- [x] MIS-01 · Gerar a missão do dia: sorteio e checagem de cumprimento como funções puras em `packages/core`, com testes (semente, poucas atividades, não repetir, virada do dia)
- [x] Documento `users/{uid}/missions/{AAAA-MM-DD}`: ids e nomes das 2 atividades, bônus e `completedAt`; criado só se ainda não existir, em escrita separada dos registros
- [x] Atividade da missão arquivada antes de a missão ser cumprida é trocada por outra; sem substituta, a missão some
- [x] MIS-02 · Cartão "Missão do dia" com as 2 atividades, o que já foi feito e o bônus
- [x] MIS-03 · Pagar o bônus em lote próprio com id fixo `mission_{AAAA-MM-DD}` (lançamento + saldo + `daily` + `completedAt`), com aviso na tela
- [x] MIS-04 · O histórico mostra "**Bônus da missão do dia**" com os nomes das atividades

**Regras e testes**
- [x] `firestore.rules`: bloco de `missions` (só o dono; bônus sempre de R$ 100; nunca `delete`)
- [x] Testes de regras: outro `uid`, campos inválidos e bônus repetido

**Critério de saída:** missões diferentes em dias seguidos, iguais no Android e na web, e pelo menos uma cumprida com o bônus pago uma única vez (HUM-15).

---

### F8 · Animações e visual (UX/UI)

**Objetivo:** visual minimalista e moderno, com animações como as do iPhone: vidro translúcido e seleção que desliza como uma gota, no Android e na web.
**Quando:** depois da F7 e antes da F4.
**PRD:** Requisitos não funcionais (velocidade, acessibilidade, plataformas).
**Design:** referência de estilo é o iOS (efeito "Liquid Glass"). Galeria indicada pelo usuário: [Collect UI](https://collectui.com/). Os links específicos chegam pelo HUM-16 e entram na tabela abaixo; onde divergirem do protótipo em `design/`, valem as referências.
**Intervenção humana necessária:** HUM-16 antes de começar. HUM-17 para o marco.

| Referência | O que aproveitar |
| --- | --- |
| https://collectui.com/ | Inspiração geral: minimalista e moderno |

**O que foi tirado das referências** (sem os links do HUM-16, vale o estilo do iOS descrito nesta fase)

- Collect UI: só a direção geral, minimalista e moderno. Nenhuma tela específica foi copiada.
- iOS "Liquid Glass": barra flutuante e arredondada; vidro claro com desfoque, saturação, brilho na borda de cima e sombra suave; seleção em gota que estica no caminho e assenta com mola; botões que afundam ao toque; folha que sobe com mola e fecha arrastando.

**Requisitos**

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| ANIM-01 | Barra de abas (Android e web estreita) de vidro | Fundo translúcido com desfoque; o conteúdo passa por trás ao rolar |
| ANIM-02 | Gota na troca de aba | O indicador desliza do item antigo ao novo, esticando no caminho e assentando com mola; acompanha o dedo ao arrastar sobre a barra |
| ANIM-03 | Gota no menu lateral da web | Mesmo efeito na vertical, também ao navegar por teclado; resposta suave ao passar o mouse |
| ANIM-04 | Movimento consistente no resto do app | Abas segmentadas, botões, cartões, folhas, listas, avisos, saldo e transições de tela com as mesmas molas |
| ANIM-05 | Acessível e rápido | Respeita "reduzir movimento"; registrar continua em < 100 ms |

**Base** (`packages/ui`)
- [x] Antes de programar, resumir no registro de progresso o que será tirado de cada referência
- [x] Tokens de movimento (molas, durações, curvas) e de vidro (desfoque, opacidade, borda, brilho, sombra)
- [x] Componente de vidro com versão por plataforma: na web, `backdrop-filter` (distorção de lente só onde o navegador suportar); no Android, a melhor opção de desfoque compatível com o SDK. Onde não houver suporte (Android antigo, aparelho fraco), fundo translúcido sem desfoque (sem a distorção de lente: ver decisões)
- [x] Animações com `react-native-reanimated` (já no projeto); biblioteca nova só se funcionar no Android e na web

**Navegação** (ANIM-01–03)
- [x] `TabBar`: vidro, barra flutuante e indicador em gota, com arrastar entre abas
- [x] `Sidebar`: vidro, indicador em gota e estados de mouse e foco
- [x] Ajustar o espaçamento das telas para a barra flutuante não esconder conteúdo

**Resto do app** (ANIM-04)
- [x] `Tabs` com o mesmo indicador deslizante
- [x] Botões e cartões afundam ao toque e voltam com mola
- [x] `Sheet` sobe com mola e fecha arrastando para baixo
- [x] Saldo conta até o novo valor; lançamentos, itens e avisos entram e saem animados
- [x] Transições entre telas
- [x] Animar o que a F6 e a F7 criaram: progresso do hábito, sequência, bônus e missão cumprida

**Qualidade** (ANIM-05)
- [x] "Reduzir movimento" troca os efeitos por transições simples
- [x] Contraste ≥ 4,5:1 do texto sobre o vidro, com qualquer conteúdo atrás
- [ ] Animações não atrasam o toque nem a escrita; sem engasgos perceptíveis nos 2 celulares (meta: 60 quadros por segundo)
- [ ] Conferir no Chrome, Safari e Edge

**Critério de saída:** o usuário compara com as referências nos celulares e na web e aprova as animações (HUM-17).

---

### F4 · Polimento

**Objetivo:** confiabilidade e acabamento para uso diário prolongado.
**PRD:** Requisitos não funcionais, R8, Regras de segurança (`getAfter`).
**Intervenção humana necessária:** HUM-10 (Crashlytics), HUM-11 (feedback de uso real).

- [ ] Desfazer por 10 s com lançamento de estorno (ACT-05, R8), igual para positivas e negativas
- [ ] O desfazer também reverte a sequência ou a escalada (F6) e estorna o bônus de hábito ou de missão que deixou de valer (F6, F7); se a meta for atingida de novo no dia, o bônus volta a ser pago (revisar os ids fixos para isso)
- [ ] Regra de saldo com `getAfter()`: saldo muda exatamente pelo valor; `value` confere com `refId` (nas atividades, o valor calculado por R14 e R15; nos bônus, o do hábito ou o da missão); `purchase` só com saldo ≥ 0
- [ ] Testes de regras para a validação de saldo
- [ ] Acessibilidade: contraste ≥ 4,5:1, alvos ≥ 44 pt, labels para leitor de tela
- [ ] Crashlytics no Android
- [ ] Ícone do app e tela de abertura (a partir de `Marca.dc.html`)
- [ ] Rotina no app para recalcular o saldo a partir dos lançamentos (proteção contra corrupção)
- [ ] Conferir o consumo de leituras/escritas no console contra as cotas do Spark
- [ ] Ajustes da lista de feedback em HUM-11

**Critério de saída:** 1 mês de uso diário sem travar (HUM-12).

---

### F5 · Extras (quando der)

**Objetivo:** itens P2, priorizados pelo uso real. O usuário escolhe o subconjunto antes de iniciar (HUM-13); o agente executa o subconjunto escolhido inteiro, sem pausa.

- [ ] Resumo semanal (NOTIF-04): notificação local no Android no domingo à noite, abrindo o Histórico
- [ ] Timer na notificação fixa do Android (NOTIF-05)
- [ ] Widget na tela inicial do Android
- [ ] Reordenar atividades (ACT-06)
- [ ] Refazer onboarding pelo Perfil sem apagar dados (ONB-06)
- [ ] Exportar CSV (PROF-03)
- [ ] Excluir conta (AUTH-05, P2), apagando os dados pelo próprio app
- [ ] Lembrete diário opcional (notificação local)

---

## 4. 🧑 Intervenção humana

Ações que só você pode fazer: exigem login em contas, aceite de termos, aparelho físico ou decisão de produto. O agente **não espera** por elas no meio da fase (ver [1.1](#11-uma-fase-inteira-sem-pausa)); o ideal é fazê-las **antes** de pedir para a fase começar. O que faltar aparece como pendência no relatório final.

Legenda de quando: **Antes** = fazer antes de iniciar a fase · **Durante** = pode ser feito enquanto o agente trabalha · **Depois** = valida o marco da fase.

As decisões de produto já foram tomadas (ver [aba 0](#0-decisões-fechadas)). Tudo roda no plano Spark: nenhuma etapa pede cartão.

### F0 · Fundação

| ID | Quando | Ação | Onde | O que entregar ao agente | Feito |
| --- | --- | --- | --- | --- | --- |
| HUM-01 | Antes | Criar **um** projeto Firebase (`tapago`) no plano **Spark** | console.firebase.google.com | ID do projeto | [x] |
| HUM-02 | Antes | Ativar Authentication (E-mail/senha e Google) e criar o banco Firestore (região, ex.: `southamerica-east1`) | Console Firebase | Região escolhida | [x] |
| HUM-03 | Antes | Registrar os apps **Web** e **Android**; baixar `google-services.json` e copiar a config web | Console → Configurações do projeto | `google-services.json` em `apps/app/` (fora do git) e `.env` preenchido | [x] |
| HUM-04 | Antes | `firebase login` e `eas login` no terminal (são interativos) | Terminal | — | [x] |
| HUM-05 | Durante | Google Sign-In: adicionar o SHA-1/SHA-256 do Android (o agente mostra com `eas credentials`) e conferir o OAuth client ID web; adicionar o domínio do Hosting em Auth → Domínios autorizados. Criar a conta de serviço de deploy e salvar no GitHub como `FIREBASE_SERVICE_ACCOUNT` (e `EXPO_TOKEN`) | Console Firebase / Google Cloud IAM / GitHub → Settings → Secrets | Client ID no `.env`; nomes dos segredos | [ ] |
| HUM-06 | Depois | Instalar o APK nos 2 celulares Android, abrir a web e entrar com cada conta | Aparelhos | "Os 2 entraram" ✅ | [ ] |

### F1 · MVP

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-07 | Depois | Usar o app por **1 semana** (as 2 pessoas), conferir saldo igual no Android e na web e anotar problemas | Uso real | [ ] |

### F2 · Inventário e timer

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-08 | Depois | Nos 2 celulares: permitir notificações e tirar o app da otimização de bateria. Testar: timer iniciado no celular avisa com o app fechado; timer na web avisa com a aba aberta | Aparelhos | [ ] |

### F3 · Onboarding e histórico

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-09 | Depois | A Pessoa 2 faz o onboarding sozinha, cronometrando (meta: 2 min) | Aparelho da Pessoa 2 | [ ] |

### F6 · Hábitos diários e sequências

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-14 | Depois | Instalar o APK novo nos 2 celulares **antes de usar** (a versão antiga não lê o lançamento de bônus). Completar um hábito, deixar uma sequência subir e quebrar, escalar e zerar uma negativa | Aparelhos | [ ] |

### F7 · Missões diárias

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-15 | Depois | Instalar o APK novo nos 2 celulares, acompanhar as missões por alguns dias no Android e na web e cumprir pelo menos uma | Uso real | [ ] |

### F8 · Animações e visual

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-16 | Antes | Enviar os links (ou vídeos de tela) das referências, dizendo o que gostou em cada um | Chat | [ ] |
| HUM-17 | Depois | Testar as animações nos 2 celulares e na web, comparar com as referências e aprovar ou listar ajustes | Aparelhos | [ ] |

### F4 · Polimento

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-10 | Antes | Ativar o **Crashlytics** no projeto (grátis no Spark) | Console → Crashlytics | [ ] |
| HUM-11 | Antes | Entregar a lista de ajustes do uso real (F1–F3) e revisar preços juntos | Arquivo `docs/feedback.md` ou chat | [ ] |
| HUM-12 | Depois | Acompanhar 1 mês de uso diário sem travar | Uso real | [ ] |

### F5 · Extras

| ID | Quando | Ação | Onde | Feito |
| --- | --- | --- | --- | --- |
| HUM-13 | Antes | Escolher quais extras entram e em que ordem | Chat | [ ] |

### Recorrente

| Quando | Ação |
| --- | --- |
| Fim de cada fase | Responder ao agente se pode fazer o commit e o push |
| Nova versão do Android | Instalar o APK novo nos 2 celulares (a web atualiza sozinha) |
| Se o console avisar de cota perto do limite | Avisar o agente para reduzir leituras/escritas |

---

## 5. Registro de progresso

Atualizado pelo agente no início e no fim de cada fase.

| Fase | Status | Início | Fim | Commit |
| --- | --- | --- | --- | --- |
| F0 | em andamento (falta a validação humana) | 25/11/2026 | | c3a8c51, 2fd49ad |
| F1 | código pronto (falta a validação humana)   | 25/11/2026 | | |
| F2 | código pronto (falta a validação humana) | 25/11/2026 | | |
| F3 | código pronto (falta a validação humana) | 26/11/2026 | | |
| F6 | código pronto (falta a validação humana) | 26/11/2026 | | |
| F7 | código pronto (falta a validação humana) | 26/11/2026 | | |
| F8 | código pronto (falta a validação humana) | 26/11/2026 | | |
| F4 | não iniciada | | | |
| F5 | não iniciada | | | |

**Decisões tomadas pelo agente**

- Projeto Firebase: `tapago-51ecc`; pacote Android: `com.tapago.app`; config web em `apps/app/.env` (fora do git).
- F0 · Versões: Expo SDK 58, TypeScript 6.0 (o ESLint ainda não suporta o 7), ESLint 9, Firebase JS 13.3.0 (a mesma do React Native Firebase 27).
- F0 · pnpm com `nodeLinker: hoisted`, para evitar problemas de caminho e autolinking no Android.
- F0 · Emulador do Firestore na porta 8180 (a 8080 estava ocupada). `firebase-tools` 14 no repositório, que roda com Java 17; o 15 exige Java 21.
- F0 · `packages/data`: uma interface `Backend` com `backend.ts` (web) e `backend.native.ts` (Android).
- F0 · `users/{uid}` só é criado quando o servidor confirma que não existe, em transação, para um cache vazio nunca zerar o saldo.
- F0 · Sair avisa antes se houver escritas ainda não enviadas.
- F0 · O `.easignore` envia `.env` e `google-services.json` ao EAS Build sem colocá-los no git.
- F0 · O deploy no CI usa o segredo `FIREBASE_SERVICE_ACCOUNT` e variáveis `EXPO_PUBLIC_*` do GitHub; sem eles, é pulado com aviso.
- F0 · Login com Google implementado nas duas plataformas, mas ainda não testado contra o Google (depende do HUM-05 no Android).
- F0 · Kotlin 2.3.21 (via `expo-build-properties`): o Firebase Android atual não compila com o 2.2 padrão do Expo.
- F0 · `pnpm apk` gera o APK local (só `arm64` por padrão) mantendo `android/` entre execuções; o plugin `withLocalAndroidBuild` aplica os ajustes de build.
- F0 · Build local no Windows exige ninja 1.12+ por causa de caminhos longos (ver README). APK local assinado com a chave de debug, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; o APK do EAS usa outra chave.
- F1 · O tipo (+/−) é escolhido na criação e não muda na edição. Tocar no cartão abre a edição e o arquivamento.
- F1 · `daily` ganhou os campos `date` (para consultar por período), `buyCount` (quantidade de compras) e `counts` (registros por atividade, para o "feito 2× hoje").
- F1 · Histórico com período fixo de 30 dias (o filtro é a F3). Os agregados lidos são os dos últimos 60 dias.
- F1 · Escritas com `increment()` em um `writeBatch`; a tela não espera o servidor. O botão de comprar trava por 1 s contra toque duplo.
- F1 · Sem a regra de saldo da F4, duas compras offline em aparelhos diferentes ainda podem deixar o saldo negativo.
- F1 · A meta da semana só aparece com `weeklyGoal` > 0; a edição dela é a F3. O inventário é gravado, mas a lista é da F2.
- F1 · As regras agora liberam coleção por coleção: `state/session` (F2) e `avatar` (F3) precisam de blocos próprios.
- F1 · Id do aparelho guardado com `expo-file-system` no Android e `localStorage` na web.
- F2 · Encerrar grava, em um lote, os minutos no lançamento `use`, o `leisureMin` no dia em que o uso **começou** e apaga `state/session`. Enquanto o timer roda, o lançamento `use` guarda a duração cheia.
- F2 · As regras só aceitam os minutos de um `use` ao encerrar a sessão atual, não deixam começar outra sessão por cima nem apagar um item do inventário que já saiu. Assim um aparelho desatualizado não conta, não cobra e não usa nada duas vezes.
- F2 · Tempo usado: minutos arredondados, sem as pausas, no mínimo 1.
- F2 · Uma sessão vencida que veio só do cache espera 5 s pelo servidor antes de ser encerrada.
- F2 · Aviso que vence em até 10 s não é cancelado, para o fim normal (inclusive em outro aparelho) não apagar o próprio "Tempo esgotado".
- F2 · No Android os avisos usam `delivery: 'alarmClock'` com `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM` (o sistema mostra o ícone de alarme). Com o app aberto, o banner do sistema é trocado pelo alerta dentro do app.
- F2 · As preferências `notif.end` e `notif.warn5` já são respeitadas; a tela para mudá-las é a F3.
- F2 · O número do recibo são os 4 últimos caracteres do id da compra (não há contador).
- F2 · A permissão de notificação é pedida ao começar um timer; o pedido com contexto no onboarding é a F3.

- F3 · Gráficos desenhados direto com `react-native-svg`, sem Victory: uma dependência a menos e o mesmo desenho do protótipo no Android e na web.
- F3 · Dependências novas: `expo-image-picker` e `expo-image-manipulator` (sem permissão de câmera ou microfone). Exigem um APK novo. No Android o usuário ajusta o recorte; na web vale o quadrado central.
- F3 · O onboarding aparece quando `onboardingDone` é falso e grava tudo em um lote no fim. Conta que já tem uma atividade positiva e um item na loja é marcada como feita, sem passar pelas telas.
- F3 · "Agora não" desliga os avisos de fim e de 5 minutos (como no protótipo); com os dois desligados, começar um timer não pede permissão.
- F3 · O listener de `daily` passou de 60 para 180 dias (90 dias mais o período anterior). Totais e recorde leem todos os `daily` uma vez por sessão, ao abrir o Histórico ou o Perfil.
- F3 · Os rankings leem os lançamentos do período com um listener próprio, que só aumenta a janela (30 → 90 dias) quando o filtro pede. É a leitura mais cara do app: conferir na F4 contra a cota.
- F3 · O saldo diário é reconstruído de trás para frente, a partir do saldo atual.
- F3 · O filtro vale para cartões, divisão do tempo, saldo, dias limpos e rankings. As 8 semanas, o mapa de 13 semanas, a sequência, o recorde e a atividade recente têm janela própria. A sequência e o recorde contam dias com atividade positiva (R12).
- F3 · "Resumo semanal" já é salvo no Perfil; o aviso é da F5. "Refazer configuração" também.
- F6 · `daily` ganhou o mapa `bonuses` (bônus de hábito pagos por atividade): é como o app sabe, sem ler nada a mais, que o dia já foi pago.
- F6 · O bônus sai no registro em que o dia está com a meta batida e ainda sem pagamento. Em geral é o que atinge a meta; se a meta for reduzida no meio do dia, ou os registros vierem de dois aparelhos, é o seguinte. Registros do dia feitos antes de ligar o hábito contam.
- F6 · O lançamento guarda `base` e `level` (de 1 em diante): dia da sequência na positiva, número do registro desde o zeramento na negativa. No bônus, guarda `source` e `target`. O horário do bônus é o do registro + 1 ms, para aparecer logo acima dele.
- F6 · As regras exigem o id `habit_{atividade}_{data}` e só aceitam bônus com origem `habit`; a F7 libera `mission`. Os campos novos são opcionais nas regras, para a versão antiga do app continuar registrando.
- F6 · Desmarcar o hábito apaga o campo `habit`; a sequência e a contagem não são alteradas pela edição.
- F6 · Atividades criadas no onboarding nascem sem hábito e com aumento R$ 0; os R$ 10 sugeridos valem para o formulário de nova atividade.
- F6 · Limitação aceita: dois aparelhos offline podem pagar ou cobrar o mesmo nível de sequência ou de escalada, e o que sincronizar por último define a sequência salva (um aparelho há mais de um dia offline pode fazê-la voltar). O bônus de hábito não se repete.
- F6 · O cartão desativa o registro até o agregado do dia carregar, para o bônus não ser calculado às cegas.
- F7 · O sorteio é um hash de `uid` + data sobre os pares de positivas, em ordem de id. O "par de ontem" é o do documento de ontem; sem ele (app não aberto), não há o que evitar.
- F7 · O documento da missão tem também `date` (para ler ontem e hoje com um listener) e `createdAt` (para as regras recusarem uma segunda gravação do mesmo par). Custa até 2 leituras por dia.
- F7 · O app grava a missão na hora se o servidor respondeu; se só tem o cache, espera 5 s. Cada gravação é tentada uma vez por sessão, para uma recusa (ou regras antigas publicadas) não virar um laço de escritas.
- F7 · "A missão some" quando falta substituta: o cartão é escondido e o documento fica (nunca há `delete`). Se surgir uma substituta no mesmo dia, ela volta.
- F7 · Missão já cumprida pelos registros é paga mesmo que uma das atividades seja arquivada depois. O bônus sai também quando os registros são anteriores ao sorteio ou vieram de outro aparelho.
- F7 · O lançamento do bônus tem `refId` = data, nome "Missão do dia" e `activities` (cópia do documento). As regras exigem essa cópia idêntica e `completedAt` no mesmo lote, então um aparelho que sorteou outro par offline não paga.
- F7 · As regras não conferem se as 2 atividades foram mesmo registradas; a conferência de valores e saldo é a F4.
- F8 · Dependência nova: `expo-blur` (Android e web; na web o vidro é `backdrop-filter` direto). Exige um APK novo.
- F8 · Vidro claro com véu branco de 74% (94% sem desfoque), o que garante 4,5:1 para tinta e ardósia mesmo com preto atrás (teste em `packages/ui`). A barra de abas deixou de ser escura. O grafite não é usado sobre o vidro.
- F8 · Sem distorção de lente na web: com o desfoque que o contraste exige ela quase não aparece, e o suporte é só de um motor de navegador.
- F8 · No Android o desfoque vale do 12 em diante; o conteúdo desfocado é o da tela em foco. Não há detecção de "aparelho fraco" além da versão.
- F8 · A gota são duas bordas com molas diferentes. A barra do celular aceita arraste; o menu lateral aceita também setas, Home e End.
- F8 · Na web as listas animam entrada e saída, mas não o reposicionamento (o reanimated estica o item e distorce o texto).
- F8 · A folha fecha arrastando pelo topo (alça e título), para não disputar com a rolagem do formulário. Fechar depois de salvar continua imediato.
- F8 · Na web larga há uma luz suave atrás do menu lateral, para o vidro ter o que mostrar.

**Pendências humanas em aberto**

- Web publicada em https://tapago-51ecc.web.app (regras e Hosting publicados em 25/11/2026).
- HUM-05: SHA-1/SHA-256 do Android no Firebase, domínio do Hosting autorizado, segredo `FIREBASE_SERVICE_ACCOUNT` e variáveis `EXPO_PUBLIC_*` no GitHub.
- EAS: rodar `eas init` em `apps/app` antes do primeiro build na nuvem.
- HUM-06: instalar o APK nos 2 celulares, abrir a web e entrar com cada conta.
- HUM-07: usar a F1 por 1 semana. Antes, publicar (push na `main` ou deploy manual) e instalar um APK novo: a F1 foi testada na web contra o emulador, não em um Android.
- HUM-08: nos 2 celulares, instalar um APK novo (há permissões novas de alarme), permitir notificações, tirar o app da otimização de bateria e testar o aviso com o app fechado. Os avisos do Android ainda não foram testados em aparelho.
- F2: publicar regras e web juntas (push na `main` ou deploy manual). As regras novas são necessárias para o timer.
- F3: publicar regras e web juntas (sem o bloco `avatar`, um onboarding com foto é recusado inteiro) e instalar um APK novo nos 2 celulares. Foi testada na web contra o emulador, não em um Android.
- HUM-09: a Pessoa 2 faz o onboarding sozinha, cronometrando. Se a conta dela já tiver atividades e loja, o onboarding não aparece: usar uma conta nova.
- F6: publicar regras e web juntas (com as regras antigas, registrar na web nova é recusado). Foi testada na web contra o emulador, não em um Android.
- HUM-14: instalar um APK novo nos 2 celulares antes de usar (a versão antiga não lê o lançamento de bônus, não aplica sequência nem escalada). Completar um hábito, deixar uma sequência subir e quebrar, escalar e zerar uma negativa.
- F7: publicar regras e web juntas (com as regras antigas, a missão não é gravada). Foi testada na web contra o emulador, não em um Android.
- HUM-15: instalar um APK novo nos 2 celulares e acompanhar as missões por alguns dias, cumprindo pelo menos uma.
- HUM-16: os links das referências não chegaram antes da F8; se houver, enviar para os ajustes.
- F8: conferida na web contra o emulador, só no navegador embutido (Chromium). O bundle Android compila, mas o APK não foi gerado nem testado em aparelho.
- HUM-17: instalar um APK novo nos 2 celulares; testar o desfoque, o arraste da barra e da folha, a fluidez (60 quadros) e o "reduzir movimento"; conferir a web no Chrome, Safari e Edge; aprovar ou listar ajustes.
