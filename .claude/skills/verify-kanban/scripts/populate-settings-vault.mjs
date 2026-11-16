import fs from 'node:fs';
import path from 'node:path';

const run = fs.realpathSync(process.argv[2] || '.verify-runs/latest');
const count = Number(process.argv[3] || 7200);
const vault = path.join(run, 'vault');
if (!fs.existsSync(path.join(run, 'state.json'))) throw new Error('Expected a verification run');
for (let i = 0; i < count; i++) {
  const folder = path.join(vault, 'Settings load', `Group-${Math.floor(i / 100)}`, `Folder-${i}`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `Note-${i}.md`), `Settings fixture ${i}\n`);
}
console.log(`Created ${count} notes and their folders in ${vault}`);
