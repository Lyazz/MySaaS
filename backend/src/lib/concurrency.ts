/**
 * Runs `worker` over `items` with at most `concurrency` in flight at once, preserving
 * the input order in the returned results array. Used to parallelize independent I/O
 * (image fetches/uploads) without hammering storage with hundreds of simultaneous requests.
 */
export const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
    const results: R[] = new Array(items.length)
    let cursor = 0

    const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
        while (cursor < items.length) {
            const index = cursor++
            results[index] = await worker(items[index]!, index)
        }
    })

    await Promise.all(runners)
    return results
}
