/**
 * Gera o APK de instalação na própria máquina: `pnpm apk` (celulares) ou
 * `pnpm apk --emulator` (inclui x86_64, para o emulador).
 *
 * A pasta `android/` é mantida entre execuções, então só a primeira compilação é demorada.
 * Use `--clean` para recriá-la (depois de remover um plugin ou trocar a versão do Expo).
 * O APK é assinado com a chave de debug.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(app, 'android');
const windows = process.platform === 'win32';
const started = Date.now();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, cwd) {
  // No Windows, `.cmd` e `.bat` só rodam por um shell. Os argumentos aqui são fixos.
  execFileSync([command, ...args].join(' '), {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

if (!process.env.ANDROID_HOME) fail('Defina ANDROID_HOME com a pasta do Android SDK.');
for (const file of ['.env', 'google-services.json']) {
  if (!existsSync(path.join(app, file))) fail(`Falta apps/app/${file} (veja o .env.example).`);
}
const usesEmulator = /^\s*EXPO_PUBLIC_USE_EMULATOR\s*=\s*true\s*$/m;
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const full = path.join(app, file);
  if (existsSync(full) && usesEmulator.test(readFileSync(full, 'utf8'))) {
    fail(`apps/app/${file} está com EXPO_PUBLIC_USE_EMULATOR=true: o APK não abriria o app real.`);
  }
}

const architectures = process.argv.includes('--emulator') ? 'arm64-v8a,x86_64' : 'arm64-v8a';

// Desde o SDK 58 o prebuild apaga `android/` por padrão, o que jogaria fora o que já foi compilado.
const prebuild = ['exec', 'expo', 'prebuild', '--platform', 'android', '--no-install'];
if (!process.argv.includes('--clean')) prebuild.push('--no-clean');
run('pnpm', prebuild, app);
run(
  windows ? '.\\gradlew.bat' : './gradlew',
  ['assembleRelease', `-PreactNativeArchitectures=${architectures}`, '--console=plain'],
  android,
);

const { version } = JSON.parse(readFileSync(path.join(app, 'package.json'), 'utf8'));
const output = path.resolve(app, '..', '..', `tapago-${version}.apk`);
copyFileSync(path.join(android, 'app/build/outputs/apk/release/app-release.apk'), output);

const minutes = ((Date.now() - started) / 60_000).toFixed(1);
console.log(`\nAPK pronto em ${minutes} min (${architectures}): ${output}`);
