import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

/**
 * Client half of the AI document import.
 *
 * Upload → follow the NDJSON progress stream → edit the draft → confirm.
 * The draft is the server's shape; every edit is patched back (debounced), so
 * a closed tab loses nothing and the confirm never has to trust the client's
 * copy of anything.
 */

export type AiDocumentKind = 'PURCHASE_INVOICE' | 'DELIVERY_NOTE' | 'PRODUCT_CATALOG'
export type LineAction = 'match' | 'create' | 'skip'
export type MatchSource = 'barcode' | 'sku' | 'alias' | 'fuzzy' | 'none'

export interface DraftLine {
    index: number
    label: string
    sku: string | null
    barcode: string | null
    quantity: number
    unitCost: number
    salePrice: number | null
    salePricePinned: boolean
    action: LineAction
    variantId: string | null
    matchSource: MatchSource
    matchScore: number
    candidates: { variantId: string; score: number }[]
    confidence: Record<string, number>
    reviewed: string[]
}

export interface AiDocumentDraft {
    supplier: {
        supplierId: string | null
        name: string | null
        phone: string | null
        address: string | null
        create: boolean
        matchScore: number
        candidates: { supplierId: string; name: string; score: number }[]
    }
    reference: string | null
    issuedAt: string | null
    currency: string
    marginPercent: number
    lines: DraftLine[]
    totalsMismatch: { computed: number; printed: number } | null
    notes: string | null
}

export interface AiDocumentJobView {
    id: string
    kind: AiDocumentKind
    status: 'PENDING' | 'EXTRACTING' | 'READY' | 'CONFIRMED' | 'FAILED' | 'CANCELLED'
    mimeType: string
    pageCount: number
    errorMessage: string | null
    purchaseOrderId: string | null
    draft: AiDocumentDraft | null
    variants: Record<string, { sku: string; title: string; cost: string; price: string }>
}

/** Anything the model scored below this is flagged for review. */
export const LOW_CONFIDENCE = 0.75

/** Fields whose low confidence blocks the confirm button. Mirrors the server. */
export const GATED_FIELDS = ['label', 'quantity', 'unitCost'] as const

export const useAiImportJob = () => {
    const authStore = useAuthStore()
    const { uploadWithProgress } = useUploadWithProgress()

    const job = ref<AiDocumentJobView | null>(null)
    const draft = ref<AiDocumentDraft | null>(null)
    const documentUrl = ref<string | null>(null)
    const uploadPercent = ref(0)
    const loading = ref(false)
    const saving = ref(false)
    const confirming = ref(false)
    const error = ref<string | null>(null)

    const headers = () => ({ Authorization: `Bearer ${authStore.token}` })

    const message = (err: any, fallback: string) =>
        err?.data?.statusMessage || err?.data?.message || err?.message || fallback

    const upload = async (file: File, kind: AiDocumentKind) => {
        uploadPercent.value = 0
        error.value = null
        const res = await uploadWithProgress<{ jobId: string }>({
            url: '/api/admin/ai-documents',
            file,
            token: authStore.token,
            fields: { kind },
            onProgress: (p) => (uploadPercent.value = p)
        })
        return res.jobId
    }

    const load = async (jobId: string) => {
        loading.value = true
        try {
            job.value = await $fetch<AiDocumentJobView>(`/api/admin/ai-documents/${jobId}`, {
                headers: headers()
            })
            draft.value = job.value.draft
            error.value = job.value.status === 'FAILED' ? job.value.errorMessage : null
        } catch (err: any) {
            error.value = message(err, 'Could not load this document')
        } finally {
            loading.value = false
        }
    }

    const loadDocumentUrl = async (jobId: string) => {
        try {
            const res = await $fetch<{ url: string }>(`/api/admin/ai-documents/${jobId}/document-url`, {
                headers: headers()
            })
            documentUrl.value = res.url
        } catch {
            documentUrl.value = null
        }
    }

    /**
     * Follows extraction progress. The endpoint replays the terminal state for
     * a client that reconnects late, and answers `pending` when another process
     * owns the run — in which case we fall back to polling.
     */
    const followExtraction = async (jobId: string) => {
        try {
            const res = await fetch(`/api/admin/ai-documents/${jobId}/stream`, { headers: headers() })
            if (!res.body) throw new Error('no stream')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let sawPending = false

            for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''
                for (const line of lines) {
                    if (!line.trim()) continue
                    const event = JSON.parse(line)
                    if (event.type === 'pending') sawPending = true
                    if (event.type === 'error') error.value = event.message
                }
            }

            if (sawPending) return await pollUntilSettled(jobId)
        } catch {
            return await pollUntilSettled(jobId)
        }
        await load(jobId)
    }

    const pollUntilSettled = async (jobId: string) => {
        for (let i = 0; i < 120; i += 1) {
            await load(jobId)
            const status = job.value?.status
            if (status && status !== 'PENDING' && status !== 'EXTRACTING') return
            await new Promise((r) => setTimeout(r, 2000))
        }
    }

    let patchTimer: ReturnType<typeof setTimeout> | null = null

    const persist = async () => {
        if (!job.value || !draft.value) return
        saving.value = true
        try {
            draft.value = await $fetch<AiDocumentDraft>(
                `/api/admin/ai-documents/${job.value.id}/draft`,
                { method: 'PATCH', headers: headers(), body: draft.value }
            )
        } catch (err: any) {
            error.value = message(err, 'Could not save your changes')
        } finally {
            saving.value = false
        }
    }

    /** Coalesces keystrokes into one request. */
    const persistSoon = (delay = 600) => {
        if (patchTimer) clearTimeout(patchTimer)
        patchTimer = setTimeout(() => void persist(), delay)
    }

    const confirm = async () => {
        if (!job.value) return null
        confirming.value = true
        error.value = null
        try {
            if (patchTimer) {
                clearTimeout(patchTimer)
                patchTimer = null
                await persist()
            }
            return await $fetch<{ purchaseOrderId: string | null; createdProductIds: string[] }>(
                `/api/admin/ai-documents/${job.value.id}/confirm`,
                { method: 'POST', headers: headers() }
            )
        } catch (err: any) {
            error.value = message(err, 'Could not import this document')
            return null
        } finally {
            confirming.value = false
        }
    }

    const cancel = async () => {
        if (!job.value) return
        await $fetch(`/api/admin/ai-documents/${job.value.id}`, { method: 'DELETE', headers: headers() })
    }

    /** Fields the merchant still has to look at, keyed `${index}:${field}`. */
    const pendingReview = computed(() => {
        const out = new Set<string>()
        for (const line of draft.value?.lines ?? []) {
            if (line.action === 'skip') continue
            for (const field of GATED_FIELDS) {
                const score = line.confidence[field] ?? 0
                // A zero means the model returned nothing, not that it guessed —
                // an absent value is not something a merchant can confirm.
                if (score > 0 && score < LOW_CONFIDENCE && !line.reviewed.includes(field)) {
                    out.add(`${line.index}:${field}`)
                }
            }
        }
        return out
    })

    const canConfirm = computed(
        () =>
            Boolean(draft.value) &&
            job.value?.status === 'READY' &&
            pendingReview.value.size === 0 &&
            (draft.value?.lines ?? []).some((l) => l.action !== 'skip')
    )

    const markReviewed = (line: DraftLine, field: string) => {
        if (line.reviewed.includes(field)) return
        line.reviewed = [...line.reviewed, field]
        persistSoon()
    }

    /** Re-derives every sale price the merchant has not pinned. */
    const applyMarginToAll = () => {
        if (!draft.value) return
        const margin = draft.value.marginPercent
        for (const line of draft.value.lines) {
            if (line.salePricePinned) continue
            line.salePrice = line.unitCost > 0 ? Math.round(line.unitCost * (1 + margin / 100)) : null
        }
        persistSoon(200)
    }

    const totals = computed(() => {
        const lines = (draft.value?.lines ?? []).filter((l) => l.action !== 'skip')
        return {
            lineCount: lines.length,
            quantity: lines.reduce((s, l) => s + l.quantity, 0),
            cost: lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)
        }
    })

    return {
        job,
        draft,
        documentUrl,
        uploadPercent,
        loading,
        saving,
        confirming,
        error,
        pendingReview,
        canConfirm,
        totals,
        upload,
        load,
        loadDocumentUrl,
        followExtraction,
        persist,
        persistSoon,
        confirm,
        cancel,
        markReviewed,
        applyMarginToAll
    }
}
