import 'package:flutter/services.dart';

class BarcodeScannerBuffer {
  final Duration interKeyTimeout;
  final Duration maxScanDuration;
  final int minLength;
  final int consumeAfter;

  String _buffer = '';
  DateTime? _startedAt;
  DateTime? _lastKeyAt;

  BarcodeScannerBuffer({
    this.interKeyTimeout = const Duration(milliseconds: 80),
    this.maxScanDuration = const Duration(milliseconds: 900),
    this.minLength = 3,
    this.consumeAfter = 2,
  });

  bool get hasPending => _buffer.isNotEmpty;

  String get pending => _buffer;

  void reset() {
    _buffer = '';
    _startedAt = null;
    _lastKeyAt = null;
  }

  bool addCharacter(String char, DateTime now) {
    if (char.isEmpty) return false;

    final lastKeyAt = _lastKeyAt;
    if (lastKeyAt != null && now.difference(lastKeyAt) > interKeyTimeout) {
      reset();
    }

    _startedAt ??= now;
    _lastKeyAt = now;
    _buffer += char;

    return _isProbablyScannerInput(now);
  }

  String? submit(DateTime now) {
    if (_buffer.isEmpty) return null;

    if (!_isValidScan(now)) {
      reset();
      return null;
    }

    final code = _buffer;
    reset();
    return code;
  }

  bool _isProbablyScannerInput(DateTime now) {
    final startedAt = _startedAt;
    if (startedAt == null) return false;
    if (_buffer.length < consumeAfter) return false;
    if (now.difference(startedAt) > maxScanDuration) return false;
    return true;
  }

  bool _isValidScan(DateTime now) {
    final startedAt = _startedAt;
    if (startedAt == null) return false;
    if (_buffer.length < minLength) return false;
    if (now.difference(startedAt) > maxScanDuration) return false;
    return true;
  }
}

bool isEnterKeyEvent(KeyEvent event) {
  if (event is! KeyDownEvent) return false;
  final key = event.logicalKey;
  return key == LogicalKeyboardKey.enter ||
      key == LogicalKeyboardKey.numpadEnter;
}

String? printableCharacterFromKeyEvent(KeyEvent event) {
  if (event is! KeyDownEvent) return null;

  final raw = event.character;
  final ch = (raw == null || raw.isEmpty) ? event.logicalKey.keyLabel : raw;
  if (ch.isEmpty) return null;

  if (ch == '\n' || ch == '\r' || ch == '\t') return null;
  if (ch.length != 1) return null;

  final codeUnit = ch.codeUnitAt(0);
  if (codeUnit < 0x20) return null; // Control chars

  return ch;
}
