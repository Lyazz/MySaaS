import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

type Json = Record<string, unknown>

const readLocale = (locale: string): Json => {
    const filePath = path.resolve(process.cwd(), 'locales', `${locale}.json`)
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Json
}

const getByPath = (obj: unknown, dottedPath: string): unknown => {
    return dottedPath.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) return (acc as Record<string, unknown>)[key]
        return undefined
    }, obj)
}

const requiredKeys = [
    'superAdmin.nav.tenants',
    'superAdmin.tenants.actions.payments',

    'superAdmin.paymentsPage.title',
    'superAdmin.paymentsPage.subtitle',
    'superAdmin.paymentsPage.actions.refresh',

    'superAdmin.paymentsPage.import.title',
    'superAdmin.paymentsPage.import.fields.plan',
    'superAdmin.paymentsPage.import.fields.interval',
    'superAdmin.paymentsPage.import.fields.proofUrl',
    'superAdmin.paymentsPage.import.fields.proofUrlPlaceholder',
    'superAdmin.paymentsPage.import.fields.proofUrlHint',
    'superAdmin.paymentsPage.import.fields.externalReference',
    'superAdmin.paymentsPage.import.fields.externalReferencePlaceholder',
    'superAdmin.paymentsPage.import.fields.notes',
    'superAdmin.paymentsPage.import.fields.notesPlaceholder',
    'superAdmin.paymentsPage.import.applySubscription.label',
    'superAdmin.paymentsPage.import.applySubscription.hint',
    'superAdmin.paymentsPage.import.actions.importing',
    'superAdmin.paymentsPage.import.actions.importProof',

    'superAdmin.paymentsPage.history.title',
    'superAdmin.paymentsPage.history.lastEntries',
    'superAdmin.paymentsPage.history.loading',
    'superAdmin.paymentsPage.history.empty',
    'superAdmin.paymentsPage.history.table.date',
    'superAdmin.paymentsPage.history.table.plan',
    'superAdmin.paymentsPage.history.table.amount',
    'superAdmin.paymentsPage.history.table.method',
    'superAdmin.paymentsPage.history.table.status',
    'superAdmin.paymentsPage.history.table.proof',
    'superAdmin.paymentsPage.history.proof.open',
    'superAdmin.paymentsPage.history.actions.approve',
    'superAdmin.paymentsPage.history.actions.reject',

    'superAdmin.paymentsPage.planOption.ordersPerMonth',
    'superAdmin.paymentsPage.interval.monthly',
    'superAdmin.paymentsPage.interval.yearly',

    'superAdmin.paymentsPage.errors.loadFailed',
    'superAdmin.paymentsPage.errors.importFailed',
    'superAdmin.paymentsPage.errors.reviewFailed'
] as const

describe('i18n: Super Admin tenant payments', () => {
    for (const locale of ['en', 'fr', 'ar']) {
        it(`has required keys in ${locale}.json`, () => {
            const dict = readLocale(locale)
            for (const key of requiredKeys) {
                const value = getByPath(dict, key)
                expect(typeof value, `${locale}: missing ${key}`).toBe('string')
                expect((value as string).trim().length, `${locale}: empty ${key}`).toBeGreaterThan(0)
            }
        })
    }
})

