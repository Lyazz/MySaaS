const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'components/storefront/templates');
const templates = ['activewear', 'classic', 'cozy', 'cyber', 'food', 'minimal', 'modern', 'playful', 'stationnery', 'street', 'wellness'];

for (const tpl of templates) {
    const cardPath = path.join(templatesDir, tpl, 'ProductCard.vue');
    if (fs.existsSync(cardPath)) {
        let content = fs.readFileSync(cardPath, 'utf-8');
        content = content.replace(/return !!props\.product\.promotionalPrice/g, 'return true');
        fs.writeFileSync(cardPath, content, 'utf-8');
        console.log('Fixed isPromoValid in ' + cardPath);
    }

    const productPath = path.join(templatesDir, tpl, 'Product.vue');
    if (fs.existsSync(productPath)) {
        let content = fs.readFileSync(productPath, 'utf-8');
        content = content.replace(/return !!props\.product\.promotionalPrice/g, 'return true');
        fs.writeFileSync(productPath, content, 'utf-8');
        console.log('Fixed isPromoValid in ' + productPath);
    }
}
