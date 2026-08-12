import '../models/cash.dart';

/// Picks the cashbox a POS sale should be posted against, or null when it
/// cannot be determined safely.
///
/// The backend attaches the sale's cash transaction to this cashbox, so a wrong
/// answer books money into another cashier's drawer. There is no device-to-till
/// binding in the app, so the only safe signal is an open session:
///
/// * exactly one cashbox has an open session — that is the till in use;
/// * several do — genuinely ambiguous, so stay unattributed rather than guess;
/// * none do — nothing to attach to.
///
/// [preferredCashboxId] wins when it is one of the cashboxes with an open
/// session, which is how an explicit assignment breaks the ambiguous case.
String? resolvePosCashboxId(
  List<CashboxSummary> cashboxes, {
  String? preferredCashboxId,
}) {
  final open = cashboxes
      .where((cashbox) => cashbox.openSession != null && cashbox.id.isNotEmpty)
      .toList();
  if (open.isEmpty) return null;

  final preferred = preferredCashboxId?.trim();
  if (preferred != null && preferred.isNotEmpty) {
    for (final cashbox in open) {
      if (cashbox.id == preferred) return cashbox.id;
    }
  }

  if (open.length == 1) return open.single.id;
  return null;
}
