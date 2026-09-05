/**
 * Machine-readable reasons behind a 409, for clients that have to decide what
 * to do next without parsing English.
 *
 * This matters most for the Flutter admin's durable outbox. It classifies every
 * failed write into "retry it", "the user must fix something", or "give up",
 * and a bare 409 gave it no way to tell those apart -- so all of them landed in
 * the sync recovery list, where a human is asked to review a write the queue
 * would have drained on its own.
 */

/**
 * Optimistic concurrency lost a race. Nothing is wrong with the request: some
 * other transaction moved the row between the read and the conditional write,
 * and sending the very same payload again is expected to succeed.
 *
 * Only for failures that are genuinely safe to replay unchanged. A real
 * conflict a human has to resolve -- a duplicate phone number, an illegal
 * status transition, stock that is actually gone -- must NOT carry this code.
 */
export const RETRY_CONFLICT = 'RETRY_CONFLICT'
