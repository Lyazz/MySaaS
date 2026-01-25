<template>
  <div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-600">
    <header class="bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200/60 shadow-sm transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-20 items-center">
          <!-- Logo -->
          <div class="flex-shrink-0 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <NuxtLink to="/" class="text-2xl font-display font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
              MySaaS
            </NuxtLink>
          </div>

          <!-- Navigation -->
          <div class="flex items-center space-x-8">
            <nav class="hidden md:flex space-x-8">
              <span class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer">Features</span>
              <span class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer">Pricing</span>
              <NuxtLink to="/about" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">About</NuxtLink>
            </nav>

            <div class="h-6 w-px bg-slate-200 hidden md:block"></div>

            <div class="flex items-center space-x-4">
               <NuxtLink to="/login" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Login
                </NuxtLink>
                <NuxtLink to="/register" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Get Started
                </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span class="text-xl font-display font-bold text-slate-900">MySaaS</span>
            </div>
            <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
              Empowering businesses with cutting-edge tools and a premium experience. Built for scale, designed for you.
            </p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">Product</h3>
            <ul class="space-y-3">
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Features</a></li>
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Pricing</a></li>
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
             <h3 class="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">Support</h3>
            <ul class="space-y-3">
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Documentation</a></li>
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">API Status</a></li>
              <li><a href="#" class="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-center text-sm text-slate-400">
            &copy; {{ new Date().getFullYear() }} MySaaS Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
