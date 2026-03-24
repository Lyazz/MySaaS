const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'components/storefront/templates');
const templates = ['activewear', 'classic', 'cozy', 'cyber', 'food', 'minimal', 'stationnery', 'street', 'wellness'];

for (const tpl of templates) {
    const cardPath = path.join(templatesDir, tpl, 'ProductCard.vue');
    if (fs.existsSync(cardPath)) {
        let content = fs.readFileSync(cardPath, 'utf-8');
        // Fix the literal '\n' outputting the syntax error
        content = content.replace(/\\nconst cartStore = useCartStore\(\)/g, '\nconst cartStore = useCartStore()');
        fs.writeFileSync(cardPath, content, 'utf-8');
        console.log('Fixed syntax error in ' + cardPath);
    }

    const detailsPath = path.join(templatesDir, tpl, 'partials/ProductDetails.vue');
    if (fs.existsSync(detailsPath)) {
        let content = fs.readFileSync(detailsPath, 'utf-8');
        // Fix the missing variable error
        content = content.replace(/&& isPromoValid"/g, '"');
        fs.writeFileSync(detailsPath, content, 'utf-8');
        console.log('Fixed missing variable in ' + detailsPath);
    }
}
