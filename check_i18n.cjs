const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, 'admin_app/lib');
const translationsDir = path.join(__dirname, 'admin_app/assets/translations');

// Flatten JSON to get dot-notated keys
function flattenObject(ob) {
  var toReturn = {};
  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if ((typeof ob[i]) == 'object' && ob[i] !== null) {
      var flatObject = flattenObject(ob[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

const locales = ['en', 'fr', 'ar'];
const keysByLocale = {};

locales.forEach(loc => {
  const filePath = path.join(translationsDir, `${loc}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    keysByLocale[loc] = new Set(Object.keys(flattenObject(data)));
  } else {
    console.log(`Missing file: ${loc}.json`);
  }
});

// Extract keys from Dart files
const trRegex = /(?:'([^']+)'|"([^"]+)")\.tr\(/g;
const dartKeys = new Set();

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.dart')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = trRegex.exec(content)) !== null) {
        const key = match[1] || match[2];
        if (key && !key.includes('$')) {
          dartKeys.add(key);
        }
      }
    }
  });
}

scanDir(libDir);

console.log(`Found ${dartKeys.size} unique keys in Dart files.`);

const missingInEn = [];
const missingInFr = [];
const missingInAr = [];

dartKeys.forEach(key => {
  if (keysByLocale['en'] && !keysByLocale['en'].has(key)) missingInEn.push(key);
  if (keysByLocale['fr'] && !keysByLocale['fr'].has(key)) missingInFr.push(key);
  if (keysByLocale['ar'] && !keysByLocale['ar'].has(key)) missingInAr.push(key);
});

console.log('\n--- Missing in en.json ---');
missingInEn.forEach(k => console.log(k));

console.log('\n--- Missing in fr.json ---');
missingInFr.forEach(k => console.log(k));

console.log('\n--- Missing in ar.json ---');
missingInAr.forEach(k => console.log(k));

// Also check cross-locale consistency (keys in en but not in fr/ar)
console.log('\n--- Cross-locale inconsistencies (comparing to EN) ---');
if (keysByLocale['en']) {
    keysByLocale['en'].forEach(key => {
        if (keysByLocale['fr'] && !keysByLocale['fr'].has(key)) {
            console.log(`FR missing EN key: ${key}`);
        }
        if (keysByLocale['ar'] && !keysByLocale['ar'].has(key)) {
            console.log(`AR missing EN key: ${key}`);
        }
    });
}

