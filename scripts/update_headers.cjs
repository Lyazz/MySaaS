const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}
const dir = '/Users/lyazz/Documents/js projects/MySaaS/components/storefront/templates';
let files;
try {
  files = getFiles(dir).filter(f => f.endsWith('StoreShell.vue'));
} catch (e) {
  console.error("Error reading dir:", e);
  process.exit(1);
}

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Script Replacement
  // We look for `const categories = computed(() => { ... return base \n})`
  let startIndex = content.indexOf('const categories = computed(() => {');
  let endIndex = content.indexOf('return base', startIndex);
  if (startIndex !== -1 && endIndex !== -1) {
    endIndex = content.indexOf('})', endIndex) + 2;
    let newCategories = `const categories = computed(() => {
    return [
        { name: storefrontContent.value.nav.home, href: '/' },
        { name: storefrontContent.value.nav.shop, href: '/products' }
    ]
})`;
    content = content.substring(0, startIndex) + newCategories + content.substring(endIndex);
  }

  // 2. Template Replacement
  const linkRegex = /<NuxtLink[^>]*?v-for="item in categories"[^>]*?class="([^"]+)"[^>]*?active-class="([^"]+)"[^>]*?>[\s\S]*?\{\{\s*item\.name\s*\}\}\s*<\/NuxtLink>/;
  const linkMatch = content.match(linkRegex);
  if (linkMatch) {
     const classes = linkMatch[1];
     const activeClasses = linkMatch[2];
     const r = `<NuxtLink to="/" class="${classes}" active-class="${activeClasses}">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="${classes}" active-class="${activeClasses}">{{ storefrontContent.nav.shop }}</NuxtLink>

              <!-- Categories Dropdown -->
              <div class="relative group flex items-center h-full">
                <button class="${classes} flex items-center gap-1 cursor-pointer">
                  {{ storefrontContent.nav.categories || 'Categories' }}
                  <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </button>
                <div class="absolute top-[80%] left-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 rounded-md overflow-hidden">
                  <NuxtLink
                    v-for="cat in tenantCategories"
                    :key="cat.id"
                    :to="\`/c/\${cat.slug}\`"
                    class="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                  >
                    {{ cat.title }}
                  </NuxtLink>
                </div>
              </div>

              <NuxtLink to="/contact" class="${classes}" active-class="${activeClasses}">{{ storefrontContent.nav.contact }}</NuxtLink>`;
     content = content.replace(linkMatch[0], r);
  } else {
     console.log('No NuxtLink v-for match in ' + file);
  }
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated ' + file);
});
