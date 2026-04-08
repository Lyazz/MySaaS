const fs = require('fs');
const path = require('path');

const templates = ['modern', 'minimal', 'playful', 'activewear', 'stationnery', 'cyber', 'food', 'wellness', 'cozy', 'street', 'chrono'];
const dir = path.join(__dirname, '../components/storefront/templates');

// ─── 1. Script injection: mobileMenuOpen ref ───
const mobileMenuRef = `\n// Mobile menu\nconst mobileMenuOpen = ref(false)\n`;

// ─── 2. Hamburger button HTML ───
const hamburgerBtn = `               <!-- Hamburger (Mobile) -->
               <button class="lg:hidden p-1" @click="mobileMenuOpen = true">
                 <Icon name="lucide:menu" class="w-6 h-6" />
               </button>`;

// ─── 3. Mobile Drawer HTML (placed after </header>) ───
const mobileDrawer = `
      <!-- Mobile Drawer -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="mobileMenuOpen" class="fixed inset-0 bg-black/40 z-[60]" @click="mobileMenuOpen = false" />
        </Transition>
        <Transition name="slide">
          <div v-if="mobileMenuOpen" class="fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-white z-[61] shadow-2xl flex flex-col overflow-y-auto">
            <!-- Drawer header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span class="text-lg font-bold text-slate-900">{{ tenantName }}</span>
              <button @click="mobileMenuOpen = false" class="p-1 text-slate-500 hover:text-slate-900">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 py-3">
              <div class="relative">
                <input
                  type="text"
                  v-model="searchQuery"
                  :placeholder="storefrontContent.search?.placeholder || 'Search products...'"
                  class="w-full border border-slate-200 bg-slate-50 rounded-lg py-2.5 pl-4 pr-10 text-sm placeholder:text-slate-400 text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null"
                  @blur="setTimeout(() => isSearchDropdownOpen = false, 200)"
                >
                <Icon name="lucide:search" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <div
                  v-show="isSearchDropdownOpen"
                  class="absolute top-[100%] left-0 right-0 mt-1 bg-white border border-slate-100 shadow-xl z-50 rounded-lg overflow-hidden"
                >
                  <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                  <div v-else class="flex flex-col">
                    <NuxtLink
                      v-for="product in searchResults"
                      :key="product.id"
                      :to="'/p/' + product.slug"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      @click="isSearchDropdownOpen = false; mobileMenuOpen = false"
                    >
                      <img v-if="product.images && product.images.length > 0" :src="product.images[0]" class="w-10 h-10 object-cover rounded shadow-sm" />
                      <div v-else class="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                         <Icon name="lucide:image" class="w-4 h-4 text-slate-300" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-900 truncate">{{ product.title }}</div>
                        <div class="text-xs text-brand-600 font-bold mt-0.5">{{ product.price }} {{ currencyCode }}</div>
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nav links -->
            <nav class="flex flex-col px-5 py-2 gap-1">
              <NuxtLink to="/" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.home }}</NuxtLink>
              <NuxtLink to="/products" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.shop }}</NuxtLink>
              <NuxtLink to="/contact" class="py-3 text-sm font-medium text-slate-700 hover:text-brand-600 border-b border-slate-50" @click="mobileMenuOpen = false">{{ storefrontContent.nav.contact }}</NuxtLink>
            </nav>

            <!-- Categories -->
            <div v-if="tenantCategories && tenantCategories.length" class="px-5 py-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{{ storefrontContent.nav.categories || 'Categories' }}</h4>
              <div class="flex flex-col gap-1">
                <NuxtLink
                  v-for="cat in tenantCategories"
                  :key="cat.id"
                  :to="'/c/' + cat.slug"
                  class="py-2 text-sm text-slate-600 hover:text-brand-600 transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ cat.title }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>`;

// ─── 4. CSS transitions ───
const styleBlock = `
<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>
`;

templates.forEach(t => {
  const f = path.join(dir, t, 'StoreShell.vue');
  if (!fs.existsSync(f)) { console.log('SKIP (not found): ' + t); return; }
  let c = fs.readFileSync(f, 'utf8');

  if (c.includes('mobileMenuOpen')) {
    console.log('SKIP (already done): ' + t);
    return;
  }

  // 1. Inject mobileMenuOpen ref after search logic's closing })
  // Find the "// Build dynamic menu" marker and inject before it
  if (!c.includes('// Build dynamic menu')) {
    console.log('SKIP (no marker): ' + t);
    return;
  }
  c = c.replace('// Build dynamic menu', mobileMenuRef + '// Build dynamic menu');

  // 2. Add hamburger button at the start of the actions/icons area
  // Look for common patterns in the actions area - find the first action div after the nav
  // For templates with "flex-1 max-w-lg" search container, add hamburger before it
  if (c.includes('flex-1 max-w-lg')) {
    c = c.replace(
      /(<div class="flex-1 max-w-lg)/,
      hamburgerBtn + '\n               $1'
    );
  }
  // For food/wellness that have different action div patterns
  else if (c.includes('<!-- Actions (Right) -->')) {
    c = c.replace(
      '<!-- Actions (Right) -->',
      '<!-- Actions (Right) -->'
    );
    // Insert hamburger as first child of the actions div
    c = c.replace(
      /(<!-- Actions \(Right\) -->\s*<div class="[^"]*">)/,
      '$1\n' + hamburgerBtn
    );
  }
  // Generic fallback: find the actions div
  else if (c.includes('<!-- Right: Actions')) {
    c = c.replace(
      /(<!-- Right: Actions[^>]*-->\s*<div class="[^"]*">)/,
      '$1\n' + hamburgerBtn
    );
  }

  // Verify hamburger was injected
  if (!c.includes('mobileMenuOpen = true')) {
    console.log('WARN: hamburger not injected for ' + t + ' - trying generic approach');
    // Try a more generic approach: find the first action button/div area after nav
    const navEnd = c.indexOf('</nav>');
    if (navEnd > -1) {
      // Find the next <div after the nav closing
      const afterNav = c.substring(navEnd);
      const nextDiv = afterNav.indexOf('<div');
      if (nextDiv > -1) {
        const insertPos = navEnd + nextDiv;
        const nextDivEnd = c.indexOf('>', insertPos) + 1;
        c = c.substring(0, nextDivEnd) + '\n' + hamburgerBtn + c.substring(nextDivEnd);
      }
    }
  }

  // 3. Inject mobile drawer after </header>
  c = c.replace('</header>', '</header>\n' + mobileDrawer);

  // 4. Add style block if not present
  if (!c.includes('.slide-enter-active')) {
    // Add before the last line or at the end
    if (c.trimEnd().endsWith('</template>')) {
      c = c.trimEnd() + '\n' + styleBlock;
    } else {
      c += '\n' + styleBlock;
    }
  }

  fs.writeFileSync(f, c);
  console.log('OK: ' + t);
});
