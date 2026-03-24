const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'components/storefront/templates');
const templates = ['activewear', 'classic', 'cozy', 'cyber', 'food', 'minimal', 'modern', 'playful', 'stationnery', 'street', 'wellness'];

for (const tpl of templates) {
    if (tpl === 'playful') continue; // Already manually fixed

    const cardPath = path.join(templatesDir, tpl, 'ProductCard.vue');
    if (fs.existsSync(cardPath)) {
        let content = fs.readFileSync(cardPath, 'utf-8');
        let initialLength = content.length;

        // The old countdown ends with `/>` and then `</div>`
        let regex = /[ \t]*<!-- Countdown -->\s*<div[^>]*>[\s\S]*?StorefrontSharedCountdownTimer[\s\S]*?\/>\s*<\/div>\s*/g;

        content = content.replace(regex, '');

        if (content.length !== initialLength) {
            fs.writeFileSync(cardPath, content, 'utf-8');
            console.log('Removed duplicate countdown from ' + cardPath);
        } else {
            console.log('No duplicate found in ' + cardPath);
        }
    }
}
