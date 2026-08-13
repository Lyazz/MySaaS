import 'dart:math' as math;

/// Minimum comfortable tile width for the POS catalog grid.
///
/// Mobile keeps a larger floor: tiles are touch targets there, and the mobile
/// card draws a bigger image and price block than the desktop one.
const double kPosMinTileWidthMobile = 154;
const double kPosMinTileWidthDesktop = 132;

/// Below this the catalog always drops to a single column — two tiles simply
/// cannot be read side by side.
const double kPosSingleColumnWidth = 360;

/// Hard ceiling on catalog columns, matching the density control's range.
const int kPosMaxColumns = 8;

/// Resolves how many columns the POS catalog grid should draw.
///
/// [preferred] is the cashier's saved density. It is honoured as an *upper*
/// bound rather than an absolute: a density that would squeeze tiles below the
/// readable minimum for [width] is reduced to what actually fits, and a density
/// the viewport could exceed is not inflated past what the cashier asked for.
int posAdaptiveGridColumns({
  required double width,
  required bool isMobile,
  required int preferred,
}) {
  if (width < kPosSingleColumnWidth) return 1;

  final minTileWidth = isMobile
      ? kPosMinTileWidthMobile
      : kPosMinTileWidthDesktop;
  final maxByWidth = (width / minTileWidth).floor().clamp(1, kPosMaxColumns);

  if (isMobile) {
    // Phones land on one or two columns via [maxByWidth]; large phones and
    // small tablets that genuinely fit more are no longer pinned at two.
    return preferred.clamp(1, maxByWidth);
  }

  // Desktop and tablet follow the cashier's density, but never past the point
  // where tiles stop being readable — an 8-column setting on a 700px window
  // would otherwise draw ~70px tiles.
  final desktopFloor = math.min(2, maxByWidth);
  return preferred.clamp(desktopFloor, maxByWidth);
}
