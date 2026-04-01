import { spawnSync } from 'child_process';
const result = spawnSync('npx.cmd', ['tsx', 'src/index.ts'], { encoding: 'utf-8', shell: true });
console.log("--- STDOUT ---");
console.log(result.stdout);
console.log("--- STDERR ---");
console.log(result.stderr);
