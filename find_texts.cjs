const fs = require('fs');
const path = require('path');

const dirsToScan = ['components', 'pages', 'layouts', 'app.vue'];
const baseDir = __dirname;

function scan(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
        if (dir.endsWith('.vue')) {
            results = results.concat(processFile(dir));
        }
    } else if (stat.isDirectory()) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            results = results.concat(scan(path.join(dir, file)));
        }
    }
    return results;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = [];
    
    // Extract template block
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i);
    if (!templateMatch) return results;
    
    const templateContent = templateMatch[1];
    
    // Split by lines to keep track of line numbers
    const lines = content.split('\n');
    let inTemplate = false;
    let templateLines = [];
    let startLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<template>')) {
            inTemplate = true;
            startLine = i;
        }
        if (inTemplate) {
            templateLines.push(lines[i]);
        }
        if (lines[i].includes('</template>')) {
            break;
        }
    }
    
    // We will just do a simple regex on the template content: >([^<]+)<
    // To get accurate line numbers, we'll iterate through the matches and find the line
    
    const textNodeRegex = />([^<]+)</g;
    let match;
    while ((match = textNodeRegex.exec(templateContent)) !== null) {
        let text = match[1].trim();
        // Ignore if empty, contains {{, or doesn't contain any letters
        if (text && !text.includes('{{') && /[a-zA-Z]/.test(text)) {
            // Find line number
            const index = match.index;
            const textBeforeMatch = templateContent.substring(0, index);
            const lineOffset = (textBeforeMatch.match(/\n/g) || []).length;
            const absoluteLine = startLine + lineOffset + 1; // +1 because startLine is 0-indexed but we want 1-indexed line of <template>... wait, startLine is the line with <template>, so it's correct.
            
            // Also ignore things that look like JS or Vue attributes that leaked, though >...< shouldn't have them.
            // Ignore single characters if they are just symbols or numbers.
            // Ignore if it's just a non-breaking space etc.
            if (text !== '&nbsp;' && text.length > 1) {
                // Filter out common things like operators: '->', '=>'
                if (/^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text)) {
                   results.push({
                        file: path.relative(baseDir, filePath),
                        line: absoluteLine,
                        text: text
                    }); 
                } else if (/[a-zA-Z]{2,}/.test(text)) { // has at least a 2 letter word
                    results.push({
                        file: path.relative(baseDir, filePath),
                        line: absoluteLine,
                        text: text
                    }); 
                }
            }
        }
    }
    
    // Also let's check for untranslated attributes like placeholder="..." or title="..."
    // Regex: (placeholder|title|aria-label)="([^"]*[a-zA-Z][^"]*)"
    const attrRegex = /\b(placeholder|title|aria-label)="([^"]+)"/g;
    while ((match = attrRegex.exec(templateContent)) !== null) {
        let text = match[2].trim();
        if (text && !text.includes('{{') && !text.startsWith('$t') && /[a-zA-Z]/.test(text)) {
            const index = match.index;
            const textBeforeMatch = templateContent.substring(0, index);
            const lineOffset = (textBeforeMatch.match(/\n/g) || []).length;
            const absoluteLine = startLine + lineOffset + 1;
            
            results.push({
                file: path.relative(baseDir, filePath),
                line: absoluteLine,
                text: `${match[1]}="${text}"`
            });
        }
    }
    
    return results;
}

let allResults = [];
for (const dir of dirsToScan) {
    allResults = allResults.concat(scan(path.join(baseDir, dir)));
}

fs.writeFileSync('untranslated_texts_utf8.json', JSON.stringify(allResults, null, 2), 'utf-8');
console.log('Saved to untranslated_texts_utf8.json');
