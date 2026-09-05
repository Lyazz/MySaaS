# Tickets

Each ticket is designed for a single AI agent.

## Rules
- Implement only what the ticket requests
- Add tests
- Update docs if needed
- Never break tenant isolation

Start with: `M0-setup`, then `A1`, `A2`, then storefront + commerce.

## E1 — Device licensing, trial, migration
`E1-device-licensing-trial-migration.md` is larger than one agent's scope. It is split
into 38 numbered steps across 4 phases; each step is one self-contained commit.
Take one phase at a time and respect the ordering constraints listed at the end —
three of them will silently lock real tenants out if skipped.
