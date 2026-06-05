const fs = require('fs');
const path = require('path');

const files = {
  'en.json': {
    'admin.nav.export': 'Export',
    'admin.dashboard.stats.total': 'Total',
    'admin.dashboard.stats.pending': 'Pending',
    'admin.dashboard.stats.delivered': 'Delivered',
    'admin.dashboard.stats.cancelled': 'Cancelled',
    'admin.pages.orders.index.table.delivery': 'Delivery',
    'admin.pages.orders.index.deliveryModes.home': 'Home delivery'
  },
  'fr.json': {
    'admin.nav.export': 'Exporter',
    'admin.dashboard.stats.total': 'Total',
    'admin.dashboard.stats.pending': 'En attente',
    'admin.dashboard.stats.delivered': 'Livré',
    'admin.dashboard.stats.cancelled': 'Annulé',
    'admin.pages.orders.index.table.delivery': 'Livraison',
    'admin.pages.orders.index.deliveryModes.home': 'Livraison à domicile'
  },
  'ar.json': {
    'admin.nav.export': 'تصدير',
    'admin.dashboard.stats.total': 'الإجمالي',
    'admin.dashboard.stats.pending': 'قيد الانتظار',
    'admin.dashboard.stats.delivered': 'مُسلم',
    'admin.dashboard.stats.cancelled': 'ملغى',
    'admin.pages.orders.index.table.delivery': 'التوصيل',
    'admin.pages.orders.index.deliveryModes.home': 'توصيل للمنزل'
  }
};

function setDeep(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const dir = path.join(__dirname, 'assets', 'translations');

for (const [filename, keys] of Object.entries(files)) {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  for (const [key, value] of Object.entries(keys)) {
    setDeep(data, key, value);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${filename}`);
}
