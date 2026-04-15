const fs = require('fs');
const path = './components/storefront/templates/registry.ts';
let content = fs.readFileSync(path, 'utf-8');

// Add imports
const interiorImports = `
// Interior Imports
import InteriorHome from './interior/Home.vue'
import InteriorStoreShell from './interior/StoreShell.vue'
import InteriorThemeProvider from './interior/ThemeProvider.vue'
import InteriorCategory from './interior/Category.vue'
import InteriorContact from './interior/ContactPage.vue'
import InteriorAbout from './interior/AboutPage.vue'
import InteriorCheckout from './interior/Checkout.vue'
import InteriorProduct from './interior/Product.vue'
import InteriorProductCard from './interior/ProductCard.vue'
import InteriorShop from './interior/Shop.vue'
import InteriorCart from './interior/Cart.vue'
`;

// Insert imports after last Chrono import
content = content.replace(/(import ChronoCart from '\.\/chrono\/Cart\.vue'\n)/, `$1\n${interiorImports}`);

// Update TemplateKey type
content = content.replace(/(export type TemplateKey = .*?)'chrono'/, `$1'chrono' | 'interior'`);

// Update DEFAULT_TEMPLATE? No.

// Update resolveTemplateKey array
content = content.replace(/('chrono']\.includes)/, `'chrono', 'interior'].includes`);

// For each export const xTemplates =, insert `interior: InteriorX`
const objectsToUpdate = [
    { name: 'homeTemplates', comp: 'Home' },
    { name: 'productTemplates', comp: 'Product' },
    { name: 'productCardTemplates', comp: 'ProductCard' },
    { name: 'categoryTemplates', comp: 'Category' },
    { name: 'storeShellTemplates', comp: 'StoreShell' },
    { name: 'shopTemplates', comp: 'Shop' },
    { name: 'checkoutTemplates', comp: 'Checkout' },
    { name: 'cartTemplates', comp: 'Cart' },
    { name: 'aboutPageTemplates', comp: 'About' },
    { name: 'contactPageTemplates', comp: 'Contact' },
    { name: 'themeProviderTemplates', comp: 'ThemeProvider' }
];

for (const obj of objectsToUpdate) {
    const regex = new RegExp(`(export const ${obj.name} = {[\\s\\S]*?chrono: Chrono${obj.comp}\\n})`, 'm');
    content = content.replace(regex, function(match) {
        return match.replace(`chrono: Chrono${obj.comp}\n}`, `chrono: Chrono${obj.comp},\n  interior: Interior${obj.comp}\n}`);
    });
}

fs.writeFileSync(path, content);
console.log('Registry updated');
