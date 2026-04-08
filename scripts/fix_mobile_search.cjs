const fs = require('fs');
const path = require('path');
const d = path.join(__dirname, '../components/storefront/templates');

['modern', 'minimal', 'playful', 'activewear', 'stationnery', 'cyber'].forEach(t => {
  const f = path.join(d, t, 'StoreShell.vue');
  if (!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace('flex-1 max-w-lg hidden md:block', 'flex-1 max-w-lg');
  fs.writeFileSync(f, c);
  console.log('Fixed mobile visibility: ' + t);
});
