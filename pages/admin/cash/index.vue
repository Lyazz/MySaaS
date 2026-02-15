<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ t('admin.pages.cash.title') }}
        </h2>
        <p class="mt-1 text-slate-600">
          {{ t('admin.pages.cash.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="openCustomerPaymentModal"
        >
          <Icon name="lucide:user-round" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.newCustomerPayment') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="openSupplierPaymentModal"
        >
          <Icon name="lucide:truck" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.newSupplierPayment') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="openExpenseModal('EXPENSE')"
        >
          <Icon name="lucide:minus-circle" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.newExpense') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="openExpenseModal('CHARGE')"
        >
          <Icon name="lucide:receipt" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.newCharge') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
          @click="transferOpen = true"
        >
          <Icon name="lucide:arrow-left-right" class="h-4 w-4" />
          {{ t('admin.pages.cash.actions.transfer') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section class="lg:col-span-1 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm h-fit">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h3 class="font-semibold text-slate-900">
            {{ t('admin.pages.cash.cashboxes.title') }}
          </h3>
          <button
            type="button"
            class="text-sm font-medium text-teal-600 hover:text-teal-700"
            :disabled="loadingCashboxes"
            @click="refreshAll"
          >
            {{ t('admin.common.refresh') }}
          </button>
        </div>

        <div v-if="loadingCashboxes" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="c in cashboxes"
            :key="c.id"
            class="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                   <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon name="lucide:wallet" class="h-4 w-4" />
                   </div>
                   <p class="font-semibold text-slate-900 truncate">
                      {{ c.name }}
                   </p>
                </div>
                
                <div class="mt-3">
                    <p class="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {{ t('admin.pages.cash.cashboxes.status') }}
                    </p>
                    <div class="mt-1 flex items-center gap-2">
                        <span 
                          class="inline-flex h-2.5 w-2.5 rounded-full"
                          :class="c.openSession ? 'bg-emerald-500' : 'bg-slate-300'"
                        />
                        <span class="text-sm font-medium" :class="c.openSession ? 'text-emerald-700' : 'text-slate-600'">
                           <span v-if="c.openSession">
                            {{ t('admin.pages.cash.cashboxes.openSession', { id: c.openSession.id.substring(0, 8) }) }}
                          </span>
                          <span v-else>
                            {{ t('admin.pages.cash.cashboxes.closed') }}
                          </span>
                        </span>
                    </div>
                </div>
              </div>

              <NuxtLink
                :to="`/admin/cash/${c.id}`"
                class="absolute top-4 right-4 p-2 text-slate-400 opacity-0 transition-all hover:text-teal-600 group-hover:opacity-100"
                :title="t('common.view')"
              >
                <Icon name="lucide:arrow-right" class="h-5 w-5" />
              </NuxtLink>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              <button
                v-if="!c.openSession"
                type="button"
                class="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700"
                @click="openOpenSession(c.id)"
              >
                <Icon name="lucide:play" class="h-3.5 w-3.5" />
                {{ t('admin.pages.cash.cashboxes.open') }}
              </button>

              <button
                v-else
                type="button"
                class="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                @click="openCloseSession(c.openSession.id)"
              >
                <Icon name="lucide:lock" class="h-3.5 w-3.5" />
                {{ t('admin.pages.cash.cashboxes.close') }}
              </button>
               <NuxtLink
                :to="`/admin/cash/${c.id}`"
                class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {{ t('common.details') }}
              </NuxtLink>
            </div>
          </div>

          <div v-if="cashboxes.length === 0" class="rounded-xl border border-dashed border-slate-200 p-6 text-center">
             <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Icon name="lucide:inbox" class="h-5 w-5 text-slate-400" />
             </div>
            <p class="mt-2 text-sm font-medium text-slate-900">
              {{ t('admin.pages.cash.cashboxes.empty') }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ t('admin.pages.cash.cashboxes.emptyHint') }}
            </p>
          </div>
        </div>
      </section>

      <section class="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden h-fit">
        <div class="border-b border-slate-200/70 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="font-semibold text-slate-900">
                {{ t('admin.pages.cash.transactions.title') }}
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                {{ t('admin.pages.cash.transactions.subtitle') }}
              </p>
            </div>

            <div class="flex flex-col gap-2 w-full sm:w-auto">
              <div class="flex flex-wrap gap-2">
                <div class="min-w-[160px]">
                  <BaseSelect v-model="filters.cashboxId" class="!bg-slate-50 !border-slate-200 !text-sm">
                    <option value="">{{ t('admin.pages.cash.transactions.filters.allCashboxes') }}</option>
                    <option v-for="c in cashboxes" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </BaseSelect>
                </div>
                <div class="min-w-[140px]">
                  <BaseSelect v-model="filters.type" class="!bg-slate-50 !border-slate-200 !text-sm">
                    <option value="">{{ t('admin.pages.cash.transactions.filters.allTypes') }}</option>
                    <option value="SALE_PAYMENT">{{ t('admin.pages.cash.transactions.types.SALE_PAYMENT') }}</option>
                    <option value="CUSTOMER_PAYMENT">{{ t('admin.pages.cash.transactions.types.CUSTOMER_PAYMENT') }}</option>
                    <option value="SUPPLIER_PAYMENT">{{ t('admin.pages.cash.transactions.types.SUPPLIER_PAYMENT') }}</option>
                    <option value="EXPENSE">{{ t('admin.pages.cash.transactions.types.EXPENSE') }}</option>
                    <option value="CHARGE">{{ t('admin.pages.cash.transactions.types.CHARGE') }}</option>
                    <option value="TRANSFER">{{ t('admin.pages.cash.transactions.types.TRANSFER') }}</option>
                  </BaseSelect>
                </div>
                <div class="min-w-[110px]">
                  <BaseSelect v-model="filters.direction" class="!bg-slate-50 !border-slate-200 !text-sm">
                    <option value="">{{ t('admin.pages.cash.transactions.filters.allDirections') }}</option>
                    <option value="IN">{{ t('admin.pages.cash.directions.in') }}</option>
                    <option value="OUT">{{ t('admin.pages.cash.directions.out') }}</option>
                  </BaseSelect>
                </div>
              </div>
              <div class="w-full">
                <DateFilter
                  v-model:start-date="filters.startDate"
                  v-model:end-date="filters.endDate"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="loadingTxs" class="p-10 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
          <p class="mt-2 text-sm text-slate-500">
            {{ t('admin.pages.cash.transactions.loading') }}
          </p>
        </div>

        <div v-else-if="txs.length === 0" class="p-10 text-center">
           <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
             <Icon name="lucide:inbox" class="h-5 w-5 text-slate-400" />
           </div>
          <p class="mt-3 text-sm font-medium text-slate-900">
            {{ t('admin.pages.cash.transactions.empty') }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ t('admin.pages.cash.transactions.emptyHint') }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200/70">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.cash.transactions.table.date') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.cash.transactions.table.cashbox') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.cash.transactions.table.type') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.cash.transactions.table.method') }}
                </th>
                <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.cash.transactions.table.amount') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70 bg-white">
              <tr v-for="tx in txs" :key="tx.id" class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                  {{ formatDate(tx.createdAt) }}
                </td>
                <td class="px-5 py-4 text-sm font-medium text-slate-900">
                  {{ cashboxName(tx.cashboxId) }}
                </td>
                <td class="px-5 py-4 text-sm text-slate-700">
                  <div class="flex flex-col">
                    <span class="font-medium text-slate-900">{{ typeLabel(tx.type) }}</span>
                    <span v-if="tx.expenseCategory" class="text-xs text-slate-500 mt-0.5">
                       {{ tx.expenseCategory }}
                    </span>
                    <span v-if="tx.reference" class="text-xs text-slate-500 mt-0.5">
                       Ref: {{ tx.reference }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4 text-sm text-slate-600">
                   <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      <Icon v-if="tx.method === 'CASH'" name="lucide:banknote" class="h-3 w-3" />
                      <Icon v-else-if="tx.method === 'CARD'" name="lucide:credit-card" class="h-3 w-3" />
                      <Icon v-else name="lucide:arrow-left-right" class="h-3 w-3" />
                      {{ methodLabel(tx.method) }}
                   </span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-bold" :class="tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'">
                  {{ tx.direction === 'IN' ? '+' : '-' }}{{ formatCurrency(Number(tx.amount)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden h-fit">
      <div class="border-b border-slate-200/70 p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 class="font-semibold text-slate-900">
              {{ t('admin.pages.cash.sessions.title') }}
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              {{ t('admin.pages.cash.sessions.subtitle') }}
            </p>
          </div>

          <div class="flex flex-col gap-2 w-full sm:w-auto">
            <div class="flex flex-wrap gap-2">
              <div class="min-w-[160px]">
                <BaseSelect v-model="sessionFilters.cashboxId" class="!bg-slate-50 !border-slate-200 !text-sm">
                  <option value="">{{ t('admin.pages.cash.sessions.filters.allCashboxes') }}</option>
                  <option v-for="c in cashboxes" :key="c.id" :value="c.id">{{ c.name }}</option>
                </BaseSelect>
              </div>
              <div class="min-w-[140px]">
                <BaseSelect v-model="sessionFilters.status" class="!bg-slate-50 !border-slate-200 !text-sm">
                  <option value="">{{ t('admin.pages.cash.sessions.filters.allStatuses') }}</option>
                  <option value="OPEN">{{ t('admin.pages.cash.status.OPEN') }}</option>
                  <option value="CLOSED">{{ t('admin.pages.cash.status.CLOSED') }}</option>
                </BaseSelect>
              </div>
            </div>
            <div class="w-full">
               <DateFilter
                v-model:start-date="sessionFilters.startDate"
                v-model:end-date="sessionFilters.endDate"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingSessions" class="p-10 text-center">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        <p class="mt-2 text-sm text-slate-500">
          {{ t('admin.pages.cash.sessions.loading') }}
        </p>
      </div>

      <div v-else-if="sessions.length === 0" class="p-10 text-center">
         <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
             <Icon name="lucide:inbox" class="h-5 w-5 text-slate-400" />
         </div>
        <p class="mt-3 text-sm font-medium text-slate-900">
          {{ t('admin.pages.cash.sessions.empty') }}
        </p>
        <p class="mt-1 text-sm text-slate-500">
          {{ t('admin.pages.cash.sessions.emptyHint') }}
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200/70">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.cashbox') }}
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.status') }}
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.openedAt') }}
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.closedAt') }}
              </th>
              <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.openingFloat') }}
              </th>
              <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.expectedClosing') }}
              </th>
              <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.closingCount') }}
              </th>
              <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                {{ t('admin.pages.cash.sessions.table.difference') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70 bg-white">
            <tr v-for="s in sessions" :key="s.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-4 text-sm font-medium text-slate-900">
                {{ cashboxName(s.cashboxId) }}
              </td>
              <td class="px-5 py-4 text-sm">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="s.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'"
                >
                  <span class="mr-1.5 h-1.5 w-1.5 rounded-full" :class="s.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-500'" />
                  {{ t(`admin.pages.cash.status.${s.status}`) }}
                </span>
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                {{ formatDate(s.openedAt) }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                {{ s.closedAt ? formatDate(s.closedAt) : '—' }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                {{ formatCurrency(Number(s.openingFloat)) }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                {{ s.expectedClosing ? formatCurrency(Number(s.expectedClosing)) : '—' }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                {{ s.closingCount ? formatCurrency(Number(s.closingCount)) : '—' }}
              </td>
              <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-bold" :class="s.difference && Number(s.difference) !== 0 ? 'text-rose-600' : 'text-slate-900'">
                {{ s.difference ? formatCurrency(Number(s.difference)) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Open Session Modal -->
    <div v-if="openSessionOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="openSessionOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/50" @click="openSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.cash.modals.openSession.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.openSession.subtitle') }}
          </p>

          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.openSession.openingFloatLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.openingFloat" placeholder="0" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.openSession.noteLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.note" :placeholder="t('admin.pages.cash.modals.openSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="openSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50" @click="closeSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.cash.modals.closeSession.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.closeSession.subtitle') }}
          </p>

          <div class="mt-4 space-y-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div v-if="closeExpectedLoading" class="flex items-center gap-2 text-sm text-slate-600">
                <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ t('admin.pages.cash.sessions.expected.loading') }}
              </div>
              <div v-else-if="closeExpected" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {{ t('admin.pages.cash.openingFloat') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-slate-900">
                    {{ formatCurrency(Number(closeExpected.openingFloat)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {{ t('admin.pages.cash.expectedClosing') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-slate-900">
                    {{ formatCurrency(Number(closeExpected.expectedClosing)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {{ t('admin.pages.cash.directions.in') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-emerald-700">
                    +{{ formatCurrency(Number(closeExpected.inSum)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {{ t('admin.pages.cash.directions.out') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-rose-700">
                    -{{ formatCurrency(Number(closeExpected.outSum)) }}
                  </p>
                </div>
                <div class="col-span-2 flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {{ t('admin.pages.cash.difference') }}
                  </p>
                  <p class="font-semibold" :class="closeDifference !== null && closeDifference !== 0 ? 'text-rose-700' : 'text-slate-900'">
                    {{ closeDifference === null ? '—' : formatCurrency(closeDifference) }}
                  </p>
                </div>
              </div>
              <div v-else class="text-sm text-slate-600">
                {{ t('admin.pages.cash.sessions.expected.unavailable') }}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.closeSession.closingCountLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.closingCount" placeholder="0" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.closeSession.noteLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.note" :placeholder="t('admin.pages.cash.modals.closeSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="closeSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50" @click="customerPaymentOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.cash.modals.customerPayment.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.customerPayment.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <p v-if="customerLoading" class="mt-1 text-xs text-slate-500">
                {{ t('admin.pages.cash.modals.customerPayment.loadingCustomers') }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.customerPayment.amountLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.amount" placeholder="0" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.customerPayment.referenceLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.reference" :placeholder="t('admin.pages.cash.modals.customerPayment.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.customerPayment.noteLabel') }}
              </label>
              <BaseInput v-model="customerPaymentForm.note" :placeholder="t('admin.pages.cash.modals.customerPayment.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="customerPaymentOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50" @click="supplierPaymentOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.cash.modals.supplierPayment.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.supplierPayment.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
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

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.supplierPayment.amountLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.amount" placeholder="0" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.supplierPayment.referenceLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.reference" :placeholder="t('admin.pages.cash.modals.supplierPayment.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.supplierPayment.noteLabel') }}
              </label>
              <BaseInput v-model="supplierPaymentForm.note" :placeholder="t('admin.pages.cash.modals.supplierPayment.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="supplierPaymentOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50" @click="expenseOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ expenseType === 'EXPENSE' ? t('admin.pages.cash.modals.expense.title') : t('admin.pages.cash.modals.charge.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.expense.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.expense.amountLabel') }}
              </label>
              <BaseInput v-model="expenseForm.amount" placeholder="0" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.expense.categoryLabel') }}
              </label>
              <BaseInput v-model="expenseForm.category" :placeholder="t('admin.pages.cash.modals.expense.categoryPlaceholder')" list="expenseCategories" />
              <datalist id="expenseCategories">
                <option v-for="c in expenseCategories" :key="c" :value="c" />
              </datalist>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.expense.referenceLabel') }}
              </label>
              <BaseInput v-model="expenseForm.reference" :placeholder="t('admin.pages.cash.modals.expense.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.expense.noteLabel') }}
              </label>
              <BaseInput v-model="expenseForm.note" :placeholder="t('admin.pages.cash.modals.expense.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="expenseOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50" @click="transferOpen = false" />
        <div class="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t('admin.pages.cash.modals.transfer.title') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('admin.pages.cash.modals.transfer.subtitle') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.transfer.amountLabel') }}
              </label>
              <BaseInput v-model="transferForm.amount" placeholder="0" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.transfer.referenceLabel') }}
              </label>
              <BaseInput v-model="transferForm.reference" :placeholder="t('admin.pages.cash.modals.transfer.referencePlaceholder')" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.transfer.noteLabel') }}
              </label>
              <BaseInput v-model="transferForm.note" :placeholder="t('admin.pages.cash.modals.transfer.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="transferOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              :disabled="actionLoading"
              @click="submitTransfer"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.transfer.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import DateFilter from '~/components/ui/DateFilter.vue'

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
}

type CashSessionExpected = {
  sessionId: string
  openingFloat: string | number
  inSum: string | number
  outSum: string | number
  expectedClosing: string | number
}

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const cashboxes = ref<Cashbox[]>([])
const loadingCashboxes = ref(true)

const txs = ref<CashTx[]>([])
const loadingTxs = ref(true)

const sessions = ref<CashSession[]>([])
const loadingSessions = ref(true)
const sessionFilters = reactive({
  cashboxId: '',
  status: '',
  startDate: '',
  endDate: ''
})

const actionLoading = ref(false)

const filters = reactive({
  cashboxId: '',
  type: '',
  direction: '',
  startDate: '',
  endDate: ''
})

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
  const closing = Number.parseFloat(String(closeSessionForm.closingCount || ''))
  if (!Number.isFinite(closing)) return null
  const expected = Number(closeExpected.value.expectedClosing)
  if (!Number.isFinite(expected)) return null
  return closing - expected
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
  amount: '',
  method: 'CASH',
  reference: '',
  note: ''
})
const supplierSearch = ref('')
const suppliers = ref<SupplierOption[]>([])

const filteredSuppliers = computed(() => {
  const q = supplierSearch.value.trim().toLowerCase()
  if (!q) return suppliers.value.slice(0, 200)
  return suppliers.value
    .filter((s) => (s.name || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q))
    .slice(0, 200)
})

const canSubmitCustomerPayment = computed(() => {
  const amount = Number.parseFloat(String(customerPaymentForm.amount || ''))
  return Boolean(customerPaymentForm.cashboxId && customerPaymentForm.customerId && Number.isFinite(amount) && amount > 0)
})

const canSubmitSupplierPayment = computed(() => {
  const amount = Number.parseFloat(String(supplierPaymentForm.amount || ''))
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
  } finally {
    loadingCashboxes.value = false
  }
}

async function fetchTransactions() {
  loadingTxs.value = true
  try {
    const params = new URLSearchParams()
    if (filters.cashboxId) params.append('cashboxId', filters.cashboxId)
    if (filters.type) params.append('type', filters.type)
    if (filters.direction) params.append('direction', filters.direction)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const url = `/api/admin/cash-transactions${params.toString() ? '?' + params.toString() : ''}`

    txs.value = await $fetch<CashTx[]>(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } finally {
    loadingTxs.value = false
  }
}

async function fetchSessions() {
  loadingSessions.value = true
  try {
    const params = new URLSearchParams()
    if (sessionFilters.cashboxId) params.append('cashboxId', sessionFilters.cashboxId)
    if (sessionFilters.status) params.append('status', sessionFilters.status)
    if (sessionFilters.startDate) params.append('startDate', sessionFilters.startDate)
    if (sessionFilters.endDate) params.append('endDate', sessionFilters.endDate)
    const url = `/api/admin/cash-sessions${params.toString() ? '?' + params.toString() : ''}`

    sessions.value = await $fetch<CashSession[]>(url, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } finally {
    loadingSessions.value = false
  }
}

async function refreshAll() {
  await Promise.all([fetchCashboxes(), fetchTransactions(), fetchSessions()])
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
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cashboxes/${openSessionCashboxId.value}/sessions/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { openingFloat: openSessionForm.openingFloat, note: openSessionForm.note }
    })
    openSessionOpen.value = false
    await refreshAll()
  } catch (e: any) {
    console.error('Open session failed:', e)
  } finally {
    actionLoading.value = false
  }
}

async function submitCloseSession() {
  if (!closeSessionId.value) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cash-sessions/${closeSessionId.value}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { closingCount: closeSessionForm.closingCount, note: closeSessionForm.note }
    })
    closeSessionOpen.value = false
    closeExpected.value = null
    await refreshAll()
  } catch (e: any) {
    console.error('Close session failed:', e)
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
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: expenseForm.cashboxId,
        type: expenseType.value,
        direction: 'OUT',
        amount: expenseForm.amount,
        method: expenseForm.method,
        expenseCategory: expenseForm.category,
        reference: expenseForm.reference,
        note: expenseForm.note
      }
    })
    expenseOpen.value = false
    await fetchTransactions()
    await fetchCashboxes()
  } catch (e: any) {
    console.error('Create expense failed:', e)
  } finally {
    actionLoading.value = false
  }
}

async function submitTransfer() {
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transfers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        fromCashboxId: transferForm.fromCashboxId,
        toCashboxId: transferForm.toCashboxId,
        amount: transferForm.amount,
        reference: transferForm.reference,
        note: transferForm.note
      }
    })
    transferOpen.value = false
    await refreshAll()
  } catch (e: any) {
    console.error('Transfer failed:', e)
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
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: customerPaymentForm.cashboxId,
        type: 'CUSTOMER_PAYMENT',
        direction: 'IN',
        amount: customerPaymentForm.amount,
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
  } finally {
    actionLoading.value = false
  }
}

async function submitSupplierPayment() {
  if (!canSubmitSupplierPayment.value) return
  actionLoading.value = true
  try {
    await $fetch('/api/admin/cash-transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cashboxId: supplierPaymentForm.cashboxId,
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        amount: supplierPaymentForm.amount,
        supplierId: supplierPaymentForm.supplierId,
        method: supplierPaymentForm.method,
        reference: supplierPaymentForm.reference,
        note: supplierPaymentForm.note
      }
    })
    supplierPaymentOpen.value = false
    await refreshAll()
  } catch (e) {
    console.error('Create supplier payment failed:', e)
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
    fetchTransactions()
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
    fetchSessions()
  }
)
</script>
