/// Normalization for Algerian mobile numbers.
///
/// Mirrors `backend/src/modules/loyalty/phone-normalization.service.ts` so the
/// app rejects the same numbers the API would reject, and sends the API a value
/// it already understands (`213XXXXXXXXX`).
class AlgerianPhone {
  const AlgerianPhone._();

  static final RegExp _local = RegExp(r'^0[567]\d{8}$');
  static final RegExp _bare = RegExp(r'^[567]\d{8}$');
  static final RegExp _international = RegExp(r'^213[567]\d{8}$');
  static final RegExp _internationalPrefixed = RegExp(r'^00213[567]\d{8}$');

  /// Returns the number as `213XXXXXXXXX`, or `null` when it is not a valid
  /// Algerian mobile number.
  static String? tryNormalize(String? input) {
    if (input == null) return null;
    final digits = input.replaceAll(RegExp(r'\D'), '');

    if (_local.hasMatch(digits)) return '213${digits.substring(1)}';
    if (_bare.hasMatch(digits)) return '213$digits';
    if (_international.hasMatch(digits)) return digits;
    if (_internationalPrefixed.hasMatch(digits)) return digits.substring(2);

    return null;
  }

  static bool isValid(String? input) => tryNormalize(input) != null;
}
