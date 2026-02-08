import 'package:flutter_riverpod/flutter_riverpod.dart';

class SidebarNotifier extends Notifier<bool> {
  @override
  bool build() {
    return false; // Default to expanded
  }

  void toggle() {
    state = !state;
  }

  void setCollapsed(bool value) {
    state = value;
  }
}

final sidebarProvider = NotifierProvider<SidebarNotifier, bool>(
  SidebarNotifier.new,
);
