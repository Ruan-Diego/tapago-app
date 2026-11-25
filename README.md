# Tá pago

App Android e web que transforma comportamento em saldo. Detalhes em [`docs/PRD.md`](docs/PRD.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estrutura

| Pasta           | O que é                                                  |
| --------------- | -------------------------------------------------------- |
| `apps/app`      | App Expo (Expo Router): Android e web                    |
| `packages/core` | Tipos, regras de negócio e cálculos (sem React)          |
| `packages/data` | Acesso ao Firebase: SDK nativo no Android, SDK JS na web |
| `packages/ui`   | Tokens de design e componentes base                      |
| `firebase`      | Regras do Firestore e testes das regras                  |

## Preparar

Precisa de Node 22.13+, pnpm 12 e Java 17+ (emulador).

```powershell
pnpm install
```

Copie `apps/app/.env.example` para `apps/app/.env`, preencha, e para o Android coloque o `google-services.json` em `apps/app/`. Os dois ficam fora do git.

## Rodar

Web:

```powershell
pnpm web
```

Android (precisa do Android SDK e de um aparelho ou emulador):

```powershell
pnpm android
```

No Windows, a compilação local do Android pode falhar com `ninja: error: mkdir(...)`: o ninja 1.10 do CMake 3.22 não aceita caminhos longos. Use um ninja 1.12 ou mais novo (passando `-DCMAKE_MAKE_PROGRAM` ao CMake do módulo `app`), com o repositório num caminho curto, ou compile pelo EAS. Se faltar memória, rode o Gradle com `--max-workers=2`.

Para não tocar no projeto real, ponha `EXPO_PUBLIC_USE_EMULATOR=true` no `.env` e rode em outro terminal:

```powershell
pnpm emulators
```

Emuladores: Auth na porta 9099, Firestore na 8180.

## Verificar

```powershell
pnpm lint
```

```powershell
pnpm typecheck
```

```powershell
pnpm test
```

```powershell
pnpm test:rules
```

## Distribuir

APK pelo EAS, a partir de `apps/app` (na primeira vez, `eas init` cria o projeto na sua conta Expo):

```powershell
eas build --platform android --profile preview
```

Web e regras são publicadas pelo GitHub Actions a cada push na `main`. Manualmente:

```powershell
pnpm test:rules
```

```powershell
pnpm build
```

```powershell
pnpm exec firebase deploy --only hosting,firestore
```

No GitHub (Settings → Secrets and variables → Actions), o deploy precisa do segredo `FIREBASE_SERVICE_ACCOUNT` e das variáveis `EXPO_PUBLIC_*` do `.env.example`.
