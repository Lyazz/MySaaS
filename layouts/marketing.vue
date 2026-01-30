<template>
  <div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-600">
    <MarketingNavBar />
    <div class="h-20 bg-slate-900"></div> <!-- Spacer for fixed header -->

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white">
                <Icon name="lucide:store" class="w-3 h-3" />
              </div>
              <span class="text-xl font-sans font-bold text-slate-900">Swekly</span>
            </div>
            <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
              Empowering businesses with cutting-edge tools and a premium experience. Built for scale, designed for you.
            </p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Product
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Features</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Pricing</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Changelog</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Support
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Documentation</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >API Status</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >Contact</a>
              </li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-center text-sm text-slate-400">
            &copy; {{ new Date().getFullYear() }} Swekly Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
