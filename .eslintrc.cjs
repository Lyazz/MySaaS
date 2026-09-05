/*
 * The `overrides` block below is half of the design-kit guardrail: it bans the
 * raw Tailwind palette classes on the admin surfaces, which are built from the
 * tokens and `.ui-*` components documented in docs/design-system.md.
 *
 * `vue/no-restricted-class` only takes plain class names, so the scale checks
 * that need patterns (one-off `text-[13px]` sizes, off-scale radii, static
 * inline styles) live in scripts/check-design-kit.mjs, run by `npm run lint`.
 *
 * Storefront templates are deliberately excluded — each theme owns its own
 * palette and type scale, and that is the product.
 */
const DESIGN_KIT_SCOPE = [
    "pages/admin/**/*.vue",
    "pages/super-admin/**/*.vue",
    "components/admin/**/*.vue",
    "components/super-admin/**/*.vue",
    "components/ui/**/*.vue",
    // Rendered only inside the admin shell (POS screen, cash drawer).
    "components/cash/**/*.vue",
    "components/pos/**/*.vue",
    "layouts/admin.vue",
    "layouts/super-admin.vue",
];

const NEUTRAL_FAMILIES = ["slate", "gray", "zinc", "neutral"];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Palette classes that bypass the light/dark token layer. */
const BANNED_CLASSES = [
    "text-white",
    "text-black",
    "bg-white",
    ...NEUTRAL_FAMILIES.flatMap((family) =>
        STEPS.flatMap((step) => [
            `text-${family}-${step}`,
            `bg-${family}-${step}`,
            `border-${family}-${step}`,
        ])
    ),
];

module.exports = {
    root: true,
    extends: ["@nuxt/eslint-config"],
    rules: {
        // Add specific rules here
    },
    overrides: [
        {
            files: DESIGN_KIT_SCOPE,
            rules: {
                "vue/no-restricted-class": ["error", ...BANNED_CLASSES],
            },
        },
    ],
};
