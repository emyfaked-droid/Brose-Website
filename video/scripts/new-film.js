// Start a new film from the template: node scripts/new-film.js <name>   (or: npm run new -- <name>)
// Creates <name>.html (picture), sounds/<name>.js (sound timeline) and sfx_films/<name>.py (extra generated sounds).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) { console.error('usage: npm run new -- <name>   (lowercase, digits, dashes)'); process.exit(1); }
const files = [
  ['films/_template.html', `${name}.html`],
  ['sounds/_template.js', `sounds/${name}.js`],
  ['sfx_films/_template.py', `sfx_films/${name.replace(/-/g, '_')}.py`],
];
for (const [from, to] of files) {
  const dst = path.join(ROOT, to);
  if (fs.existsSync(dst)) { console.error(`${to} exists already, not overwritten`); continue; }
  let s = fs.readFileSync(path.join(ROOT, from), 'utf8');
  if (to.endsWith('.html')) s = s.replace('<title>TEMPLATE</title>', `<title>${name}</title>`);
  fs.writeFileSync(dst, s);
  console.log('created', to);
}
console.log(`\nnext: FILM=${name} npm run check | stills | render | mix   (or: FILM=${name} npm run build)`);
