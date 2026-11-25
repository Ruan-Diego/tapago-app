/**
 * Ajustes para compilar o Android na própria máquina.
 *
 * - Todo sistema: o bundle JavaScript é sempre refeito. O Gradle não percebe mudanças em
 *   `packages/*` e reaproveitaria um bundle antigo.
 * - Só no Windows: usa um ninja 1.12+ (o 1.10 do CMake 3.22 não aceita caminhos longos) e
 *   limita as compilações C++ em paralelo, para não faltar memória.
 *
 * No EAS Build (Linux) só o primeiro ajuste vale.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const {
  WarningAggregator,
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const MARKER = '// tapago: build local';
const COMPILE_JOBS = 4;
const GRADLE_WORKERS = 2;

/** Caminho de um ninja 1.12 ou mais novo, de `NINJA_PATH` ou do `PATH`. */
function findNinja() {
  const candidates = [process.env.NINJA_PATH];
  const quiet = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    candidates.push(...execFileSync('where.exe', ['ninja'], quiet).split(/\r?\n/));
  } catch {
    // Nenhum ninja no PATH.
  }
  // Instalação do WinLibs via winget, que nem sempre entra no PATH.
  candidates.push(path.join(process.env.LOCALAPPDATA ?? '', 'winlibs/mingw64/bin/ninja.exe'));
  return candidates.filter(Boolean).find((candidate) => {
    try {
      const version = execFileSync(candidate.trim(), ['--version'], quiet);
      const [major, minor] = version.split('.').map(Number);
      return major > 1 || (major === 1 && minor >= 12);
    } catch {
      return false;
    }
  });
}

function cmakeArguments(ninja) {
  const args = [
    `-DCMAKE_JOB_POOLS=compile=${COMPILE_JOBS}`,
    '-DCMAKE_JOB_POOL_COMPILE=compile',
    ...(ninja ? [`-DCMAKE_MAKE_PROGRAM=${ninja.trim().replaceAll('\\', '/')}`] : []),
  ];
  return args.map((arg) => `'${arg.replaceAll("'", "\\'")}'`).join(', ');
}

/** Troca o bloco gerado antes (se houver) pelo novo, para o prebuild poder rodar de novo. */
function replaceBlock(contents, block) {
  // Remove só o trecho entre os marcadores: outros plugins também escrevem no fim do arquivo.
  const previous = new RegExp(`\\n*${MARKER} \\(início\\)[\\s\\S]*?${MARKER} \\(fim\\)\\n?`, 'g');
  const base = contents.replace(previous, '\n').trimEnd();
  return `${base}\n\n${MARKER} (início)\n${block}\n${MARKER} (fim)\n`;
}

module.exports = function withLocalAndroidBuild(config) {
  const windows = process.platform === 'win32';
  const ninja = windows ? findNinja() : undefined;
  const args = windows ? cmakeArguments(ninja) : null;

  config = withProjectBuildGradle(config, (mod) => {
    if (args) {
      if (!ninja) {
        WarningAggregator.addWarningAndroid(
          'withLocalAndroidBuild',
          'Nenhum ninja 1.12+ encontrado (defina NINJA_PATH): a compilação pode falhar por caminho longo.',
        );
      }
      // Módulos de biblioteca. O `:app` já foi avaliado neste ponto e é tratado abaixo.
      mod.modResults.contents = replaceBlock(
        mod.modResults.contents,
        [
          'subprojects { module ->',
          "  module.plugins.withId('com.android.library') {",
          `    module.android.defaultConfig.externalNativeBuild.cmake.arguments.addAll([${args}])`,
          '  }',
          '}',
        ].join('\n'),
      );
    }
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    const block = [
      "tasks.matching { it.name.startsWith('createBundle') }.configureEach {",
      '  outputs.upToDateWhen { false }',
      '}',
      ...(args
        ? [`android.defaultConfig.externalNativeBuild.cmake.arguments.addAll([${args}])`]
        : []),
    ].join('\n');
    mod.modResults.contents = replaceBlock(mod.modResults.contents, block);
    return mod;
  });

  return withGradleProperties(config, (mod) => {
    if (windows) {
      const key = 'org.gradle.workers.max';
      mod.modResults = mod.modResults.filter((item) => item.key !== key);
      mod.modResults.push({ type: 'property', key, value: String(GRADLE_WORKERS) });
    }
    return mod;
  });
};
