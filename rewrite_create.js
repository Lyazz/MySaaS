const fs = require('fs');

let content = fs.readFileSync('pages/admin/orders/create.vue', 'utf8');

// 1. Fix script imports and setup
content = content.replace(
  /import { useI18n } from '~\/composables\/useI18n'\n/,
  ''
);

content = content.replace(
  /const { t } = useI18n\(\)/,
  "const { t } = useI18n({ useScope: 'global' })"
);

content = content.replace(
  /definePageMeta\(\{[\s\S]*?\}\)/,
  `definePageMeta({\n  titleKey: 'admin.pages.orders.create.title',\n  layout: 'admin',\n  middleware: ['auth', 'tenant-member']\n})`
);

// 2. Fix layout and colors
const newTemplateStart = `<template>
  <div class="max-w-7xl mx-auto pb-12">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/orders" class="text-gray-700 hover:text-lime-600">
            {{ t('admin.nav.orders') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.orders.create.title') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        {{ t('admin.pages.orders.create.title') }}
      </h2>
    </div>

    <!-- Main container -->
    <div class="lg:flex lg:gap-6 items-start">
        
        <!-- Left Column: Details -->
        <div class="flex-1 space-y-6">`;

content = content.replace(/<template>[\s\S]*?<!-- Left Column: Details -->\s*<div class="[^"]*">/, newTemplateStart);

// Let's replace the custom slate headers with standard gray h3s
content = content.replace(/<div class="bg-white rounded-xl shadow-sm border border-slate-200">/g, '<div class="bg-white rounded-lg shadow p-6">');
content = content.replace(/<div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50\/50 rounded-t-xl">\s*<h2 class="font-bold text-slate-800 flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-lime-50 flex items-center justify-center text-lime-600">\s*<Icon name="lucide:user" class="w-4 h-4" \/>\s*<\/div>\s*\{\{ t\('admin.pages.orders.create.customerSection'\) \}\}\s*<\/h2>\s*<\/div>\s*<div class="p-4 md:p-5 space-y-4">/g, `<h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('admin.pages.orders.create.customerSection') }}</h3>\n            <div class="space-y-4">`);

content = content.replace(/<div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50\/50 rounded-t-xl">\s*<h2 class="font-bold text-slate-800 flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">\s*<Icon name="lucide:truck" class="w-4 h-4" \/>\s*<\/div>\s*\{\{ t\('admin.pages.orders.create.shippingSection'\) \}\}\s*<\/h2>\s*<\/div>\s*<div class="p-4 md:p-5 space-y-4">/g, `<h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('admin.pages.orders.create.shippingSection') }}</h3>\n            <div class="space-y-4">`);


// Right Column replacements
content = content.replace(/<!-- Right Column: Cart & Summary -->\s*<div class="w-full lg:w-\[450px\] space-y-6 mt-6 lg:mt-0 shrink-0">\s*<div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-\[calc\(100vh-8rem\)\]">/, `<!-- Right Column: Cart & Summary -->
        <div class="w-full lg:w-[400px] space-y-6 mt-6 lg:mt-0 shrink-0 sticky top-6">
          <div class="bg-white rounded-lg shadow p-6">`);

content = content.replace(/<div class="p-4 border-b border-slate-200 bg-slate-50\/50 rounded-t-xl flex justify-between items-center">\s*<h2 class="font-bold text-slate-800 flex items-center gap-2">\s*<div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">\s*<Icon name="lucide:shopping-bag" class="w-4 h-4" \/>\s*<\/div>\s*\{\{ t\('admin.pages.orders.create.itemsSection'\) \}\}\s*<\/h2>\s*<\/div>/, `<h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('admin.pages.orders.create.itemsSection') }}</h3>`);

// Clean up Cart inner items. Remove slate backgrounds and custom padding
content = content.replace(/<div class="p-4 border-b border-slate-100 bg-white">/, '<div class="mb-4">');

content = content.replace(/<div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50\/30 min-h-\[150px\]">/, '<div class="space-y-3 max-h-[400px] overflow-y-auto mb-6 pr-2">');

content = content.replace(/<div class="bg-white border-t border-slate-200 p-4 rounded-b-xl shadow-\[0_-4px_6px_-1px_rgba\(0,0,0,0.05\)\] z-20">/, '<div class="pt-4 border-t border-gray-200">');

// End of template logic
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- Variant Selection Modal/, `</div>
        </div>
      </div>
    </div>

    <!-- Variant Selection Modal`);

fs.writeFileSync('pages/admin/orders/create.vue', content);
console.log('Done!');
