// Genera el reporte Allure de forma robusta.
// 1) Copia categories.json a allure-results.
// 2) Corrige JAVA_HOME si apunta por error a la subcarpeta \bin
//    (Allure/Java esperan la raíz del JDK, no el bin).
// 3) Ejecuta allure generate.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Copia categories.json (si existe) a allure-results.
const categoriesSrc = path.join('allure', 'categories.json');
if (fs.existsSync(categoriesSrc)) {
  fs.mkdirSync('allure-results', { recursive: true });
  fs.copyFileSync(categoriesSrc, path.join('allure-results', 'categories.json'));
}

// Corrige JAVA_HOME si termina en \bin o /bin.
const env = { ...process.env };
if (env.JAVA_HOME && /[\\/]bin[\\/]?$/.test(env.JAVA_HOME)) {
  const fixed = env.JAVA_HOME.replace(/[\\/]bin[\\/]?$/, '');
  console.log(`[allure] Corrigiendo JAVA_HOME: ${env.JAVA_HOME} -> ${fixed}`);
  env.JAVA_HOME = fixed;
}

// Ejecuta el CLI de allure (viene de allure-commandline).
const isWin = process.platform === 'win32';
const bin = path.join('node_modules', '.bin', isWin ? 'allure.cmd' : 'allure');
const args = ['generate', 'allure-results', '--clean', '-o', 'allure-report'];

// En Windows el ejecutable es un .cmd; se invoca vía cmd.exe sin shell:true
// para evitar el warning de deprecación por concatenación de argumentos.
if (isWin) {
  execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/c', bin, ...args], {
    stdio: 'inherit',
    env,
  });
} else {
  execFileSync(bin, args, { stdio: 'inherit', env });
}
console.log('[allure] Reporte generado en allure-report/');
