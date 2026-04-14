const fs = require('fs');
const path = require('path');

const dir = '/Users/lyazz/Documents/js projects/MySaaS/components/storefront/templates';
const templates = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());

templates.forEach(t => {
    const filePath = path.join(dir, t, 'StoreShell.vue');
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 1. Remove person icon block
    // It looks like: <button ... <Icon name="lucide:user" ... </button>
    // We'll use a regex to match the button containing lucide:user.
    // It might span multiple lines.
    const userBtnRegex = /[ \t]*<button[^>]*>\s*<Icon[^>]*name="lucide:user"[^>]*>\s*<\/button>\n?/s;
    content = content.replace(userBtnRegex, '');

    // 2. Move Hamburger
    // We first extract the hamburger button.
    const hamburgerRegex = /[ \t]*<!-- Hamburger \(Mobile\) -->\s*<button class="[^"]*lg:hidden[^"]*"[^>]*>\s*<Icon name="lucide:menu"[^>]*>\s*<\/button>\n?/s;
    const match = content.match(hamburgerRegex);
    
    if (match) {
        const hamburgerBlock = match[0];
        // Remove it from its original place
        content = content.replace(hamburgerRegex, '\n');
        
        // Find where to insert it. We want it next to the Cart or just at the end of the icons container.
        // Look for the Cart NuxtLink and insert after it, but before the closing div.
        // Wait, the icons are usually in `<div class="flex items-center gap-3">` or similar.
        // Let's insert it immediately after the cart block! 
        // The cart block looks like:
        // <!-- Cart -->
        // <NuxtLink ...> ... <Icon name="lucide:shopping-bag" /> (or handbag) ... </NuxtLink>
        // It's followed by `</div>` wrapper of the icons.
        
        const cartEndRegex = /<!-- Cart -->.*?<\/NuxtLink>/s;
        if (cartEndRegex.test(content)) {
            content = content.replace(cartEndRegex, match => match + '\n' + hamburgerBlock);
        } else {
            // fallback, insert just before the end of the header action container
            console.log(`Could not find Cart in ${t}`);
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Processed ${t}`);
});
