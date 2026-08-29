/**
 * Bridges the two sibling components on a product page: the order form owns the
 * "Buy" / "Add to cart" buttons, but the option pickers live in the details
 * component. When a shopper tries to buy a variant product without choosing its
 * options, the form calls `invite()` and the details component replays an
 * attention animation on the unchosen pickers.
 *
 * Backed by `useState` so the counter is shared within a request (and reset
 * between requests) rather than leaking across SSR renders.
 */
export function useVariantSelectionInvite() {
  const inviteTick = useState('vux-variant-invite-tick', () => 0)
  return {
    /** Bumped each time the shopper needs nudging toward the option pickers. */
    inviteTick,
    invite: () => { inviteTick.value++ },
  }
}
