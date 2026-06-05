const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');
const crypto = require('crypto');

const conversations = [
  'a32104e0-d74e-413b-9a50-874a84ffa786',
  '6d63faaf-6b0f-4f46-9603-951c902a36fd',
  '742220da-e9bb-484d-9c40-0c3e7580e73c',
  '74b2bbf0-64e5-4c6d-8414-5e433c773065',
  '1f453b29-dc07-4444-991d-1f03643505b5',
  'b2426dc6-3168-4c0e-bff4-039eed12b88f',
  'c38009f5-016e-4a94-8d2b-431ace5620f1'
];

function extractJsonArgs(str) {
  let results = [];
  let index = 0;
  while ((index = str.indexOf('"TargetFile"')) !== -1) {
    let start = index;
    while (start >= 0 && str[start] !== '{') start--;
    if (start < 0) {
      str = str.substring(index + 12);
      continue;
    }
    
    let braces = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = start; i < str.length; i++) {
      let char = str[i];
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') braces++;
        if (char === '}') {
          braces--;
          if (braces === 0) { end = i; break; }
        }
      }
    }
    
    if (end > start) {
      const jsonStr = str.substring(start, end + 1);
      try {
        const obj = JSON.parse(jsonStr);
        if (obj.TargetFile && (obj.CodeContent !== undefined || obj.ReplacementContent !== undefined || obj.ReplacementChunks !== undefined)) {
          const hash = crypto.createHash('md5').update(jsonStr).digest('hex');
          obj._hash = hash;
          results.push(obj);
        }
      } catch (e) {}
    }
    str = str.substring(index + 12);
  }
  return results;
}

let allActions = [];

for (const convId of conversations) {
  const dbPath = `/Users/lyazz/.gemini/antigravity/conversations/${convId}.db`;
  if (!fs.existsSync(dbPath)) {
    console.log(`DB not found: ${dbPath}`);
    continue;
  }
  
  const tmpFile = `/tmp/dump_${convId}.hex`;
  execSync(`sqlite3 ${dbPath} 'SELECT idx, hex(step_payload) FROM steps ORDER BY idx ASC;' > ${tmpFile}`);
  
  const lines = fs.readFileSync(tmpFile, 'utf8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    const parts = line.split('|');
    if (parts.length < 2) continue;
    const idx = parseInt(parts[0], 10);
    const hex = parts[1];
    
    const buf = Buffer.from(hex, 'hex');
    const str = buf.toString('utf8');
    
    const actions = extractJsonArgs(str);
    for (const action of actions) {
      action._conv = convId;
      action._idx = idx;
      allActions.push(action);
    }
  }
  fs.unlinkSync(tmpFile);
}

// Remove exact duplicates
const uniqueActions = [];
const seenHashes = new Set();
for (const action of allActions) {
  if (!seenHashes.has(action._hash)) {
    seenHashes.add(action._hash);
    uniqueActions.push(action);
  }
}

console.log(`Found ${uniqueActions.length} unique file modifications across 7 conversations.`);

let successCount = 0;
let failCount = 0;

for (const action of uniqueActions) {
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
        console.log(`[replace_file_content] SKIP (TargetContent not found) in ${filePath}`);
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
        console.log(`[multi_replace_file_content] SKIP (TargetContent not found) in ${filePath}`);
        failCount++;
      }
    }
  } catch (err) {
    console.error(`Error applying action to ${action.TargetFile}: ${err.message}`);
    failCount++;
  }
}

console.log(`Recovery complete. Successful apps: ${successCount}, Failed/Skipped: ${failCount}`);
