# Roadmap de execução — Tá pago

Baseado em [`PRD.md`](PRD.md) e no protótipo em [`design/`](../design/README.md). Este arquivo é o guia operacional para o agente de IA que vai implementar o app, fase por fase.

**Abas deste documento**

0. [Decisões fechadas](#0-decisões-fechadas)
1. [Protocolo de execução (leia antes de qualquer fase)](#1-protocolo-de-execução)
2. [Visão geral das fases](#2-visão-geral-das-fases)
3. [Fases detalhadas (F0 a F5)](#3-fases-detalhadas)
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

Cerca de 9 semanas do zero ao uso diário, com o MVP em uso a partir da semana 4.

| Fase | Nome | Duração estimada | Marco (critério de saída) | Requisitos |
| --- | --- | --- | --- | --- |
| F0 | Fundação | 1 semana | As 2 pessoas instalam (APK + web) e entram no app | AUTH-01, 02, 04, 05 |
| F1 | MVP | 3 semanas | 1 semana de uso real sem perder dados | AUTH-06, ACT-01–04, ACT-07, SHOP-01–02, HIST-02, HIST-08 |
| F2 | Inventário e timer | 2 semanas | Aviso chega no celular com o app fechado; na web, com a aba aberta | SHOP-03–04, INV-01–02, TMR-01–05, NOTIF-01–03 |
| F3 | Onboarding e histórico completo | 2 semanas | Pessoa 2 configura sozinha em 2 min | ONB-01–05, PROF-01–02, HIST-01, HIST-03–07 |
| F4 | Polimento | 1 semana | 1 mês de uso diário sem travar | ACT-05 + não funcionais |
| F5 | Extras | quando der | Prioridade pelo uso real | NOTIF-04–05, ACT-06, ONB-06, PROF-03, AUTH-05 (excluir) |

Ordem fixa: o livro-caixa (F1) fica sólido antes de sessão e notificação (F2).

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
- [ ] Modal de compra: "Usar agora" ou "Guardar no inventário" (R4); "Usar agora" bloqueado com timer ativo (R5)
- [ ] Recibo "Tá pago." com item, duração, valor, saldo restante e status
- [ ] Lista do inventário (mais recente primeiro, data e valor pago)
- [ ] Começar item guardado: inicia o timer e remove do inventário

**Timer** (TMR-01–05)
- [ ] `state/session` com `id`, `endsAt`, `status`, `remainingMs`, `originDevice`
- [ ] Contagem calculada por `endsAt − agora`; sobrevive a fechar o app
- [ ] Pausar (congela restante) e retomar (recalcula fim) (R7)
- [ ] Encerrar antes: registra minutos reais, sem reembolso (R6); tempo conta no uso (R9)
- [ ] Ao abrir depois do fim sem encerrar, fecha a sessão com duração completa
- [ ] Mini timer visível nas outras abas, com toque levando ao Inventário
- [ ] Sincronização: iniciado no Android aparece na web e vice-versa

**Avisos no Android** (NOTIF-01, 02)
- [ ] `expo-notifications`: "Faltam 5 minutos" (só sessões > 5 min) e "Tempo esgotado"
- [ ] Qualquer aparelho Android que receba a sessão (ao iniciar, ao abrir o app ou pelo listener) agenda os avisos, identificados pelo `id` da sessão para não duplicar
- [ ] Cancelar e reagendar quando a sessão muda (pausar, retomar, encerrar, outro aparelho mexeu)
- [ ] Canal de notificação Android e permissão `POST_NOTIFICATIONS` (Android 13+); alarme exato quando permitido
- [ ] Testes do agendador (cálculo dos horários e reagendamento) em `packages/core`

**Avisos na web** (NOTIF-01, 03)
- [ ] Com a aba aberta: alerta dentro da página + notificação do navegador (Notification API, com permissão), recalculados ao voltar para a aba
- [ ] Aviso visível no timer da web: "O aviso só aparece com esta aba aberta"

**Critério de saída:** aviso chega no celular com o app fechado e na web com a aba aberta (HUM-08).

---

### F3 · Onboarding e histórico completo

**Objetivo:** a Pessoa 2 se configura sozinha; histórico com gráficos e filtros.
**PRD:** Jornadas (Primeiro uso, Revisão), requisitos ONB, PROF, HIST.
**Design:** `Onboarding.dc.html` e os passos `Onb*.dc.html`, `Comecar.dc.html`, `Perfil.dc.html`, `Historico.dc.html`, `WebHistorico.dc.html`, `WebOnboarding.dc.html`.
**Intervenção humana necessária:** nenhuma para código. HUM-09 para o marco.

**Onboarding** (ONB-01–05)
- [ ] Boas-vindas + "como funciona" (2 telas)
- [ ] Nome (obrigatório) e foto (opcional)
- [ ] Presets de atividades + e −, valor ajustável com −/+; ≥ 1 positiva para seguir
- [ ] Montar a loja com presets; ≥ 1 item para seguir
- [ ] Permissão de notificação com contexto; "Agora não" não bloqueia
- [ ] Tela final "Pronto" e `onboardingDone = true`

**Perfil** (PROF-01–02)
- [ ] Nome e frase
- [ ] Foto sem Storage: recortada em círculo, reduzida para ~256 px (JPEG, ≤ 150 KB) e salva em `users/{uid}/avatar/current`; sem foto, usa a da conta Google ou as iniciais
- [ ] Regra: `avatar` só para o dono, com limite de tamanho
- [ ] Meta semanal e preferências de notificação, válidas em todos os aparelhos

**Histórico completo** (HIST-01, 03–07)
- [ ] Filtro 7/30/90 dias aplicado a todos os blocos
- [ ] Divisão do tempo bom × lazer × ruim, com a frase "para cada 1 h de lazer…"
- [ ] Gráfico de saldo diário (Victory + react-native-svg)
- [ ] Horas por semana (8 semanas, 3 barras)
- [ ] Mapa de constância (13 semanas): sequência, recorde, dias limpos
- [ ] Rankings: tempo por atividade, por lazer, onde perdeu
- [ ] Painel do histórico em tela grande na web

**Critério de saída:** a Pessoa 2 configura sozinha em 2 min (HUM-09).

---

### F4 · Polimento

**Objetivo:** confiabilidade e acabamento para uso diário prolongado.
**PRD:** Requisitos não funcionais, R8, Regras de segurança (`getAfter`).
**Intervenção humana necessária:** HUM-10 (Crashlytics), HUM-11 (feedback de uso real).

- [ ] Desfazer por 10 s com lançamento de estorno (ACT-05, R8), igual para positivas e negativas
- [ ] Regra de saldo com `getAfter()`: saldo muda exatamente pelo valor; `value` confere com `refId`; `purchase` só com saldo ≥ 0
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
| F2 | não iniciada | | | |
| F3 | não iniciada | | | |
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

**Pendências humanas em aberto**

- Web publicada em https://tapago-51ecc.web.app (regras e Hosting publicados em 25/11/2026).
- HUM-05: SHA-1/SHA-256 do Android no Firebase, domínio do Hosting autorizado, segredo `FIREBASE_SERVICE_ACCOUNT` e variáveis `EXPO_PUBLIC_*` no GitHub.
- EAS: rodar `eas init` em `apps/app` antes do primeiro build na nuvem.
- HUM-06: instalar o APK nos 2 celulares, abrir a web e entrar com cada conta.
- HUM-07: usar a F1 por 1 semana. Antes, publicar (push na `main` ou deploy manual) e instalar um APK novo: a F1 foi testada na web contra o emulador, não em um Android.
