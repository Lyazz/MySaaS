<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-20 md:pb-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight" style="color: var(--text-primary)">
          {{ t('admin.pages.cash.title') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.cash.subtitle') }}
        </p>
      </div>

      <!-- Actions Menu -->
      <Menu as="div" class="relative hidden md:block">
        <MenuButton class="inline-flex items-center gap-2 rounded-lg [background:var(--brand)] px-4 py-2.5 text-sm font-medium text-black shadow-sm hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)] focus:ring-offset-2">
          <Icon name="lucide:plus" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.newAction') }}
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </MenuButton>
        <transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <MenuItems class="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-lg focus:outline-none" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 8px 24px rgba(0,0,0,0.4)">
            <div class="py-1">
              <MenuItem v-slot="{ active }">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  @click="openCustomerPaymentModal"
                >
                  <Icon name="lucide:user-round" class="h-4 w-4" style="color: var(--text-muted)" />
                  {{ t('admin.pages.cash.actions.newCustomerPayment') }}
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  @click="openSupplierPaymentModal"
                >
                  <Icon name="lucide:truck" class="h-4 w-4" style="color: var(--text-muted)" />
                  {{ t('admin.pages.cash.actions.newSupplierPayment') }}
                </button>
              </MenuItem>
              <div class="my-1 border-t" style="border-color: var(--surface-border)" />
              <MenuItem v-slot="{ active }">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  @click="openExpenseModal('EXPENSE')"
                >
                  <Icon name="lucide:minus-circle" class="h-4 w-4" style="color: var(--text-muted)" />
                  {{ t('admin.pages.cash.actions.newExpense') }}
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                  @click="openExpenseModal('CHARGE')"
                >
                  <Icon name="lucide:receipt" class="h-4 w-4" style="color: var(--text-muted)" />
                  {{ t('admin.pages.cash.actions.newCharge') }}
                </button>
              </MenuItem>
              <div class="my-1 border-t" style="border-color: var(--surface-border)" />
              <MenuItem v-slot="{ active }">
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium [color:rgba(var(--brand-rgb)/0.85)] transition-colors"
                  :style="active ? 'background: var(--surface-3)' : ''"
                  @click="transferOpen = true"
                >
                  <Icon name="lucide:arrow-left-right" class="h-4 w-4 [color:var(--brand)]" />
                  {{ t('admin.pages.cash.actions.transfer') }}
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <!-- Mobile FAB -->
    <Menu as="div" class="fixed bottom-6 right-6 z-40 md:hidden">
      <MenuButton class="flex h-14 w-14 items-center justify-center rounded-full [background:var(--brand)] text-black shadow-lg hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)] focus:ring-offset-2">
        <Icon name="lucide:plus" class="h-6 w-6" />
      </MenuButton>
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems class="absolute bottom-full right-0 mb-2 w-64 origin-bottom-right rounded-lg focus:outline-none" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 8px 24px rgba(0,0,0,0.4)">
          <div class="py-1">
            <MenuItem v-slot="{ active }">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors"
                :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                @click="openCustomerPaymentModal"
              >
                <Icon name="lucide:user-round" class="h-5 w-5" style="color: var(--text-muted)" />
                {{ t('admin.pages.cash.actions.newCustomerPayment') }}
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors"
                :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                @click="openSupplierPaymentModal"
              >
                <Icon name="lucide:truck" class="h-5 w-5" style="color: var(--text-muted)" />
                {{ t('admin.pages.cash.actions.newSupplierPayment') }}
              </button>
            </MenuItem>
            <div class="my-1 border-t" style="border-color: var(--surface-border)" />
            <MenuItem v-slot="{ active }">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors"
                :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                @click="openExpenseModal('EXPENSE')"
              >
                <Icon name="lucide:minus-circle" class="h-5 w-5" style="color: var(--text-muted)" />
                {{ t('admin.pages.cash.actions.newExpense') }}
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors"
                :style="active ? 'background: var(--surface-3); color: var(--text-primary)' : 'color: var(--text-secondary)'"
                @click="openExpenseModal('CHARGE')"
              >
                <Icon name="lucide:receipt" class="h-5 w-5" style="color: var(--text-muted)" />
                {{ t('admin.pages.cash.actions.newCharge') }}
              </button>
            </MenuItem>
            <div class="my-1 border-t" style="border-color: var(--surface-border)" />
            <MenuItem v-slot="{ active }">
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium [color:rgba(var(--brand-rgb)/0.85)] transition-colors"
                :style="active ? 'background: var(--surface-3)' : ''"
                @click="transferOpen = true"
              >
                <Icon name="lucide:arrow-left-right" class="h-5 w-5 [color:var(--brand)]" />
                {{ t('admin.pages.cash.actions.transfer') }}
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>

    <!-- Summary Statistics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl p-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Icon name="lucide:arrow-down-left" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.cash.stats.totalIn') || 'Total In (Today)' }}</p>
            <p class="mt-0.5 text-lg font-bold text-emerald-400">{{ formatCurrency(todayStats.totalIn) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl p-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <Icon name="lucide:arrow-up-right" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.cash.stats.totalOut') || 'Total Out (Today)' }}</p>
            <p class="mt-0.5 text-lg font-bold text-rose-400">{{ formatCurrency(todayStats.totalOut) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl p-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Icon name="lucide:wallet" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.cash.stats.activeSessions') || 'Active Sessions' }}</p>
            <p class="mt-0.5 text-lg font-bold" style="color: var(--text-primary)">{{ activeSessions }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl p-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Icon name="lucide:trending-up" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium" style="color: var(--text-secondary)">{{ t('admin.pages.cash.stats.netBalance') || 'Net (Today)' }}</p>
            <p class="mt-0.5 text-lg font-bold" :class="todayStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ formatCurrency(todayStats.net) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div class="flex items-start gap-3">
        <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4" />
        <div class="min-w-0">
          <p class="font-medium">{{ t('admin.pages.cash.errors.title') }}</p>
          <p class="mt-1 text-red-700/80 break-words">{{ errorMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Cashboxes - Horizontal Scrollable -->
    <section class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h3 class="font-semibold" style="color: var(--text-primary)">
          {{ t('admin.pages.cash.cashboxes.title') }}
        </h3>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ui-btn ui-btn--secondary text-xs"
            :disabled="loadingCashboxes"
            @click="openCashboxCreate"
          >
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
            {{ t('admin.pages.cash.cashboxes.create') }}
          </button>
          <button
            type="button"
            class="text-sm font-medium [color:var(--brand)] hover:[color:var(--brand)] disabled:opacity-50"
            :disabled="loadingCashboxes"
            @click="refreshAll"
          >
            {{ t('admin.common.refresh') }}
          </button>
        </div>
      </div>

      <div v-if="loadingCashboxes" class="flex gap-3 overflow-x-auto pb-2">
        <div v-for="i in 3" :key="i" class="min-w-[280px] h-32 rounded-xl animate-pulse" style="background: var(--surface-3)" />
      </div>

      <div v-else-if="cashboxes.length === 0" class="rounded-xl border border-dashed p-6 text-center" style="border-color: var(--surface-border)">
        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style="background: var(--surface-3)">
          <Icon name="lucide:inbox" class="h-5 w-5" style="color: var(--text-muted)" />
        </div>
        <p class="mt-2 text-sm font-medium" style="color: var(--text-primary)">
          {{ t('admin.pages.cash.cashboxes.empty') }}
        </p>
        <p class="mt-1 text-xs" style="color: var(--text-tertiary)">
          {{ t('admin.pages.cash.cashboxes.emptyHint') }}
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-lg [background:var(--brand)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]"
          @click="openCashboxCreate"
        >
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          {{ t('admin.pages.cash.cashboxes.create') }}
        </button>
      </div>

      <div v-else class="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          v-for="c in cashboxes"
          :key="c.id"
          class="group relative min-w-[280px] overflow-hidden rounded-xl p-4 transition-all" style="background: var(--surface-2); border: 1px solid var(--surface-border)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name="lucide:wallet" class="h-4 w-4" />
                </div>
                <p class="font-semibold truncate" style="color: var(--text-primary)">
                  {{ c.name }}
                </p>
              </div>

              <div class="mt-2 flex items-center gap-2">
                <span
                  class="inline-flex h-2 w-2 rounded-full"
                  :class="c.openSession ? 'bg-emerald-500' : 'bg-white/20'"
                />
                <span class="text-xs font-medium" :class="c.openSession ? 'text-emerald-400' : ''" :style="c.openSession ? '' : 'color: var(--text-tertiary)'">
                  <span v-if="c.openSession">
                    {{ t('admin.pages.cash.cashboxes.openSession', { id: c.openSession.id.substring(0, 8) }) }}
                  </span>
                  <span v-else>
                    {{ t('admin.pages.cash.cashboxes.closed') }}
                  </span>
                </span>
              </div>
            </div>

            <NuxtLink
              :to="`/admin/cash/${c.id}`"
              class="shrink-0 p-2 opacity-0 transition-all hover:[color:rgba(var(--brand-rgb)/0.85)] group-hover:opacity-100"
              style="color: var(--text-muted)"
              :title="t('common.view')"
            >
              <Icon name="lucide:arrow-right" class="h-4 w-4" />
            </NuxtLink>
          </div>

          <div class="mt-3 flex gap-2">
            <button
              v-if="!c.openSession"
              type="button"
              class="flex-1 inline-flex justify-center items-center gap-2 rounded-lg [background:var(--brand)] px-3 py-1.5 text-xs font-medium text-white hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]"
              @click="openOpenSession(c.id)"
            >
              <Icon name="lucide:play" class="h-3 w-3" />
              {{ t('admin.pages.cash.cashboxes.open') }}
            </button>

            <button
              v-else
              type="button"
              class="flex-1 inline-flex justify-center items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style="border: 1px solid var(--surface-border); color: var(--text-secondary)"
              @click="openCloseSession(c.openSession.id)"
            >
              <Icon name="lucide:lock" class="h-3 w-3" />
              {{ t('admin.pages.cash.cashboxes.close') }}
            </button>
            <NuxtLink
              :to="`/admin/cash/${c.id}`"
              class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style="border: 1px solid var(--surface-border); background: var(--surface-3); color: var(--text-secondary)"
            >
              {{ t('common.details') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content - Full Width -->
    <!-- Transactions & Sessions Tabs - Full Width -->
    <section>
      <TabGroup @change="onTabChange">
          <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
            <div class="border-b" style="border-color: var(--surface-border)">
              <TabList class="flex gap-4 px-5 pt-5">
                <Tab v-slot="{ selected }" as="template">
                  <button
                    class="px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none"
                    :class="selected ? 'border-b-2 [border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                    :style="selected ? '' : 'color: var(--text-secondary)'"
                  >
                    {{ t('admin.pages.cash.transactions.title') }}
                  </button>
                </Tab>
                <Tab v-slot="{ selected }" as="template">
                  <button
                    class="px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none"
                    :class="selected ? 'border-b-2 [border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                    :style="selected ? '' : 'color: var(--text-secondary)'"
                  >
                    {{ t('admin.pages.cash.sessions.title') }}
                  </button>
                </Tab>
              </TabList>
            </div>

            <TabPanels>
              <!-- Transactions Tab -->
              <TabPanel>
                <!-- Collapsible Filters -->
                <Disclosure v-slot="{ open }" defaultOpen>
                  <div class="border-b px-5 py-4" style="border-color: var(--surface-border)">
                    <DisclosureButton class="flex w-full items-center justify-between text-left">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.cash.transactions.filters.title') }}</h3>
                        <span v-if="activeTransactionFiltersCount > 0" class="inline-flex items-center justify-center rounded-full [background:rgba(var(--brand-rgb)/0.12)] px-2 py-0.5 text-xs font-medium [color:var(--brand)]">
                          {{ activeTransactionFiltersCount }}
                        </span>
                      </div>
                      <Icon :name="open ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-5 w-5" style="color: var(--text-muted)" />
                    </DisclosureButton>
                    <transition
                      enter-active-class="transition duration-200 ease-out"
                      enter-from-class="opacity-0 -translate-y-1"
                      enter-to-class="opacity-100 translate-y-0"
                      leave-active-class="transition duration-150 ease-in"
                      leave-from-class="opacity-100 translate-y-0"
                      leave-to-class="opacity-0 -translate-y-1"
                    >
                      <DisclosurePanel class="pt-4 space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <BaseSelect v-model="filters.cashboxId">
                            <option value="">{{ t('admin.pages.cash.transactions.filters.allCashboxes') }}</option>
                            <option v-for="c in cashboxes" :key="c.id" :value="c.id">{{ c.name }}</option>
                          </BaseSelect>
                          <BaseSelect v-model="filters.type" class="">
                            <option value="">{{ t('admin.pages.cash.transactions.filters.allTypes') }}</option>
                            <option value="SALE_PAYMENT">{{ t('admin.pages.cash.transactions.types.SALE_PAYMENT') }}</option>
                            <option value="CUSTOMER_PAYMENT">{{ t('admin.pages.cash.transactions.types.CUSTOMER_PAYMENT') }}</option>
                            <option value="SUPPLIER_PAYMENT">{{ t('admin.pages.cash.transactions.types.SUPPLIER_PAYMENT') }}</option>
                            <option value="EXPENSE">{{ t('admin.pages.cash.transactions.types.EXPENSE') }}</option>
                            <option value="CHARGE">{{ t('admin.pages.cash.transactions.types.CHARGE') }}</option>
                            <option value="TRANSFER">{{ t('admin.pages.cash.transactions.types.TRANSFER') }}</option>
                          </BaseSelect>
                          <BaseSelect v-model="filters.direction" class="">
                            <option value="">{{ t('admin.pages.cash.transactions.filters.allDirections') }}</option>
                            <option value="IN">{{ t('admin.pages.cash.directions.in') }}</option>
                            <option value="OUT">{{ t('admin.pages.cash.directions.out') }}</option>
                          </BaseSelect>
                          <BaseSelect v-model="filters.method" class="">
                            <option value="">{{ t('admin.pages.cash.transactions.filters.allMethods') }}</option>
                            <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                            <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                            <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                            <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
                          </BaseSelect>
                          <BaseSelect v-model="filters.userId" class="">
                            <option value="">{{ t('admin.pages.cash.transactions.filters.allUsers') }}</option>
                            <option v-for="u in cashUsers" :key="u.id" :value="u.id">{{ u.email }}</option>
                          </BaseSelect>
                        </div>
                        <DateFilter v-model:start-date="filters.startDate" v-model:end-date="filters.endDate" />
                        <button
                          type="button"
                          class="ui-btn ui-btn--secondary text-xs"
                          @click="resetTxFilters"
                        >
                          <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
                          {{ t('admin.common.reset') }}
                        </button>
                      </DisclosurePanel>
                    </transition>
                  </div>
                </Disclosure>

        <div v-if="loadingTxs" class="p-10 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 [border-color:var(--brand)]" />
          <p class="mt-2 text-sm" style="color: var(--text-tertiary)">
            {{ t('admin.pages.cash.transactions.loading') }}
          </p>
        </div>

        <div v-else-if="txs.length === 0" class="p-10 text-center">
           <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style="background: var(--surface-3)">
             <Icon name="lucide:inbox" class="h-5 w-5" style="color: var(--text-muted)" />
           </div>
          <p class="mt-3 text-sm font-medium" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.transactions.empty') }}
          </p>
          <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
            {{ t('admin.pages.cash.transactions.emptyHint') }}
          </p>
        </div>

        <div v-else>
          <div class="sm:hidden divide-y" style="border-color: var(--surface-border)">
            <div v-for="tx in txs" :key="tx.id" class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: var(--text-primary)">{{ typeLabel(tx.type) }}</p>
                  <p class="mt-0.5 text-xs" style="color: var(--text-muted)">
                    {{ formatDate(tx.createdAt) }}
                  </p>
                  <p class="mt-2 text-xs truncate" style="color: var(--text-secondary)">
                    {{ cashboxName(tx.cashboxId) }} · {{ userEmail(tx.createdByUserId) }}
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium" style="background: var(--surface-3); color: var(--text-secondary)">
                      <Icon v-if="tx.method === 'CASH'" name="lucide:banknote" class="h-3 w-3" />
                      <Icon v-else-if="tx.method === 'CARD'" name="lucide:credit-card" class="h-3 w-3" />
                      <Icon v-else name="lucide:arrow-left-right" class="h-3 w-3" />
                      {{ methodLabel(tx.method) }}
                    </span>
                    <span v-if="tx.expenseCategory" class="rounded-md px-2 py-1 text-[11px]" style="background: var(--surface-3); color: var(--text-tertiary)">
                      {{ tx.expenseCategory }}
                    </span>
                    <span v-if="tx.reference" class="rounded-md px-2 py-1 text-[11px] truncate max-w-[220px]" style="background: var(--surface-3); color: var(--text-tertiary)">
                      Ref: {{ tx.reference }}
                    </span>
                  </div>
                </div>
                <p class="shrink-0 whitespace-nowrap text-right text-sm font-bold" :class="tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'">
                  {{ tx.direction === 'IN' ? '+' : '-' }}{{ formatCurrency(Number(tx.amount)) }}
                </p>
              </div>
            </div>
          </div>

          <div class="hidden sm:block overflow-x-auto">
            <table class="ui-table">
              <thead class="ui-thead">
                <tr>
                  <th class="ui-th">
                    {{ t('admin.pages.cash.transactions.table.date') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.cash.transactions.table.cashbox') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.cash.transactions.table.user') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.cash.transactions.table.type') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.cash.transactions.table.method') }}
                  </th>
                  <th class="ui-th text-right">
                    {{ t('admin.pages.cash.transactions.table.amount') }}
                  </th>
                </tr>
              </thead>
              <tbody class="ui-tbody">
                <tr v-for="tx in paginatedTxs" :key="tx.id" class="ui-tr">
                  <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                    {{ formatDate(tx.createdAt) }}
                  </td>
                  <td class="ui-td text-sm font-medium" style="color: var(--text-primary)">
                    {{ cashboxName(tx.cashboxId) }}
                  </td>
                  <td class="ui-td text-sm max-w-[220px] truncate" style="color: var(--text-secondary)">
                    {{ userEmail(tx.createdByUserId) }}
                  </td>
                  <td class="ui-td text-sm" style="color: var(--text-secondary)">
                    <div class="flex flex-col">
                      <span class="font-medium" style="color: var(--text-primary)">{{ typeLabel(tx.type) }}</span>
                      <span v-if="tx.expenseCategory" class="text-xs mt-0.5" style="color: var(--text-muted)">
                        {{ tx.expenseCategory }}
                      </span>
                      <span v-if="tx.reference" class="text-xs mt-0.5" style="color: var(--text-muted)">
                        Ref: {{ tx.reference }}
                      </span>
                    </div>
                  </td>
                  <td class="ui-td text-sm" style="color: var(--text-secondary)">
                    <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium" style="background: var(--surface-3); color: var(--text-secondary)">
                      <Icon v-if="tx.method === 'CASH'" name="lucide:banknote" class="h-3 w-3" />
                      <Icon v-else-if="tx.method === 'CARD'" name="lucide:credit-card" class="h-3 w-3" />
                      <Icon v-else name="lucide:arrow-left-right" class="h-3 w-3" />
                      {{ methodLabel(tx.method) }}
                    </span>
                  </td>
                  <td class="ui-td whitespace-nowrap text-right text-sm font-bold" :class="tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'">
                    {{ tx.direction === 'IN' ? '+' : '-' }}{{ formatCurrency(Number(tx.amount)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Transactions Pagination -->
          <div class="px-4 py-3 flex items-center justify-between border-t sm:px-6" style="border-color: var(--surface-border)">
            <div class="flex flex-1 items-center justify-between sm:hidden">
              <button
                :disabled="txPage === 1"
                class="ui-btn ui-btn--secondary ui-btn--sm"
                @click="txPage--; fetchTransactions()"
              >
                <Icon name="lucide:chevron-left" class="w-4 h-4" />
              </button>
              <span class="text-sm" style="color: var(--text-secondary)">
                {{ t('admin.common.page', { page: txPage, total: txTotalPages }) }}
              </span>
              <button
                :disabled="txPage === txTotalPages"
                class="ui-btn ui-btn--secondary ui-btn--sm"
                @click="txPage++; fetchTransactions()"
              >
                <Icon name="lucide:chevron-right" class="w-4 h-4" />
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm" style="color: var(--text-secondary)">
                  {{ t('admin.common.showing', {
                    from: txTotal === 0 ? 0 : (txPage - 1) * txPerPage + 1,
                    to: Math.min(txPage * txPerPage, txTotal),
                    total: txTotal
                  }) }}
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md -space-x-px">
                  <button
                    :disabled="txPage === 1"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md text-sm font-medium disabled:opacity-50"
                    style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
                    @click="txPage--; fetchTransactions()"
                  >
                    {{ t('admin.common.previous') }}
                  </button>
                  <button
                    v-for="page in txTotalPages"
                    :key="page"
                    class="relative inline-flex items-center px-4 py-2 text-sm font-medium"
                    :class="txPage === page ? 'z-10 [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                    :style="txPage === page ? 'background: rgba(var(--brand-rgb)/0.1); border: 1px solid var(--brand)' : 'background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary)'"
                    @click="txPage = page; fetchTransactions()"
                  >
                    {{ page }}
                  </button>
                  <button
                    :disabled="txPage === txTotalPages"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md text-sm font-medium disabled:opacity-50"
                    style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
                    @click="txPage++; fetchTransactions()"
                  >
                    {{ t('admin.common.next') }}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
        <!-- Sessions Tab -->
        <TabPanel>
          <!-- Collapsible Filters -->
          <Disclosure v-slot="{ open }" defaultOpen>
            <div class="border-b px-5 py-4" style="border-color: var(--surface-border)">
              <DisclosureButton class="flex w-full items-center justify-between text-left">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.cash.sessions.filters.title') }}</h3>
                  <span v-if="activeSessionFiltersCount > 0" class="inline-flex items-center justify-center rounded-full [background:rgba(var(--brand-rgb)/0.12)] px-2 py-0.5 text-xs font-medium [color:var(--brand)]">
                    {{ activeSessionFiltersCount }}
                  </span>
                </div>
                <Icon :name="open ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-5 w-5" style="color: var(--text-muted)" />
              </DisclosureButton>
              <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <DisclosurePanel class="pt-4 space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <BaseSelect v-model="sessionFilters.cashboxId" class="">
                      <option value="">{{ t('admin.pages.cash.sessions.filters.allCashboxes') }}</option>
                      <option v-for="c in cashboxes" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </BaseSelect>
                    <BaseSelect v-model="sessionFilters.status" class="">
                      <option value="">{{ t('admin.pages.cash.sessions.filters.allStatuses') }}</option>
                      <option value="OPEN">{{ t('admin.pages.cash.status.OPEN') }}</option>
                      <option value="CLOSED">{{ t('admin.pages.cash.status.CLOSED') }}</option>
                    </BaseSelect>
                    <BaseSelect v-model="sessionFilters.userId" class="">
                      <option value="">{{ t('admin.pages.cash.sessions.filters.allUsers') }}</option>
                      <option v-for="u in cashUsers" :key="u.id" :value="u.id">{{ u.email }}</option>
                    </BaseSelect>
                  </div>
                  <DateFilter v-model:start-date="sessionFilters.startDate" v-model:end-date="sessionFilters.endDate" />
                  <button
                    type="button"
                    class="ui-btn ui-btn--secondary text-xs"
                    @click="resetSessionFilters"
                  >
                    <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
                    {{ t('admin.common.reset') }}
                  </button>
                </DisclosurePanel>
              </transition>
            </div>
          </Disclosure>

          <div v-if="loadingSessions" class="p-10 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 [border-color:var(--brand)]" />
            <p class="mt-2 text-sm" style="color: var(--text-tertiary)">
              {{ t('admin.pages.cash.sessions.loading') }}
            </p>
          </div>

          <div v-else-if="sessions.length === 0" class="p-10 text-center">
             <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style="background: var(--surface-3)">
                 <Icon name="lucide:inbox" class="h-5 w-5" style="color: var(--text-muted)" />
             </div>
            <p class="mt-3 text-sm font-medium" style="color: var(--text-primary)">
              {{ t('admin.pages.cash.sessions.empty') }}
            </p>
            <p class="mt-1 text-sm" style="color: var(--text-tertiary)">
              {{ t('admin.pages.cash.sessions.emptyHint') }}
            </p>
          </div>

          <div v-else>
            <div class="sm:hidden divide-y" style="border-color: var(--surface-border)">
              <div v-for="s in sessions" :key="s.id" class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold truncate" style="color: var(--text-primary)">
                      {{ cashboxName(s.cashboxId) }}
                    </p>
                    <div class="mt-2 flex items-center gap-2">
                      <span
                        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                        :class="s.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400' : ''"
                        :style="s.status !== 'OPEN' ? 'background: var(--surface-3); color: var(--text-secondary)' : ''"
                      >
                        <span class="mr-1.5 h-1.5 w-1.5 rounded-full" :class="s.status === 'OPEN' ? 'bg-emerald-500' : 'bg-white/30'" />
                        {{ t(`admin.pages.cash.status.${s.status}`) }}
                      </span>
                    </div>
                    <div class="mt-3 space-y-1.5 text-xs" style="color: var(--text-secondary)">
                      <p>{{ t('admin.pages.cash.sessions.table.user') }}: {{ userEmail(s.openedByUserId) }}</p>
                      <p>{{ t('admin.pages.cash.sessions.table.opened') }}: {{ formatDate(s.openedAt) }}</p>
                      <p v-if="s.closedAt">{{ t('admin.pages.cash.sessions.table.closed') }}: {{ formatDate(s.closedAt) }}</p>
                      <p v-if="s.openingFloat">{{ t('admin.pages.cash.sessions.table.opening') }}: {{ formatCurrency(Number(s.openingFloat)) }}</p>
                      <p v-if="s.closingCount">{{ t('admin.pages.cash.sessions.table.closing') }}: {{ formatCurrency(Number(s.closingCount)) }}</p>
                      <p v-if="s.difference" :class="Number(s.difference) !== 0 ? 'text-rose-400 font-medium' : ''" :style="Number(s.difference) === 0 ? 'color: var(--text-primary)' : ''">
                        {{ t('admin.pages.cash.sessions.table.difference') }}: {{ formatCurrency(Number(s.difference)) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden sm:block overflow-x-auto">
              <table class="ui-table">
                <thead class="ui-thead">
                  <tr>
                    <th class="ui-th">
                      {{ t('admin.pages.cash.sessions.table.cashbox') }}
                    </th>
                    <th class="ui-th">
                      {{ t('admin.pages.cash.sessions.table.status') }}
                    </th>
                    <th class="ui-th">
                      {{ t('admin.pages.cash.sessions.table.user') }}
                    </th>
                    <th class="ui-th">
                      {{ t('admin.pages.cash.sessions.table.openedAt') }}
                    </th>
                    <th class="ui-th">
                      {{ t('admin.pages.cash.sessions.table.closedAt') }}
                    </th>
                    <th class="ui-th text-right">
                      {{ t('admin.pages.cash.sessions.table.openingFloat') }}
                    </th>
                    <th class="ui-th text-right">
                      {{ t('admin.pages.cash.sessions.table.expectedClosing') }}
                    </th>
                    <th class="ui-th text-right">
                      {{ t('admin.pages.cash.sessions.table.closingCount') }}
                    </th>
                    <th class="ui-th text-right">
                      {{ t('admin.pages.cash.sessions.table.difference') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="ui-tbody">
                  <tr v-for="s in paginatedSessions" :key="s.id" class="ui-tr">
                    <td class="ui-td text-sm font-medium" style="color: var(--text-primary)">
                      {{ cashboxName(s.cashboxId) }}
                    </td>
                    <td class="ui-td text-sm">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        :class="s.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400' : ''"
                        :style="s.status !== 'OPEN' ? 'background: var(--surface-3); color: var(--text-secondary)' : ''"
                      >
                        <span class="mr-1.5 h-1.5 w-1.5 rounded-full" :class="s.status === 'OPEN' ? 'bg-emerald-500' : 'bg-white/30'" />
                        {{ t(`admin.pages.cash.status.${s.status}`) }}
                      </span>
                    </td>
                    <td class="ui-td text-sm max-w-[220px] truncate" style="color: var(--text-secondary)">
                      {{ userEmail(s.openedByUserId) }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                      {{ formatDate(s.openedAt) }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                      {{ s.closedAt ? formatDate(s.closedAt) : '—' }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-right text-sm font-medium" style="color: var(--text-primary)">
                      {{ formatCurrency(Number(s.openingFloat)) }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-right text-sm font-medium" style="color: var(--text-primary)">
                      {{ s.expectedClosing ? formatCurrency(Number(s.expectedClosing)) : '—' }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-right text-sm font-medium" style="color: var(--text-primary)">
                      {{ s.closingCount ? formatCurrency(Number(s.closingCount)) : '—' }}
                    </td>
                    <td class="ui-td whitespace-nowrap text-right text-sm font-bold" :class="s.difference && Number(s.difference) !== 0 ? 'text-rose-400' : ''" :style="!(s.difference && Number(s.difference) !== 0) ? 'color: var(--text-primary)' : ''">
                      {{ s.difference ? formatCurrency(Number(s.difference)) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Sessions Pagination -->
            <div class="px-4 py-3 flex items-center justify-between border-t sm:px-6" style="border-color: var(--surface-border)">
              <div class="flex flex-1 items-center justify-between sm:hidden">
                <button
                  :disabled="sessionsPage === 1"
                  class="ui-btn ui-btn--secondary ui-btn--sm"
                  @click="sessionsPage--; fetchSessions()"
                >
                  <Icon name="lucide:chevron-left" class="w-4 h-4" />
                </button>
                <span class="text-sm" style="color: var(--text-secondary)">
                  {{ t('admin.common.page', { page: sessionsPage, total: sessionsTotalPages }) }}
                </span>
                <button
                  :disabled="sessionsPage === sessionsTotalPages"
                  class="ui-btn ui-btn--secondary ui-btn--sm"
                  @click="sessionsPage++; fetchSessions()"
                >
                  <Icon name="lucide:chevron-right" class="w-4 h-4" />
                </button>
              </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm" style="color: var(--text-secondary)">
                    {{ t('admin.common.showing', {
                      from: sessionsTotal === 0 ? 0 : (sessionsPage - 1) * sessionsPerPage + 1,
                      to: Math.min(sessionsPage * sessionsPerPage, sessionsTotal),
                      total: sessionsTotal
                    }) }}
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md -space-x-px">
                    <button
                      :disabled="sessionsPage === 1"
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md text-sm font-medium disabled:opacity-50"
                      style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
                      @click="sessionsPage--; fetchSessions()"
                    >
                      {{ t('admin.common.previous') }}
                    </button>
                    <button
                      v-for="page in sessionsTotalPages"
                      :key="page"
                      class="relative inline-flex items-center px-4 py-2 text-sm font-medium"
                      :class="sessionsPage === page ? 'z-10 [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                      :style="sessionsPage === page ? 'background: rgba(var(--brand-rgb)/0.1); border: 1px solid var(--brand)' : 'background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary)'"
                      @click="sessionsPage = page; fetchSessions()"
                    >
                      {{ page }}
                    </button>
                    <button
                      :disabled="sessionsPage === sessionsTotalPages"
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md text-sm font-medium disabled:opacity-50"
                      style="border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-secondary)"
                      @click="sessionsPage++; fetchSessions()"
                    >
                      {{ t('admin.common.next') }}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </div>
  </TabGroup>
</section>

    <!-- Open Session Modal -->
    <div v-if="openSessionOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="openSessionOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="openSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.openSession.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.openSession.subtitle') }}
          </p>

          <div class="mt-4 space-y-3">
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.openSession.openingFloatLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.openingFloat" money placeholder="0" />
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.openSession.noteLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.note" :placeholder="t('admin.pages.cash.modals.openSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="openSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading"
              @click="submitOpenSession"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.openSession.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Close Session Modal -->
    <div v-if="closeSessionOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeSessionOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="closeSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.closeSession.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.closeSession.subtitle') }}
          </p>

          <div class="mt-4 space-y-3">
            <div class="rounded-lg p-3" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
              <div v-if="closeExpectedLoading" class="flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
                <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ t('admin.pages.cash.sessions.expected.loading') }}
              </div>
              <div v-else-if="closeExpected" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.cash.openingFloat') }}
                  </p>
                  <p class="mt-0.5 font-semibold" style="color: var(--text-primary)">
                    {{ formatCurrency(Number(closeExpected.openingFloat)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.cash.expectedClosing') }}
                  </p>
                  <p class="mt-0.5 font-semibold" style="color: var(--text-primary)">
                    {{ formatCurrency(Number(closeExpected.expectedClosing)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.cash.directions.in') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-emerald-700">
                    +{{ formatCurrency(Number(closeExpected.inSum)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.cash.directions.out') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-rose-700">
                    -{{ formatCurrency(Number(closeExpected.outSum)) }}
                  </p>
                </div>
                <div class="col-span-2 flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">
                    {{ t('admin.pages.cash.difference') }}
                  </p>
                  <p class="font-semibold" :class="closeDifference !== null && closeDifference !== 0 ? 'text-rose-400' : ''" :style="!(closeDifference !== null && closeDifference !== 0) ? 'color: var(--text-primary)' : ''">
                    {{ closeDifference === null ? '—' : formatCurrency(closeDifference) }}
                  </p>
                </div>
              </div>
              <div v-else class="text-sm" style="color: var(--text-secondary)">
                {{ t('admin.pages.cash.sessions.expected.unavailable') }}
              </div>
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.closeSession.closingCountLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.closingCount" money placeholder="0" />
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.closeSession.noteLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.note" :placeholder="t('admin.pages.cash.modals.closeSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="closeSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md text-white text-sm font-semibold disabled:opacity-50" style="background: var(--surface-3); border: 1px solid var(--surface-border)"
              :disabled="actionLoading"
              @click="submitCloseSession"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.closeSession.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Payment Modal -->
    <div v-if="customerPaymentOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="customerPaymentOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="customerPaymentOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.customerPayment.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.customerPayment.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.cashboxLabel') }}
              </label>
              <BaseSelect v-model="customerPaymentForm.cashboxId">
                <option value="" disabled>{{ t('admin.pages.cash.modals.customerPayment.cashboxPlaceholder') }}</option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
                </option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.customerLabel') }}
              </label>
              <BaseInput v-model="customerSearch" :placeholder="t('admin.pages.cash.modals.customerPayment.customerSearchPlaceholder')" />
              <div class="mt-2">
                <BaseSelect v-model="customerPaymentForm.customerId">
                  <option value="" disabled>{{ t('admin.pages.cash.modals.customerPayment.customerPlaceholder') }}</option>
                  <option v-for="c in customerResults" :key="c.id" :value="c.id">
                    {{ c.name }} — {{ c.phone }}
                  </option>
                </BaseSelect>
              </div>
              <p v-if="customerLoading" class="mt-1 text-xs" style="color: var(--text-muted)">
                {{ t('admin.pages.cash.modals.customerPayment.loadingCustomers') }}
              </p>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.amountLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.amount" money placeholder="0" />
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.methodLabel') }}
              </label>
              <BaseSelect v-model="customerPaymentForm.method">
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.referenceLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.reference" :placeholder="t('admin.pages.cash.modals.customerPayment.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.customerPayment.noteLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.note" :placeholder="t('admin.pages.cash.modals.customerPayment.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="customerPaymentOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading || !canSubmitCustomerPayment"
              @click="submitCustomerPayment"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.customerPayment.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Supplier Payment Modal -->
    <div v-if="supplierPaymentOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="supplierPaymentOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="supplierPaymentOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.supplierPayment.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.supplierPayment.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.cashboxLabel') }}
              </label>
              <BaseSelect v-model="supplierPaymentForm.cashboxId">
                <option value="" disabled>{{ t('admin.pages.cash.modals.supplierPayment.cashboxPlaceholder') }}</option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
                </option>
              </BaseSelect>
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.supplierLabel') }}
              </label>
              <BaseInput v-model="supplierSearch" :placeholder="t('admin.pages.cash.modals.supplierPayment.supplierSearchPlaceholder')" />
              <div class="mt-2">
                <BaseSelect v-model="supplierPaymentForm.supplierId">
                  <option value="" disabled>{{ t('admin.pages.cash.modals.supplierPayment.supplierPlaceholder') }}</option>
                  <option v-for="s in filteredSuppliers" :key="s.id" :value="s.id">
                    {{ s.name }}{{ s.phone ? ` — ${s.phone}` : '' }}
                  </option>
                </BaseSelect>
              </div>
            </div>

            <div class="sm:col-span-2" v-if="supplierPaymentForm.supplierId">
              <label class="ui-label mb-1 block">
                Purchase Order (Optional)
              </label>
              <div class="flex items-center gap-2">
                <BaseSelect v-model="supplierPaymentForm.purchaseOrderId" class="flex-1" :disabled="loadingSupplierPOs">
                  <option value="">No specific order</option>
                  <option v-for="po in supplierPurchaseOrders" :key="po.id" :value="po.id">
                    {{ po.reference || po.id.substring(0, 8) }} — Total: {{ po.totalAmount }}, Paid: {{ po.paidAmount }}, Status: {{ po.status }} / {{ po.paymentStatus }}
                  </option>
                </BaseSelect>
                <div v-if="loadingSupplierPOs" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 [border-color:var(--brand)]" />
              </div>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.amountLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.amount" money placeholder="0" />
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.methodLabel') }}
              </label>
              <BaseSelect v-model="supplierPaymentForm.method">
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.referenceLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.reference" :placeholder="t('admin.pages.cash.modals.supplierPayment.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.supplierPayment.noteLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.note" :placeholder="t('admin.pages.cash.modals.supplierPayment.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="supplierPaymentOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading || !canSubmitSupplierPayment"
              @click="submitSupplierPayment"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.supplierPayment.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Expense/Charge Modal -->
    <div v-if="expenseOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="expenseOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="expenseOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ expenseType === 'EXPENSE' ? t('admin.pages.cash.modals.expense.title') : t('admin.pages.cash.modals.charge.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.expense.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.cashboxLabel') }}
              </label>
              <BaseSelect v-model="expenseForm.cashboxId">
                <option value="" disabled>
                  {{ t('admin.pages.cash.modals.expense.cashboxPlaceholder') }}
                </option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
                </option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.amountLabel') }}
              </label>
              <BaseInput v-model="expenseForm.amount" money placeholder="0" />
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.categoryLabel') }}
              </label>
              <BaseInput v-model="expenseForm.category" :placeholder="t('admin.pages.cash.modals.expense.categoryPlaceholder')" list="expenseCategories" />
              <datalist id="expenseCategories">
                <option v-for="c in expenseCategories" :key="c" :value="c" />
              </datalist>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.methodLabel') }}
              </label>
              <BaseSelect v-model="expenseForm.method">
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.referenceLabel') }}
              </label>
              <BaseInput v-model="expenseForm.reference" :placeholder="t('admin.pages.cash.modals.expense.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.expense.noteLabel') }}
              </label>
              <BaseInput v-model="expenseForm.note" :placeholder="t('admin.pages.cash.modals.expense.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="expenseOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading"
              @click="submitExpense"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.expense.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Transfer Modal -->
    <div v-if="transferOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="transferOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="transferOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.transfer.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.transfer.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.transfer.fromLabel') }}
              </label>
              <BaseSelect v-model="transferForm.fromCashboxId">
                <option value="" disabled>{{ t('admin.pages.cash.modals.transfer.fromPlaceholder') }}</option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
                </option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.transfer.toLabel') }}
              </label>
              <BaseSelect v-model="transferForm.toCashboxId">
                <option value="" disabled>{{ t('admin.pages.cash.modals.transfer.toPlaceholder') }}</option>
                <option v-for="c in cashboxes" :key="c.id" :value="c.id" :disabled="!c.openSession">
                  {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
                </option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.transfer.amountLabel') }}
              </label>
              <BaseInput v-model="transferForm.amount" money placeholder="0" />
            </div>

            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.transfer.referenceLabel') }}
              </label>
              <BaseInput v-model="transferForm.reference" :placeholder="t('admin.pages.cash.modals.transfer.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.transfer.noteLabel') }}
              </label>
              <BaseInput v-model="transferForm.note" :placeholder="t('admin.pages.cash.modals.transfer.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="transferOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading"
              @click="submitTransfer"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.transfer.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Cashbox Modal -->
    <div v-if="cashboxCreateOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="cashboxCreateOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="cashboxCreateOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-xl p-6" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.cash.modals.createCashbox.title') }}
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.cash.modals.createCashbox.subtitle') }}
          </p>

          <div class="mt-4 space-y-3">
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.createCashbox.nameLabel') }}
              </label>
              <BaseInput v-model="cashboxForm.name" :placeholder="t('admin.pages.cash.modals.createCashbox.namePlaceholder')" />
            </div>
            <label class="inline-flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
              <input v-model="cashboxForm.isActive" type="checkbox" class="h-4 w-4 rounded [color:var(--brand)]" style="border-color: var(--surface-border)" />
              {{ t('admin.pages.cash.modals.createCashbox.activeLabel') }}
            </label>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="cashboxCreateOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading || !canCreateCashbox"
              @click="submitCreateCashbox"
            >
              {{ actionLoading ? t('admin.common.creating') : t('admin.pages.cash.modals.createCashbox.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems, Tab, TabGroup, TabList, TabPanel, TabPanels, Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import DateFilter from '~/components/ui/DateFilter.vue'
import { parsePriceInput } from '~/shared/pricing/money-format'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.cash.title'
})

type Cashbox = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  openSession: null | { id: string; openedAt: string; openingFloat: string | number }
}

type CashTx = {
  id: string
  cashboxId: string
  sessionId: string
  direction: 'IN' | 'OUT'
  type: string
  amount: string | number
  currency: string
  method: string
  expenseCategory: string | null
  reference: string | null
  createdByUserId: string | null
  createdAt: string
}

type CashSession = {
  id: string
  cashboxId: string
  status: 'OPEN' | 'CLOSED'
  openingFloat: string | number
  openedAt: string
  closedAt: string | null
  closingCount: string | number | null
  expectedClosing: string | number | null
  difference: string | number | null
  note: string | null
  openedByUserId: string | null
  closedByUserId: string | null
}

type CashSessionExpected = {
  sessionId: string
  openingFloat: string | number
  inSum: string | number
  outSum: string | number
  expectedClosing: string | number
  expectedByMethod?: { CASH: string | number; CARD: string | number; TRANSFER: string | number; OTHER: string | number }
}

type CashUser = { id: string; email: string }

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const errorMessage = ref('')

const cashboxes = ref<Cashbox[]>([])
const loadingCashboxes = ref(true)

const txs = ref<CashTx[]>([])
const loadingTxs = ref(true)
const txPage = ref(1)
const txPerPage = ref(25)
const txTotal = ref(0)
const txTotalPages = ref(1)
const paginatedTxs = computed(() => txs.value)

const sessions = ref<CashSession[]>([])
const loadingSessions = ref(true)
const sessionsPage = ref(1)
const sessionsPerPage = ref(25)
const sessionsTotal = ref(0)
const sessionsTotalPages = ref(1)
const paginatedSessions = computed(() => sessions.value)
const today = new Date()
const lastWeek = new Date(today)
lastWeek.setDate(lastWeek.getDate() - 7)

const sessionFilters = reactive({
  cashboxId: '',
  status: '',
  userId: '',
  startDate: lastWeek.toISOString().split('T')[0],
  endDate: today.toISOString().split('T')[0]
})

const actionLoading = ref(false)

const filters = reactive({
  cashboxId: '',
  type: '',
  direction: '',
  method: '',
  userId: '',
  startDate: lastWeek.toISOString().split('T')[0],
  endDate: today.toISOString().split('T')[0]
})

const cashUsers = ref<CashUser[]>([])

const userById = computed(() => new Map((cashUsers.value || []).map((u) => [u.id, u.email])))
const userEmail = (userId: string | null | undefined) => {
  if (!userId) return '—'
  return userById.value.get(userId) ?? userId.substring(0, 8)
}

// Summary Statistics
const todayStats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayTxs = txs.value.filter(tx => new Date(tx.createdAt) >= today)
  const totalIn = todayTxs.filter(tx => tx.direction === 'IN').reduce((sum, tx) => sum + Number(tx.amount), 0)
  const totalOut = todayTxs.filter(tx => tx.direction === 'OUT').reduce((sum, tx) => sum + Number(tx.amount), 0)
  
  return {
    totalIn,
    totalOut,
    net: totalIn - totalOut
  }
})

const activeSessions = computed(() => cashboxes.value.filter(c => c.openSession).length)

// Active filter counts
const activeTransactionFiltersCount = computed(() => {
  let count = 0
  if (filters.cashboxId) count++
  if (filters.type) count++
  if (filters.direction) count++
  if (filters.method) count++
  if (filters.userId) count++
  if (filters.startDate || filters.endDate) count++
  return count
})

const activeSessionFiltersCount = computed(() => {
  let count = 0
  if (sessionFilters.cashboxId) count++
  if (sessionFilters.status) count++
  if (sessionFilters.userId) count++
  if (sessionFilters.startDate || sessionFilters.endDate) count++
  return count
})

function onTabChange(index: number) {
  // Optional: add any logic needed when switching tabs
}

const resetTxFilters = () => {
  filters.cashboxId = ''
  filters.type = ''
  filters.direction = ''
  filters.method = ''
  filters.userId = ''
  
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  
  filters.startDate = lastWeek.toISOString().split('T')[0]
  filters.endDate = today.toISOString().split('T')[0]
}

const resetSessionFilters = () => {
  sessionFilters.cashboxId = ''
  sessionFilters.status = ''
  sessionFilters.userId = ''
  
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  
  sessionFilters.startDate = lastWeek.toISOString().split('T')[0]
  sessionFilters.endDate = today.toISOString().split('T')[0]
}

const openSessionOpen = ref(false)
const openSessionCashboxId = ref<string | null>(null)
const openSessionForm = reactive({ openingFloat: '0', note: '' })

const closeSessionOpen = ref(false)
const closeSessionId = ref<string | null>(null)
const closeSessionForm = reactive({ closingCount: '', note: '' })
const closeExpected = ref<CashSessionExpected | null>(null)
const closeExpectedLoading = ref(false)

const closeDifference = computed(() => {
  if (!closeExpected.value) return null
  const closing = parsePriceInput(closeSessionForm.closingCount)
  if (!Number.isFinite(closing)) return null
  const expected = Number(closeExpected.value.expectedClosing)
  if (!Number.isFinite(expected)) return null
  return Number(closing) - expected
})

const expenseOpen = ref(false)
const expenseType = ref<'EXPENSE' | 'CHARGE'>('EXPENSE')
const expenseForm = reactive({
  cashboxId: '',
  amount: '',
  category: '',
  method: 'CASH',
  reference: '',
  note: ''
})

const transferOpen = ref(false)
const transferForm = reactive({
  fromCashboxId: '',
  toCashboxId: '',
  amount: '',
  reference: '',
  note: ''
})

type CustomerOption = { id: string; name: string; phone: string }
type SupplierOption = { id: string; name: string; phone: string | null }

const customerPaymentOpen = ref(false)
const customerPaymentForm = reactive({
  cashboxId: '',
  customerId: '',
  amount: '',
  method: 'CASH',
  reference: '',
  note: ''
})
const customerSearch = ref('')
const customerResults = ref<CustomerOption[]>([])
const customerLoading = ref(false)
let customerSearchTimer: ReturnType<typeof setTimeout> | null = null

const supplierPaymentOpen = ref(false)
const supplierPaymentForm = reactive({
  cashboxId: '',
  supplierId: '',
  purchaseOrderId: '',
  amount: '',
  method: 'CASH',
  reference: '',
  note: ''
})
const supplierSearch = ref('')
const suppliers = ref<SupplierOption[]>([])
const supplierPurchaseOrders = ref<any[]>([])
const loadingSupplierPOs = ref(false)

const fetchSupplierPurchaseOrders = async (supplierId: string) => {
  if (!supplierId) {
    supplierPurchaseOrders.value = []
    return
  }
  loadingSupplierPOs.value = true
  try {
    supplierPurchaseOrders.value = await $fetch<any[]>(`/api/admin/purchases?supplierId=${supplierId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Fetch supplier POs failed:', e)
    supplierPurchaseOrders.value = []
  } finally {
    loadingSupplierPOs.value = false
  }
}

watch(() => supplierPaymentForm.supplierId, (newId) => {
  supplierPaymentForm.purchaseOrderId = ''
  if (newId) {
    fetchSupplierPurchaseOrders(newId)
  } else {
    supplierPurchaseOrders.value = []
  }
})

const filteredSuppliers = computed(() => {
  const q = supplierSearch.value.trim().toLowerCase()
  if (!q) return suppliers.value.slice(0, 200)
  return suppliers.value
    .filter((s) => (s.name || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q))
    .slice(0, 200)
})

const canSubmitCustomerPayment = computed(() => {
  const amount = parsePriceInput(customerPaymentForm.amount)
  return Boolean(customerPaymentForm.cashboxId && customerPaymentForm.customerId && Number.isFinite(amount) && amount > 0)
})

const canSubmitSupplierPayment = computed(() => {
  const amount = parsePriceInput(supplierPaymentForm.amount)
  return Boolean(supplierPaymentForm.cashboxId && supplierPaymentForm.supplierId && Number.isFinite(amount) && amount > 0)
})

const expenseCategories = computed(() => {
  const set = new Set<string>()
  for (const tx of txs.value) {
    if (tx.expenseCategory) set.add(tx.expenseCategory)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

function cashboxName(id: string) {
  return cashboxes.value.find((c) => c.id === id)?.name ?? id.substring(0, 8)
}

function typeLabel(type: string) {
  const key = `admin.pages.cash.transactions.types.${type}`
  const translated = t(key)
  return translated === key ? type : translated
}

function methodLabel(method: string) {
  const key = `admin.pages.cash.methods.${method}`
  const translated = t(key)
  return translated === key ? method : translated
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function fetchCashboxes() {
  loadingCashboxes.value = true
  try {
    cashboxes.value = await $fetch<Cashbox[]>('/api/admin/cashboxes', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e: any) {
    console.error('Fetch cashboxes failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
    cashboxes.value = []
  } finally {
    loadingCashboxes.value = false
  }
}

async function fetchTransactions(resetPage = false) {
  loadingTxs.value = true
  if (resetPage) txPage.value = 1
  try {
    const params = new URLSearchParams()
    if (filters.cashboxId) params.append('cashboxId', filters.cashboxId)
    if (filters.type) params.append('type', filters.type)
    if (filters.direction) params.append('direction', filters.direction)
    if (filters.method) params.append('method', filters.method)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    params.append('page', String(txPage.value))
    params.append('limit', String(txPerPage.value))
    const url = `/api/admin/cash-transactions?${params.toString()}`

    const result = await $fetch<{ items: CashTx[]; total: number; page: number; totalPages: number }>(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    txs.value = result.items
    txTotal.value = result.total
    txTotalPages.value = result.totalPages
    txPage.value = result.page
  } catch (e: any) {
    console.error('Fetch transactions failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
    txs.value = []
    txTotal.value = 0
    txTotalPages.value = 1
  } finally {
    loadingTxs.value = false
  }
}

async function fetchSessions(resetPage = false) {
  loadingSessions.value = true
  if (resetPage) sessionsPage.value = 1
  try {
    const params = new URLSearchParams()
    if (sessionFilters.cashboxId) params.append('cashboxId', sessionFilters.cashboxId)
    if (sessionFilters.status) params.append('status', sessionFilters.status)
    if (sessionFilters.userId) params.append('userId', sessionFilters.userId)
    if (sessionFilters.startDate) params.append('startDate', sessionFilters.startDate)
    if (sessionFilters.endDate) params.append('endDate', sessionFilters.endDate)
    params.append('page', String(sessionsPage.value))
    params.append('limit', String(sessionsPerPage.value))
    const url = `/api/admin/cash-sessions?${params.toString()}`

    const result = await $fetch<{ items: CashSession[]; total: number; page: number; totalPages: number }>(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    sessions.value = result.items
    sessionsTotal.value = result.total
    sessionsTotalPages.value = result.totalPages
    sessionsPage.value = result.page
  } catch (e: any) {
    console.error('Fetch sessions failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
    sessions.value = []
    sessionsTotal.value = 0
    sessionsTotalPages.value = 1
  } finally {
    loadingSessions.value = false
  }
}

async function refreshAll() {
  errorMessage.value = ''
  await Promise.all([fetchCashboxes(), fetchUsers(), fetchTransactions(), fetchSessions()])
}

function openOpenSession(cashboxId: string) {
  openSessionCashboxId.value = cashboxId
  openSessionForm.openingFloat = '0'
  openSessionForm.note = ''
  openSessionOpen.value = true
}

function openCloseSession(sessionId: string) {
  closeSessionId.value = sessionId
  closeSessionForm.closingCount = ''
  closeSessionForm.note = ''
  closeExpected.value = null
  closeSessionOpen.value = true
  void loadCloseExpected(sessionId)
}

async function loadCloseExpected(sessionId: string) {
  closeExpectedLoading.value = true
  try {
    closeExpected.value = await $fetch<CashSessionExpected>(`/api/admin/cash-sessions/${sessionId}/expected`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Load expected closing failed:', e)
    closeExpected.value = null
  } finally {
    closeExpectedLoading.value = false
  }
}

async function submitOpenSession() {
  if (!openSessionCashboxId.value) return
  const openingFloat = parsePriceInput(openSessionForm.openingFloat)
  if (!Number.isFinite(openingFloat)) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cashboxes/${openSessionCashboxId.value}/sessions/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { openingFloat, note: openSessionForm.note }
    })
    openSessionOpen.value = false
    await refreshAll()
  } catch (e: any) {
    console.error('Open session failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function submitCloseSession() {
  if (!closeSessionId.value) return
  const closingCount = parsePriceInput(closeSessionForm.closingCount)
  if (!Number.isFinite(closingCount)) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cash-sessions/${closeSessionId.value}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { closingCount, note: closeSessionForm.note }
    })
    closeSessionOpen.value = false
    closeExpected.value = null
    await refreshAll()
  } catch (e: any) {
    console.error('Close session failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

function openExpenseModal(type: 'EXPENSE' | 'CHARGE') {
  expenseType.value = type
  expenseForm.cashboxId = ''
  expenseForm.amount = ''
  expenseForm.category = ''
  expenseForm.method = 'CASH'
  expenseForm.reference = ''
  expenseForm.note = ''
  expenseOpen.value = true
}

async function submitExpense() {
  const amount = parsePriceInput(expenseForm.amount)
  if (!Number.isFinite(amount) || amount <= 0) return
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: expenseForm.cashboxId,
        type: expenseType.value,
        direction: 'OUT',
        amount,
        method: expenseForm.method,
        expenseCategory: expenseForm.category,
        reference: expenseForm.reference,
        note: expenseForm.note
      }
    })
    expenseOpen.value = false
    await fetchTransactions(true)
    await fetchCashboxes()
  } catch (e: any) {
    console.error('Create expense failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function submitTransfer() {
  const amount = parsePriceInput(transferForm.amount)
  if (!Number.isFinite(amount) || amount <= 0) return
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transfers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        fromCashboxId: transferForm.fromCashboxId,
        toCashboxId: transferForm.toCashboxId,
        amount,
        reference: transferForm.reference,
        note: transferForm.note
      }
    })
    transferOpen.value = false
    await refreshAll()
  } catch (e: any) {
    console.error('Transfer failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function fetchCustomers(search: string) {
  customerLoading.value = true
  try {
    const params = new URLSearchParams()
    if (search.trim()) params.append('search', search.trim())
    const url = `/api/admin/customers${params.toString() ? '?' + params.toString() : ''}`

    const rows = await $fetch<any[]>(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    customerResults.value = (rows || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone
    }))
  } finally {
    customerLoading.value = false
  }
}

async function fetchSuppliers() {
  if (suppliers.value.length) return
  const rows = await $fetch<any[]>('/api/admin/suppliers', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  suppliers.value = (rows || []).map((s: any) => ({ id: s.id, name: s.name, phone: s.phone ?? null }))
}

function openCustomerPaymentModal() {
  customerPaymentForm.cashboxId = ''
  customerPaymentForm.customerId = ''
  customerPaymentForm.amount = ''
  customerPaymentForm.method = 'CASH'
  customerPaymentForm.reference = ''
  customerPaymentForm.note = ''
  customerSearch.value = ''
  customerResults.value = []
  customerPaymentOpen.value = true
  void fetchCustomers('')
}

async function openSupplierPaymentModal() {
  supplierPaymentForm.cashboxId = ''
  supplierPaymentForm.supplierId = ''
  supplierPaymentForm.purchaseOrderId = ''
  supplierPaymentForm.amount = ''
  supplierPaymentForm.method = 'CASH'
  supplierPaymentForm.reference = ''
  supplierPaymentForm.note = ''
  supplierSearch.value = ''
  supplierPaymentOpen.value = true
  await fetchSuppliers()
}

async function submitCustomerPayment() {
  if (!canSubmitCustomerPayment.value) return
  const amount = parsePriceInput(customerPaymentForm.amount)
  if (!Number.isFinite(amount) || amount <= 0) return
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: customerPaymentForm.cashboxId,
        type: 'CUSTOMER_PAYMENT',
        direction: 'IN',
        amount,
        customerId: customerPaymentForm.customerId,
        method: customerPaymentForm.method,
        reference: customerPaymentForm.reference,
        note: customerPaymentForm.note
      }
    })
    customerPaymentOpen.value = false
    await refreshAll()
  } catch (e) {
    console.error('Create customer payment failed:', e)
    errorMessage.value = (e as any)?.data?.statusMessage || (e as any)?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function submitSupplierPayment() {
  if (!canSubmitSupplierPayment.value) return
  const amount = parsePriceInput(supplierPaymentForm.amount)
  if (!Number.isFinite(amount) || amount <= 0) return
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: supplierPaymentForm.cashboxId,
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        amount,
        supplierId: supplierPaymentForm.supplierId,
        purchaseOrderId: supplierPaymentForm.purchaseOrderId || undefined,
        method: supplierPaymentForm.method,
        reference: supplierPaymentForm.reference,
        note: supplierPaymentForm.note
      }
    })
    supplierPaymentOpen.value = false
    await refreshAll()
  } catch (e) {
    console.error('Create supplier payment failed:', e)
    errorMessage.value = (e as any)?.data?.statusMessage || (e as any)?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function fetchUsers() {
  try {
    cashUsers.value = await $fetch<CashUser[]>('/api/admin/cash-users', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Fetch cash users failed:', e)
    cashUsers.value = []
  }
}

const cashboxCreateOpen = ref(false)
const cashboxForm = reactive({ name: '', isActive: true })
const canCreateCashbox = computed(() => cashboxForm.name.trim().length >= 2)

function openCashboxCreate() {
  cashboxForm.name = ''
  cashboxForm.isActive = true
  cashboxCreateOpen.value = true
}

async function submitCreateCashbox() {
  actionLoading.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/cashboxes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { name: cashboxForm.name.trim(), isActive: cashboxForm.isActive }
    })
    cashboxCreateOpen.value = false
    await fetchCashboxes()
  } catch (e: any) {
    console.error('Create cashbox failed:', e)
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  await refreshAll()
})

watch(
  () => ({ ...filters }),
  () => {
    fetchTransactions(true)
  }
)

watch(customerSearch, (value) => {
  if (!customerPaymentOpen.value) return
  if (customerSearchTimer) clearTimeout(customerSearchTimer)
  customerSearchTimer = setTimeout(() => {
    fetchCustomers(value)
  }, 250)
})

watch(
  () => ({ ...sessionFilters }),
  () => {
    fetchSessions(true)
  }
)
</script>
