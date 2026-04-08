const fs = require('fs');
const path = require('path');

const templates = ['modern', 'minimal', 'playful', 'activewear', 'stationnery', 'cyber'];
const templatesDir = path.join(__dirname, '../components/storefront/templates');

const scriptInjection = `
// Search Logic
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const isSearchDropdownOpen = ref(false)
let searchTimeout

watch(searchQuery, (newVal) => {
    if (newVal.length >= 3) {
        searchLoading.value = true
        isSearchDropdownOpen.value = true
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            try {
                const url = useTenantApiUrl('/api/products')
                const data = await $fetch(url, {
                    headers: useTenantApiHeaders(),
                    query: { q: newVal }
                })
                searchResults.value = (data || []).slice(0, 5)
            } catch (e) {
                console.error('Search error:', e)
            } finally {
                searchLoading.value = false
            }
        }, 500)
    } else {
        searchResults.value = []
        isSearchDropdownOpen.value = false
    }
})

const categories = computed(`;

const templateInjection = `
                  <!-- Search Dropdown -->
                  <div
                    v-show="isSearchDropdownOpen"
                    class="absolute top-[100%] right-0 mt-2 w-64 bg-white border border-slate-100 shadow-xl z-50 rounded-md overflow-hidden text-left"
                  >
                    <div v-if="searchLoading" class="px-4 py-3 text-sm text-slate-500">Searching...</div>
                    <div v-else-if="searchResults.length === 0" class="px-4 py-3 text-sm text-slate-500">No products found.</div>
                    <div v-else class="flex flex-col">
                      <NuxtLink
                        v-for="product in searchResults"
                        :key="product.id"
                        :to="'/p/' + product.slug"
                        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        @click="isSearchDropdownOpen = false"
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
`;

templates.forEach(t => {
  const file = path.join(templatesDir, t, 'StoreShell.vue');
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('const searchQuery = ref')) {
    console.log('Skipping ' + t + ' - already injected.');
    return;
  }

  // 1. Inject script
  content = content.replace('const categories = computed(', scriptInjection);

  // 2. Inject template 
  content = content.replace(
      /(<input\s+type="text"\s+)(:placeholder="storefrontContent\.search\.placeholder")([\s\S]*?>)/g,
      '$1v-model="searchQuery" :placeholder="storefrontContent.search?.placeholder || \'Search products...\'" @focus="searchQuery.length >= 3 ? isSearchDropdownOpen = true : null" @blur="setTimeout(() => isSearchDropdownOpen = false, 200)" $3'
  );

  content = content.replace(
      /(<Icon name="lucide:search"[\s\S]*?(?:<\/div>|\/>))/g,
      '$1\\n' + templateInjection
  );

  fs.writeFileSync(file, content);
  console.log('Updated ' + t);
});
