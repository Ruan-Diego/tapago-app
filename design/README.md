# Design — Tá pago

Protótipo interativo do app (mobile e web), feito no Claude Design.

- **Ver e testar o protótipo:** [canvas no Claude](https://claude.ai/artifact/UsGfgCLa6dzL9FXgrBN62e). Clique em Play em qualquer tela.
- **PRD:** [`docs/PRD.md`](../docs/PRD.md)

A pasta `canvas/` guarda o código-fonte das telas (`*.dc.html`) e o índice do canvas (`canvas.json`). Esses arquivos dependem do runtime do Claude Design (`support.js`) e não abrem sozinhos no navegador. Servem como referência de layout, textos, estados e lógica de cada tela.

## Telas

| Arquivo | Tela | Observação |
| --- | --- | --- |
| `Main.dc.html` | App completo (mobile e web) | Componente principal: 5 abas, inventário, timer, modais. Propriedades `layout` (`mobile` \| `web`) e `startTab` |
| `Onboarding.dc.html` | Onboarding, 7 passos | Componente; propriedades `startStep` (0–6) e `layout` |
| `OnbComo`, `OnbPerfil`, `OnbObrigacoes`, `OnbLoja`, `OnbNotificacoes`, `OnbPronto` | Cada passo do onboarding | Usam `Onboarding` com `startStep` |
| `Comecar.dc.html` | Fluxo completo: onboarding → app | Entra no app com as escolhas feitas no onboarding |
| `Loja`, `Inventario`, `Historico`, `Perfil` | Abas do app mobile | Usam `Main` com `startTab` |
| `Web`, `WebInventario`, `WebHistorico`, `WebOnboarding` | Versão web | Usam `Main` com `layout="web"` |
| `Notificacoes.dc.html` | Notificações na tela de bloqueio | Estático |
| `Marca.dc.html` | Marca: logo, ícone, cores, tipografia | Estático |

## Tokens de design

| Token | Valor | Uso |
| --- | --- | --- |
| Tinta | `#111111` | Texto principal, botões primários, barra de abas |
| Papel | `#F4F4F1` | Fundo |
| Branco | `#FFFFFF` | Cartões |
| Grafite | `#6B6B66` | Texto secundário |
| Borda | `#E3E3DE` | Bordas de cartão |
| Lazer | `#B5B5AE` | Barras de lazer nos gráficos |
| Ruim | listrado `#3A3A36` / `#D9D9D3` | Atividades negativas nos gráficos |
| Destaque | `#D4FF3A` | Dinheiro, aba ativa, recibo "Tá pago." (alternativas testadas: `#FF7A3D`, `#5CE1FF`, `#FF8AD8`) |

| Fonte | Uso |
| --- | --- |
| Space Grotesk (600–700) | Títulos, números e valores |
| Inter (400–700) | Interface e textos |
| JetBrains Mono (400–600) | Recibo, contagem do timer, numeração |

Atividades negativas se diferenciam por forma, não só por cor: cartão com borda tracejada, botão branco com contorno e sinal "−".
