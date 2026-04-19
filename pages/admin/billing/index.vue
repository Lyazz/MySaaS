<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.billing.title') }}</h1>
        <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.billing.subtitle') }}</p>
      </div>
      <NuxtLink
        to="/pricing"
        class="ui-btn ui-btn--secondary inline-flex items-center gap-2"
      >
        <Icon name="lucide:arrow-up-right" class="w-4 h-4" />
        <span class="text-sm font-semibold">{{ t('admin.pages.billing.seePricing') }}</span>
      </NuxtLink>
    </div>

    <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
      {{ t('admin.pages.billing.errors.loadFailed') }}
    </div>

    <template v-else>
    <!-- Payment status banners -->
    <div v-if="pendingPayments.length > 0" class="flex items-start gap-4 p-5 rounded-xl" style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25)">
      <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background: rgba(245,158,11,0.15)">
        <Icon name="lucide:clock" class="w-5 h-5 text-amber-400" />
      </div>
      <div class="flex-1">
        <p class="font-semibold text-amber-400">{{ t('admin.pages.billing.status.pending.title', 'Payment under review') }}</p>
        <p class="text-sm text-amber-500/80 mt-0.5">
          {{ t('admin.pages.billing.status.pending.desc', 'We received your payment proof and our team is reviewing it. Your subscription will be updated once approved.') }}
        </p>
      </div>
      <span class="shrink-0 text-xs font-bold text-amber-400 px-2.5 py-1 rounded-full" style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.25)">
        {{ pendingPayments.length }} {{ t('admin.pages.billing.status.pending.badge', 'pending') }}
      </span>
    </div>

    <div v-else-if="latestApprovedProof" class="flex items-start gap-4 p-5 rounded-xl" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25)">
      <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background: rgba(34,197,94,0.15)">
        <Icon name="lucide:check-circle-2" class="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <p class="font-semibold text-emerald-400">{{ t('admin.pages.billing.status.approved.title', 'Payment approved') }}</p>
        <p class="text-sm text-emerald-500/80 mt-0.5">
          {{ t('admin.pages.billing.status.approved.desc', 'Your latest payment was approved and your subscription is active.') }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Premium Current Plan Card -->
      <div class="lg:col-span-3 bg-gradient-to-br from-slate-900 via-slate-800 [--tw-gradient-to:color-mix(in_srgb,var(--brand)_60%,#000)] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <!-- Decorative Background Glow -->
        <div class="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 [background:var(--brand)]/20 blur-3xl rounded-full pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-slate-500/20 blur-3xl rounded-full pointer-events-none"></div>

        <div class="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          <!-- Plan Info -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-sm font-bold [color:rgba(var(--brand-rgb)/0.85)] uppercase tracking-wider relative inline-flex items-center gap-2">
                <span class="w-2 h-2 rounded-full [background:var(--brand)] animate-pulse"></span>
                {{ t('admin.pages.billing.currentPlan.title', 'Current Plan') }}
              </h2>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border backdrop-blur-md"
                :class="snapshot?.subscription?.status === 'ACTIVE' ? '[background:var(--brand)]/10 [border-color:var(--brand)]/30 [color:rgba(var(--brand-rgb)/0.7)]' : 'bg-slate-500/10 border-slate-500/30 text-slate-300'"
              >
                {{ snapshot?.subscription?.status || 'UNKNOWN' }}
              </span>
            </div>
            
            <div class="flex items-baseline gap-3">
              <div class="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {{ snapshot?.plan?.name || '—' }}
              </div>
              <div class="text-slate-400 font-medium text-lg">
                {{ snapshot?.subscription?.interval === 'year' ? t('admin.pages.billing.currentPlan.interval.yearly', '/ year') : t('admin.pages.billing.currentPlan.interval.monthly', '/ month') }}
              </div>
            </div>
            <p class="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              {{ snapshot?.plan?.description || '' }}
            </p>
          </div>

          <!-- Usage & Limits -->
          <div class="w-full md:w-auto min-w-[300px] bg-slate-950/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 flex flex-col justify-center">
            <div class="flex items-baseline justify-between mb-2">
              <span class="text-sm font-semibold text-slate-300">{{ t('admin.pages.billing.currentPlan.cards.ordersThisPeriod', 'Orders mapped this period') }}</span>
              <div class="text-2xl font-black text-white">
                {{ snapshot?.usage?.ordersInPeriod ?? 0 }}
                <span class="text-sm text-slate-500 font-semibold">/ {{ formatLimit(snapshot?.usage?.ordersLimit) }}</span>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
              <div class="bg-gradient-to-r [--tw-gradient-from:var(--brand)] to-emerald-400 h-1.5 rounded-full transition-all duration-1000 ease-in-out" 
                   :style="{ width: `${Math.min(100, ((snapshot?.usage?.ordersInPeriod ?? 0) / (snapshot?.usage?.ordersLimit || 1)) * 100)}%` }">
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center gap-1.5">
                <Icon name="lucide:calendar" class="w-3.5 h-3.5" />
                {{ periodLabel }}
              </span>
              <button
                class="hover:text-white transition-colors flex items-center gap-1 font-semibold disabled:opacity-50"
                :disabled="pending"
                @click="() => refresh()"
              >
                <Icon name="lucide:rotate-cw" class="w-3.5 h-3.5" :class="{ 'animate-spin': pending }" />
                {{ t('admin.common.refresh', 'Refresh') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Plan Selection & Checkout Region -->
      <div class="lg:col-span-3 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Side: Plans -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Interval Toggle -->
          <div class="flex justify-center mb-8">
            <div class="p-1 rounded-xl inline-grid grid-cols-2 relative" style="background: var(--surface-3)">
              <button
                @click="billingInterval = 'month'"
                class="relative z-10 px-6 py-2.5 text-sm font-bold rounded-lg transition-colors flex items-center justify-center w-full"
                :class="billingInterval === 'month' ? '[color:rgba(var(--brand-rgb)/0.85)]' : ''"
                :style="billingInterval !== 'month' ? 'color: var(--text-tertiary)' : ''"
              >
                {{ t('admin.pages.billing.interval.monthly', 'Monthly Billing') }}
              </button>
              <button
                @click="billingInterval = 'year'"
                class="relative z-10 px-6 py-2.5 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
                :class="billingInterval === 'year' ? '[color:rgba(var(--brand-rgb)/0.85)]' : ''"
                :style="billingInterval !== 'year' ? 'color: var(--text-tertiary)' : ''"
              >
                {{ t('admin.pages.billing.interval.yearly', 'Yearly Billing') }}
                <span class="px-2 py-0.5 rounded-full [background:var(--brand)]/15 [color:rgba(var(--brand-rgb)/0.85)] text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{{ t('admin.pages.billing.interval.save', { pct: 20 }, 'Save 20%') }}</span>
              </button>

              <!-- Sliding Background Indicator -->
              <div
                class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-in-out"
                :class="billingInterval === 'month' ? 'translate-x-0' : 'translate-x-full'"
                style="background: var(--surface-1); border: 1px solid var(--surface-border)"
              ></div>
            </div>
        </div>

        <div v-if="pending" class="flex justify-center py-12">
          <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin [color:var(--brand)]" />
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="plan in plans"
            :key="plan.code"
            @click="selectPlan(plan.code)"
            class="relative flex flex-col p-6 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-xl"
            :class="plan.code === selectedPlanCode ? '[border-color:var(--brand)] shadow-lg [box-shadow:0_4px_14px_rgba(var(--brand-rgb)/0.1)] ring-1 [--tw-ring-color:var(--brand)]' : ''"
            :style="plan.code !== selectedPlanCode ? 'background: var(--surface-1); border-color: var(--surface-border)' : 'background: var(--surface-1)'"
          >
            <!-- Current Plan Badge -->
            <div 
              v-if="plan.code === snapshot?.subscription?.planCode" 
              class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm"
            >
              {{ t('admin.pages.billing.currentPlanBadge', 'Your Plan') }}
            </div>

            <div class="mb-4">
              <h3 class="text-xl font-black mb-1" :class="plan.code === selectedPlanCode ? '[color:rgba(var(--brand-rgb)/0.85)]' : ''" :style="plan.code !== selectedPlanCode ? 'color: var(--text-primary)' : ''">{{ plan.name }}</h3>
              <p class="text-xs min-h-[32px]" style="color: var(--text-tertiary)">{{ plan.description }}</p>
            </div>

            <div class="mb-6 flex items-baseline gap-1">
              <span class="text-3xl font-black" style="color: var(--text-primary)">
                {{ formatDzd(billingInterval === 'year' ? (plan.pricing?.annualAmountDzd || 0) * 12 : plan.pricing?.monthlyAmountDzd) }}
              </span>
              <span class="text-sm font-bold uppercase" style="color: var(--text-tertiary)">{{ plan.pricing?.currency }}</span>
              <span class="text-xs ml-1" style="color: var(--text-muted)">/ {{ billingInterval === 'year' ? t('admin.pages.billing.yr', 'yr') : t('admin.pages.billing.mo', 'mo') }}</span>
            </div>

            <!-- Features -->
            <ul class="space-y-3 mb-8 flex-1">
              <li class="flex items-start gap-2">
                <Icon name="lucide:check" class="w-4 h-4 [color:var(--brand)] mt-0.5 shrink-0" />
                <span class="text-sm font-medium" style="color: var(--text-secondary)">
                  {{ plan.ordersPerMonth === -1 ? t('admin.pages.billing.unlimitedOrders', 'Unlimited Orders') : t('admin.pages.billing.upToOrders', { count: formatLimit(plan.ordersPerMonth) }, `Up to {count} orders/mo`) }}
                </span>
              </li>
              <!-- Example of static robust features based on plans (could be dynamic in real apps) -->
              <li class="flex items-start gap-2" v-if="plan.code !== 'basic'">
                <Icon name="lucide:check" class="w-4 h-4 [color:var(--brand)] mt-0.5 shrink-0" />
                <span class="text-sm font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.billing.prioritySupport', 'Priority support') }}</span>
              </li>
              <li class="flex items-start gap-2" v-if="plan.code === 'premium'">
                <Icon name="lucide:check" class="w-4 h-4 [color:var(--brand)] mt-0.5 shrink-0" />
                <span class="text-sm font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.billing.customBranding', 'Custom branding & SMS config') }}</span>
              </li>
            </ul>

            <div 
              class="w-full py-2.5 rounded-xl border flex items-center justify-center font-bold text-sm transition-colors"
              :class="plan.code === selectedPlanCode ? '[color:rgba(var(--brand-rgb)/0.85)]' : ''"
              :style="plan.code === selectedPlanCode ? 'background: rgba(var(--brand-rgb)/0.1); border-color: var(--brand)' : 'background: var(--surface-2); border-color: var(--surface-border); color: var(--text-tertiary)'"
            >
              {{ plan.code === selectedPlanCode ? t('admin.pages.billing.selectedBtn', 'Selected') : t('admin.pages.billing.selectBtn', 'Select Plan') }}
            </div>
          </div>
        </div>
        </div> <!-- Close Left Side -->

        <!-- Right Side: Checkout (Sticky) -->
        <div id="checkout-section" class="lg:col-span-5 w-full sticky top-6">
          <!-- Checkout / Payment Flow Section -->
          <div v-if="selectedPlanCode && selectedPlanCode !== snapshot?.subscription?.planCode" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div class="w-full rounded-2xl overflow-hidden text-left" style="background: var(--surface-1); border: 1px solid var(--surface-border); box-shadow: 0 8px 24px rgba(0,0,0,0.3)">
            <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4" style="background: var(--surface-2); border-bottom: 1px solid var(--surface-border)">
              <div>
                <h3 class="text-xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.billing.payment.title', 'Complete your upgrade') }}</h3>
                <p class="text-sm mt-1" style="color: var(--text-tertiary)">{{ t('admin.pages.billing.payment.subtitle', 'Select a payment method to proceed.') }}</p>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold mb-1" style="color: var(--text-tertiary)">{{ t('admin.pages.billing.payment.totalLabel', 'Total to pay') }}</div>
                <div class="text-2xl font-black" style="color: var(--text-primary)">
                  {{ formatDzd(billingInterval === 'year' ? (plans.find(p => p.code === selectedPlanCode)?.pricing?.annualAmountDzd || 0) * 12 : plans.find(p => p.code === selectedPlanCode)?.pricing?.monthlyAmountDzd) }}
                  <span class="text-xs uppercase" style="color: var(--text-tertiary)">{{ plans.find(p => p.code === selectedPlanCode)?.pricing?.currency || 'DZD' }}</span>
                </div>
              </div>
            </div>
            
            <div class="p-6 md:p-8 space-y-6">
              <!-- Methods Grid -->
              <div class="grid grid-cols-2 gap-4">
                <label v-for="method in availableMethods" :key="method.id" class="cursor-pointer relative group">
                  <input type="radio" v-model="selectedMethod" :value="method.id" class="peer sr-only" />
                  <div class="h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 hover:[border-color:rgba(var(--brand-rgb)/0.4)] peer-checked:[border-color:var(--brand)] peer-checked:[background:var(--brand)]/10 transition-all" style="background: var(--surface-3); border-color: var(--surface-border)">
                    <Icon v-if="method.id === 'MYFIN'" name="lucide:credit-card" class="w-8 h-8 mb-2 peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-tertiary)" />
                    <Icon v-else-if="method.id === 'PAYSERA'" name="lucide:euro" class="w-8 h-8 mb-2 peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-tertiary)" />
                    <Icon v-else-if="method.id === 'BARIDIMOB'" name="lucide:smartphone" class="w-8 h-8 mb-2 peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-tertiary)" />
                    <Icon v-else-if="method.id === 'CCP'" name="lucide:building" class="w-8 h-8 mb-2 peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-tertiary)" />
                    <Icon v-else name="lucide:credit-card" class="w-8 h-8 mb-2 peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-tertiary)" />

                    <div class="text-xs font-bold text-center peer-checked:[color:rgba(var(--brand-rgb)/0.85)] transition-colors" style="color: var(--text-secondary)">{{ method.label }}</div>
                  </div>
                  <!-- Check badge -->
                  <div class="absolute -top-2 -right-2 w-6 h-6 [background:var(--brand)] text-white rounded-full flex items-center justify-center border-2 opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all shadow-md" style="border-color: var(--surface-1)">
                    <Icon name="lucide:check" class="w-3.5 h-3.5" />
                  </div>
                </label>
              </div>

              <!-- Selected Method Details -->
              <div v-if="selectedMethod" class="p-6 rounded-xl space-y-5" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
                <div class="flex gap-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background: rgba(59,130,246,0.15); color: #60a5fa">
                    <Icon name="lucide:info" class="w-5 h-5" />
                  </div>
                  <div class="text-sm whitespace-pre-line leading-relaxed flex-1 pt-1" style="color: var(--text-secondary)">{{ methodInstructions }}</div>
                </div>

                <div v-if="requiresProof(selectedMethod)" class="pt-4" style="border-top: 1px solid var(--surface-border)">
                  <label class="ui-label block mb-3">{{ t('admin.pages.billing.payment.uploadProof', 'Upload Receipt/Proof') }}</label>
                  
                  <div class="flex items-center justify-center w-full">
                    <label 
                      class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                      :class="uploadError ? 'border-red-500/50 hover:bg-red-500/5' : proofUrl ? 'border-green-500/50 hover:bg-green-500/5' : 'hover:[border-color:var(--brand)]/40'"
                      :style="!uploadError && !proofUrl ? 'border-color: var(--surface-border); background: var(--surface-3)' : uploadError ? 'background: rgba(239,68,68,0.05)' : 'background: rgba(34,197,94,0.05)'"
                    >
                      <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <Icon v-if="uploading" name="lucide:loader-2" class="w-8 h-8 [color:var(--brand)] mb-2 animate-spin" />
                        <Icon v-else-if="proofUrl" name="lucide:file-check" class="w-8 h-8 text-green-500 mb-2" />
                        <Icon v-else name="lucide:upload-cloud" class="w-8 h-8 text-slate-400 mb-2" />
                        
                        <p class="mb-1 text-sm font-semibold" :class="proofUrl ? 'text-emerald-400' : ''" :style="!proofUrl ? 'color: var(--text-secondary)' : ''">
                          {{ uploading ? t('admin.common.uploading', 'Uploading...') : proofUrl ? t('admin.pages.billing.payment.uploadSuccess', 'Receipt attached successfully') : t('admin.common.clickToUpload', 'Click to upload receipt') }}
                        </p>
                        <p v-if="!proofUrl && !uploading" class="text-xs" style="color: var(--text-muted)">PNG, JPG, WEBP, PDF (Max 10MB)</p>
                      </div>
                      <input 
                        type="file" 
                        class="hidden" 
                        accept="image/png, image/jpeg, image/webp, application/pdf" 
                        @change="handleFileUpload" 
                        :disabled="uploading"
                      />
                    </label>
                  </div>
                  <div v-if="uploadError" class="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                    <Icon name="lucide:alert-circle" class="w-4 h-4" />
                    {{ uploadError }}
                  </div>
                </div>

                <div v-if="selectedMethod === 'CHARGILY'" class="flex items-start gap-3 text-sm text-amber-800 bg-amber-100/50 p-4 rounded-xl border border-amber-200/50">
                  <Icon name="lucide:alert-triangle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span class="font-bold block mb-1">{{ t('admin.pages.billing.payment.chargilySoon', 'Coming soon') }}</span>
                    {{ t('admin.pages.billing.payment.chargilyNote', 'Automatic payment gateway integration is currently unavailable. Please choose another manual method like CCP or BaridiMob in the meantime.') }}
                  </div>
                </div>

                <div class="pt-4">
                  <button
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl [background:var(--brand)] text-white hover:[background:var(--brand)] hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed text-base font-bold transition-all"
                    :disabled="pending || uploading || submitting || (requiresProof(selectedMethod) && !proofUrl) || selectedMethod === 'CHARGILY'"
                    @click="submitPayment"
                  >
                    <Icon v-if="submitting || uploading" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
                    <Icon v-else name="lucide:shield-check" class="w-5 h-5" />
                    {{ t('admin.pages.billing.payment.submitBtn', 'Confirm & Submit Payment') }}
                  </button>
                </div>
              </div>
              
              <div v-if="submitError" class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-3">
                <Icon name="lucide:alert-octagon" class="w-5 h-5 shrink-0" />
                {{ submitError }}
              </div>
              <div v-if="submitSuccess" class="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium flex items-start gap-3">
                <Icon name="lucide:check-circle" class="w-5 h-5 shrink-0" />
                {{ t('admin.pages.billing.payment.submitSuccess', 'Your payment proof has been securely submitted and is under review by our agents. Your subscription will be updated shortly.') }}
              </div>
            </div>
          </div>
        </div>
        <!-- Empty State -->
        <div v-else class="rounded-2xl p-10 flex flex-col items-center justify-center text-center h-[350px]" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4" style="background: var(--surface-3)">
            <Icon name="lucide:credit-card" class="w-8 h-8" style="color: var(--text-muted)" />
          </div>
          <h3 class="text-xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.billing.payment.emptyTitle', 'Checkout') }}</h3>
          <p class="mt-2 text-sm" style="color: var(--text-tertiary)">{{ t('admin.pages.billing.payment.emptyDesc', 'Select a plan from the list to start your upgrade.') }}</p>
        </div>

        </div> <!-- Close Right Side -->
      </div> <!-- Close 12-col Grid Wrapper -->
    </div>

    <!-- Payment History -->
    <div v-if="paymentHistory.length > 0" class="mt-2">
      <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-2)">
          <h2 class="font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.billing.history.title', 'Payment history') }}</h2>
          <span class="text-xs" style="color: var(--text-muted)">{{ paymentHistory.length }} {{ t('admin.pages.billing.history.entries', 'entries') }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead" style="border-bottom: 1px solid var(--surface-border)">
              <tr>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.date', 'Date') }}</th>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.plan', 'Plan') }}</th>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.amount', 'Amount') }}</th>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.method', 'Method') }}</th>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.status', 'Status') }}</th>
                <th class="ui-th">{{ t('admin.pages.billing.history.col.proof', 'Proof') }}</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr v-for="pay in paymentHistory" :key="pay.id" class="ui-tr">
                <td class="ui-td text-sm whitespace-nowrap" style="color: var(--text-secondary)">{{ formatPayDate(pay.createdAt) }}</td>
                <td class="ui-td">
                  <div class="text-sm font-semibold capitalize" style="color: var(--text-primary)">{{ pay.planCode }}</div>
                  <div class="text-xs" style="color: var(--text-muted)">{{ pay.interval }}</div>
                </td>
                <td class="ui-td text-sm font-semibold whitespace-nowrap" style="color: var(--text-secondary)">{{ formatDzd(pay.amountDzd) }} {{ pay.currency }}</td>
                <td class="ui-td text-xs font-semibold uppercase" style="color: var(--text-tertiary)">{{ pay.method }}</td>
                <td class="ui-td">
                  <span
                    class="ui-badge"
                    :class="{
                      'ui-badge--amber': pay.status === 'PENDING',
                      'ui-badge--emerald': pay.status === 'PAID',
                      'ui-badge--red': pay.status === 'REJECTED',
                      'ui-badge--slate': pay.status === 'IMPORTED',
                    }"
                  >
                    {{ pay.status }}
                  </span>
                </td>
                <td class="ui-td text-sm">
                  <button
                    v-if="pay.proofUrl"
                    type="button"
                    class="[color:rgba(var(--brand-rgb)/0.85)] hover:underline font-semibold inline-flex items-center gap-1"
                    @click="openPaymentProof(pay)"
                  >
                    <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
                    {{ t('admin.pages.billing.history.viewProof', 'View') }}
                  </button>
                  <span v-else style="color: var(--text-muted)">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

const { t, locale } = useI18n({ useScope: 'global' })

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.billing.metaTitle'
})

type BillingSnapshot = {
  subscription: {
    source: 'db' | 'default'
    planCode: string
    interval: 'month' | 'year'
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
  }
  plan: {
    code: string
    name: string
    description: string
    pricing: { currency: string; monthlyAmountDzd: number; annualAmountDzd: number }
    ordersPerMonth: number
  }
  usage: {
    ordersInPeriod: number
    ordersLimit: number
    periodStart: string
    periodEnd: string
  }
}

type PlanCatalogItem = {
  code: string
  name: string
  description: string
  pricing: { currency: string; monthlyAmountDzd: number; annualAmountDzd: number }
  ordersPerMonth: number
}

const authStore = useAuthStore()

type PaymentRecord = {
  id: string
  planCode: string
  interval: string
  amountDzd: number
  currency: string
  method: string
  status: string
  proofUrl: string | null
  createdAt: string
}

const { data, pending, error, refresh } = await useAsyncData(
  'adminBilling',
  async () => {
    const token = (authStore as any).token?.value ?? (authStore as any).token
    if (!token || typeof token !== 'string') {
      return { snapshot: null as BillingSnapshot | null, plans: [] as PlanCatalogItem[], payments: [] as PaymentRecord[] }
    }

    const [snapshot, plansRes, paymentsRes] = await Promise.all([
      $fetch('/api/admin/billing/subscription', { headers: { Authorization: `Bearer ${token}` } }) as Promise<BillingSnapshot>,
      $fetch('/api/admin/billing/plans', { headers: { Authorization: `Bearer ${token}` } }) as Promise<{ plans: PlanCatalogItem[] }>,
      $fetch('/api/admin/billing/payments', { headers: { Authorization: `Bearer ${token}` } }) as Promise<{ payments: PaymentRecord[] }>
    ])

    return { snapshot, plans: plansRes.plans || [], payments: paymentsRes.payments || [] }
  },
  { server: false, watch: [() => authStore.token], default: () => ({ snapshot: null, plans: [], payments: [] }) }
)

const snapshot = computed(() => (data.value as any)?.snapshot as BillingSnapshot | null)
const plans = computed(() => ((data.value as any)?.plans as PlanCatalogItem[]) || [])
const paymentHistory = computed(() => ((data.value as any)?.payments as PaymentRecord[]) || [])
const pendingPayments = computed(() => paymentHistory.value.filter((p) => p.status === 'PENDING'))
const latestApprovedProof = computed(() =>
  paymentHistory.value.find((p) => p.status === 'PAID' && p.method !== 'SIMULATED') ?? null
)

const formatLimit = (limit: number | null | undefined) => {
  if (typeof limit === 'number') return String(limit)
  return '—'
}

const formatDzd = (amount: number | null | undefined) => {
  if (typeof amount !== 'number') return '—'
  const intlLocale = locale.value === 'fr' ? 'fr-DZ' : locale.value === 'ar' ? 'ar-DZ' : 'en-DZ'
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(amount)
}

const formatPayDate = (date: string) =>
  new Date(date).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const periodLabel = computed(() => {
  const start = snapshot.value?.usage?.periodStart
  const end = snapshot.value?.usage?.periodEnd
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString()} → ${e.toLocaleDateString()}`
})

const limitRows = computed(() => {
  return [
    { label: t('admin.pages.billing.limits.ordersPerMonth'), value: formatLimit(snapshot.value?.plan?.ordersPerMonth) }
  ]
})

const planOptions = computed(() =>
  plans.value.map((p) => ({ value: p.code, label: t('admin.pages.billing.planOption', { name: p.name, orders: p.ordersPerMonth }) }))
)

const billingInterval = ref<'month' | 'year'>('month')
const selectedPlanCode = ref<string>('')

const selectPlan = (code: string) => {
  selectedPlanCode.value = code
  if (window.innerWidth < 1024) {
    nextTick(() => {
      const el = document.getElementById('checkout-section')
      if (el) {
        const yInfo = el.getBoundingClientRect().top + window.scrollY - 24
        window.scrollTo({ top: yInfo, behavior: 'smooth' })
      }
    })
  }
}

watch(
  snapshot,
  (s) => {
    if (!selectedPlanCode.value && s?.subscription?.planCode) {
      selectedPlanCode.value = s.subscription.planCode
    }
  },
  { immediate: true }
)

// Payment Flow State
const selectedMethod = ref('')
const proofUrl = ref('')
const uploading = ref(false)
const uploadError = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const availableMethods = computed(() => [
  { id: 'MYFIN', label: t('admin.pages.billing.payment.methods.myfin', 'MyFin') },
  { id: 'PAYSERA', label: t('admin.pages.billing.payment.methods.paysera', 'Paysera') },
  { id: 'BARIDIMOB', label: t('admin.pages.billing.payment.methods.baridimob', 'BaridiMob') },
  { id: 'CCP', label: t('admin.pages.billing.payment.methods.ccp', 'CCP / Poste') },
  { id: 'CHARGILY', label: t('admin.pages.billing.payment.methods.chargily', 'Chargily (CIB/Edahabia)') },
])

const requiresProof = (method: string) => {
  return ['MYFIN', 'PAYSERA', 'BARIDIMOB', 'CCP'].includes(method)
}

const methodInstructions = computed(() => {
  const amountObj = plans.value.find(p => p.code === selectedPlanCode.value)?.pricing
  const amount = billingInterval.value === 'year' ? (amountObj?.annualAmountDzd || 0) * 12 : amountObj?.monthlyAmountDzd
  const finalAmount = amount || 0
  
  const exchangeRate = 280
  const eurAmount = (finalAmount / exchangeRate).toFixed(2).replace(/\.00$/, '')
  
  switch(selectedMethod.value) {
    case 'MYFIN':
      if (locale.value === 'fr') {
        return `Veuillez envoyer ${eurAmount} EUR (Taux : 1€ = ${exchangeRate} DA) sur notre compte MyFin :\nIBAN : BG98MYFI123123123\nNom : MySaaS LLC`
      } else if (locale.value === 'ar') {
        return `يرجى إرسال ${eurAmount} يورو (السعر: 1€ = ${exchangeRate} دج) إلى حساب MyFin الخاص بنا:\nIBAN: BG98MYFI123123123\nالاسم: MySaaS LLC`
      }
      return `Please send ${eurAmount} EUR (Rate: 1€ = ${exchangeRate} DA) to our MyFin account:\nIBAN: BG98MYFI123123123\nName: MySaaS LLC`
    case 'PAYSERA':
      if (locale.value === 'fr') {
         return `Veuillez envoyer ${eurAmount} EUR (Taux : 1€ = ${exchangeRate} DA) sur notre compte Paysera :\nEmail : payments@mysaas.com\nNom : MySaaS LLC`
      } else if (locale.value === 'ar') {
         return `يرجى إرسال ${eurAmount} يورو (السعر: 1€ = ${exchangeRate} دج) إلى حساب Paysera الخاص بنا:\nالبريد الإلكتروني: payments@mysaas.com\nالاسم: MySaaS LLC`
      }
      return `Please send ${eurAmount} EUR (Rate: 1€ = ${exchangeRate} DA) to our Paysera account:\nEmail: payments@mysaas.com\nName: MySaaS LLC`
    case 'BARIDIMOB':
      return t('admin.pages.billing.payment.instructions.baridimob', { amount: formatDzd(finalAmount) }) || `Please send ${formatDzd(finalAmount)} DZD via BaridiMob to:\nRIP: 00799999000000000012\nPhone: +213 555 55 55 55`
    case 'CCP':
      return t('admin.pages.billing.payment.instructions.ccp', { amount: formatDzd(finalAmount) }) || `Please deposit ${formatDzd(finalAmount)} DZD to our CCP account:\nAccount: 12345678 99\nName: MySaaS LLC`
    default:
      return ''
  }
})

// Reset state when changing method
watch(selectedMethod, () => {
  proofUrl.value = ''
  uploadError.value = ''
  submitError.value = ''
  submitSuccess.value = false
})

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  
  const token = (authStore as any).token?.value ?? (authStore as any).token
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await $fetch('/api/admin/billing/proofs/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }) as { url: string }
    
    proofUrl.value = res.url
  } catch (e: any) {
    uploadError.value = e?.message || e?.data?.error || t('admin.pages.billing.payment.errors.uploadFailed')
  } finally {
    uploading.value = false
  }
}

async function openPaymentProof(payment: any) {
  const token = (authStore as any).token?.value ?? (authStore as any).token
  if (!token || typeof token !== 'string') return
  if (!payment?.id || !payment?.proofUrl) return

  try {
    if (typeof payment.proofUrl === 'string' && payment.proofUrl.startsWith('http')) {
      window.open(payment.proofUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const res = await $fetch(`/api/admin/billing/payments/${payment.id}/proof-url`, {
      headers: { Authorization: `Bearer ${token}` }
    }) as { url: string }

    if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e: any) {
    submitError.value = e?.message || e?.data?.statusMessage || 'Failed to open proof'
  }
}

async function submitPayment() {
  const token = (authStore as any).token?.value ?? (authStore as any).token
  if (!token || typeof token !== 'string') return
  
  submitting.value = true
  submitError.value = ''
  submitSuccess.value = false
  
  const selectedPlan = plans.value.find(p => p.code === selectedPlanCode.value)
  const amountDzd = billingInterval.value === 'year' ? (selectedPlan?.pricing?.annualAmountDzd || 0) * 12 : selectedPlan?.pricing?.monthlyAmountDzd
  
  try {
    await $fetch('/api/admin/billing/payments/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { 
        planCode: selectedPlanCode.value, 
        interval: billingInterval.value,
        method: selectedMethod.value,
        amountDzd: amountDzd || 0,
        proofUrl: proofUrl.value
      }
    })
    
    submitSuccess.value = true
    // Reset selections after short delay to show success
    setTimeout(() => {
      selectedPlanCode.value = snapshot.value?.subscription?.planCode || ''
    }, 5000)
    
    await refresh()
  } catch (e: any) {
    submitError.value = e?.message || e?.data?.statusMessage || t('admin.pages.billing.payment.errors.submitFailed')
  } finally {
    submitting.value = false
  }
}
</script>
