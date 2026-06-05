const fs = require('fs');
const execSync = require('child_process').execSync;
const crypto = require('crypto');
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

let allEdits = [];

for (const convId of conversations) {
  const dbPath = `/Users/lyazz/.gemini/antigravity/conversations/${convId}.db`;
  if (!fs.existsSync(dbPath)) continue;
  
  // Dump raw hex to file
  const hexDump = `/tmp/hex_${convId}.hex`;
  execSync(`sqlite3 ${dbPath} 'SELECT hex(step_payload) FROM steps;' > ${hexDump}`);
  
  const content = fs.readFileSync(hexDump, 'utf8').split('\n');
  for (const line of content) {
    if (!line) continue;
    const buf = Buffer.from(line, 'hex');
    const str = buf.toString('utf8');
    
    // Using a regex to find everything between "TargetFile":"/Users/.../lib/..." and the closing brace }
    // It's brittle but might work better than JSON parsing if strings are truncated/broken
    const regex = /"TargetFile":"(\/Users\/lyazz\/Documents\/js projects\/MySaaS\/admin_app\/lib\/[^"]+\.dart)"/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
       const targetFile = match[1];
       
       // Try to find CodeContent or ReplacementContent or ReplacementChunks near this match
       // We'll search backwards a bit and forwards to capture the whole JSON-like block
       let start = str.lastIndexOf('{', match.index);
       if (start === -1) continue;
       
       let braces = 0;
       let end = -1;
       let inStr = false;
       let escape = false;
       for (let i = start; i < str.length; i++) {
         const char = str[i];
         if (escape) { escape = false; continue; }
         if (char === '\\') { escape = true; continue; }
         if (char === '"') { inStr = !inStr; continue; }
         if (!inStr) {
           if (char === '{') braces++;
           if (char === '}') {
             braces--;
             if (braces === 0) { end = i; break; }
           }
         }
       }
       
       if (end !== -1) {
          const jsonStr = str.substring(start, end + 1);
          try {
             const obj = JSON.parse(jsonStr);
             obj._hash = crypto.createHash('md5').update(jsonStr).digest('hex');
             allEdits.push(obj);
          } catch(e) {
             // If JSON parse fails, it means it's truncated or malformed, we can't reliably apply it anyway
          }
       }
    }
  }
}

// Filter unique
const unique = [];
const seen = new Set();
for (const edit of allEdits) {
  if (!seen.has(edit._hash)) {
    seen.add(edit._hash);
    unique.push(edit);
  }
}

console.log(`Found ${unique.length} unique parseable .dart edits.`);

// Try to apply them!
let successCount = 0;
let failCount = 0;

for (const action of unique) {
  try {
    const filePath = action.TargetFile;
    if (action.CodeContent !== undefined) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, action.CodeContent, 'utf8');
      console.log(`[write_to_file] ${filePath}`);
      successCount++;
    } else if (action.ReplacementContent !== undefined) {
      if (!fs.existsSync(filePath)) throw new Error('File not found');
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(action.TargetContent)) {
        content = content.replace(action.TargetContent, action.ReplacementContent);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[replace_file_content] ${filePath}`);
        successCount++;
      } else {
        failCount++;
      }
    } else if (action.ReplacementChunks !== undefined) {
      if (!fs.existsSync(filePath)) throw new Error('File not found');
      let content = fs.readFileSync(filePath, 'utf8');
      let appliedAny = false;
      for (const chunk of action.ReplacementChunks) {
        if (content.includes(chunk.TargetContent)) {
          content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
          appliedAny = true;
        }
      }
      if (appliedAny) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[multi_replace_file_content] ${filePath}`);
        successCount++;
      } else {
        failCount++;
      }
    }
  } catch (err) {
    failCount++;
  }
}

console.log(`Recovery complete. Successful: ${successCount}, Failed/Skipped: ${failCount}`);
