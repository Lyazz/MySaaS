const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');

const conversations = [
  'a32104e0-d74e-413b-9a50-874a84ffa786',
  '6d63faaf-6b0f-4f46-9603-951c902a36fd',
  '742220da-e9bb-484d-9c40-0c3e7580e73c',
  '74b2bbf0-64e5-4c6d-8414-5e433c773065',
  '1f453b29-dc07-4444-991d-1f03643505b5',
  'b2426dc6-3168-4c0e-bff4-039eed12b88f',
  'c38009f5-016e-4a94-8d2b-431ace5620f1'
];

let totalFound = 0;
for (const convId of conversations) {
  const dbPath = `/Users/lyazz/.gemini/antigravity/conversations/${convId}.db`;
  if (!fs.existsSync(dbPath)) continue;
  
  // Dump all the strings
  const strings = execSync(`strings ${dbPath}`).toString();
  
  // Let's just find everything that looks like {"TargetFile":"/Users/lyazz/Documents/js projects/MySaaS/admin_app/lib... 
  // Because sqlite strings might cut off, we will extract anything starting with {"TargetFile":"
  const parts = strings.split('{"TargetFile":"');
  for (let i = 1; i < parts.length; i++) {
     const p = '{"TargetFile":"' + parts[i];
     // Check if it's a file we care about
     if (p.includes('.dart') && !p.includes('.md')) {
        totalFound++;
        // find the closing } of the json
        let braces = 0;
        let inString = false;
        let escape = false;
        let end = -1;
        for (let j = 0; j < p.length; j++) {
          let char = p[j];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') braces++;
            if (char === '}') {
              braces--;
              if (braces === 0) { end = j; break; }
            }
          }
        }
        
        if (end !== -1) {
          const jsonStr = p.substring(0, end + 1);
          try {
            const obj = JSON.parse(jsonStr);
            console.log(`Found edit for ${obj.TargetFile} - Length: ${jsonStr.length}`);
          } catch(e) {}
        }
     }
  }
}
console.log('Total potential edits found in strings:', totalFound);
