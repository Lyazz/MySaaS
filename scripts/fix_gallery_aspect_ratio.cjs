const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../components/storefront/templates');
const templates = fs.readdirSync(templatesDir).filter(f => fs.statSync(path.join(templatesDir, f)).isDirectory());

let changedFiles = 0;

for (const template of templates) {
    const galleryPath = path.join(templatesDir, template, 'partials', 'ProductGallery.vue');
    if (fs.existsSync(galleryPath)) {
        let content = fs.readFileSync(galleryPath, 'utf8');
        let originalContent = content;
        
        // Handle explicit cases of horizontal or square in main gallery (usually the first large block)
        // Modern, Playful, Activewear, Minimal
        content = content.replace(/aspect-square md:aspect-\[4\/3\]/g, 'aspect-[4/5]');
        // Food, Wellness, Classic, Stationnery
        content = content.replace(/aspect-\[4\/3\](?! md:)/g, 'aspect-[4/5]');
        // Cozy: <div class="relative w-full aspect-square bg-slate-50 rounded-[2rem] overflow-hidden shadow-soft">
        content = content.replace(/w-full aspect-square bg-slate-50 rounded-\[2rem\]/, 'w-full aspect-[4/5] bg-slate-50 rounded-[2rem]');
        // Cyber: relative aspect-square overflow-hidden rounded-xl bg-purple-900\/30 group
        content = content.replace(/relative aspect-square overflow-hidden rounded-xl bg-purple-900\/30 group/, 'relative aspect-[4/5] overflow-hidden rounded-xl bg-purple-900/30 group');
        // Chrono: class="aspect-square overflow-hidden relative group cursor-zoom-in mb-4 border"
        content = content.replace(/class="aspect-square overflow-hidden relative group cursor-zoom-in mb-4 border"/, 'class="aspect-[4/5] overflow-hidden relative group cursor-zoom-in mb-4 border"');
        // Street: <div class="relative w-full aspect-square border-4 border-black bg-gray-100 overflow-hidden shadow-\[8px_8px_0px_0px_#000\]">
        content = content.replace(/w-full aspect-square border-4/, 'w-full aspect-[4/5] border-4');

        if (content !== originalContent) {
            fs.writeFileSync(galleryPath, content, 'utf8');
            console.log(`Updated ${template}/partials/ProductGallery.vue`);
            changedFiles++;
        }
    }
}

console.log(`Updated ${changedFiles} files.`);
