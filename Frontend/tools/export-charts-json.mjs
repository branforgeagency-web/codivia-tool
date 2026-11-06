// Exports every chart to plain JSON (one file per department + all-charts.json).
// Usage (from the project root):  node tools/export-charts-json.mjs
// Output: export/charts/<DEPT>.json and export/all-charts.json
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const dir = 'public/data/charts';
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
}
const data = ctx.window.CHART_DATA;
fs.mkdirSync('export/charts', { recursive: true });
let total = 0;
for (const [k, arr] of Object.entries(data)) {
  fs.writeFileSync(`export/charts/${k}.json`, JSON.stringify(arr, null, 2));
  total += arr.length;
  console.log(k.padEnd(8), arr.length);
}
fs.writeFileSync('export/all-charts.json', JSON.stringify(data));
console.log('Total charts:', total);
