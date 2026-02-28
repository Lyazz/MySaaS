String normalizeApiBaseUrl(String input) {
  var raw = input.trim();
  if (raw.isEmpty) return '';
  if (RegExp(r'\s').hasMatch(raw)) return '';

  final lower = raw.toLowerCase();
  final hasScheme = lower.startsWith('http://') || lower.startsWith('https://');
  if (!hasScheme) {
    final defaultHttp =
        lower.contains('localhost') ||
        RegExp(r'^\d{1,3}(\.\d{1,3}){3}').hasMatch(lower);
    raw = '${defaultHttp ? 'http' : 'https'}://$raw';
  }

  Uri uri;
  try {
    uri = Uri.parse(raw);
  } catch (_) {
    return '';
  }

  final host = uri.host.trim();
  if (host.isEmpty) return '';

  final scheme = uri.scheme.isEmpty ? 'https' : uri.scheme;
  final portSegment = uri.hasPort ? ':${uri.port}' : '';
  return '$scheme://$host$portSegment/api';
}
