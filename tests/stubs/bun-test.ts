/**
 * Stub for `bun:test`.
 *
 * `@nuxt/test-utils` (v4) ships one `dist/e2e.mjs` for every runner, and its
 * Bun branch does a top-level-awaited `import("bun:test")`. Vite refuses to
 * bundle an unknown built-in, so every file importing `@nuxt/test-utils` failed
 * to load with "Cannot bundle built-in module" — twelve e2e suites in this repo,
 * none of which were running.
 *
 * `setupBun` is only reached when the runner is Bun, which it never is here, so
 * nothing below is ever called. The exports exist purely to give Vite a module
 * shape to resolve.
 */

const unreachable = (name: string) => () => {
    throw new Error(`bun:test.${name} was called under Vitest — this stub should never run`)
}

export const mock = unreachable('mock')
export const beforeAll = unreachable('beforeAll')
export const afterAll = unreachable('afterAll')
export const beforeEach = unreachable('beforeEach')
export const afterEach = unreachable('afterEach')
export const describe = unreachable('describe')
export const it = unreachable('it')
export const test = unreachable('test')
export const expect = unreachable('expect')

export default { mock, beforeAll, afterAll, beforeEach, afterEach, describe, it, test, expect }
