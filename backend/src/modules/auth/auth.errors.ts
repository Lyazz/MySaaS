/**
 * The error every auth-surface service throws.
 *
 * It lives in its own file rather than in `auth.service.ts` because the
 * verification and password-reset services throw it too, and `auth.service`
 * imports *them* — sharing the class through the service module would be an
 * import cycle that resolves to `undefined` at runtime on whichever side loads
 * first, turning every `instanceof` check in the controller into a 500.
 */
export class AuthServiceError extends Error {
    constructor(
        public statusCode: number,
        public statusMessage: string,
        /** Stable machine-readable reason, e.g. DEVICE_LIMIT_REACHED. */
        public code?: string,
        /** Extra fields merged into the response body, e.g. canRequestAccess. */
        public details?: Record<string, unknown>
    ) {
        super(statusMessage)
    }
}
