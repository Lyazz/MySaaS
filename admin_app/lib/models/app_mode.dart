enum AppMode { online, offlineOnly, hybrid }

extension AppModeX on AppMode {
  bool get skipsAuthentication => this == AppMode.offlineOnly;

  bool get allowsNetworkRequests => this != AppMode.offlineOnly;

  bool get supportsBackgroundSync => this == AppMode.hybrid;

  String get label => switch (this) {
    AppMode.online => 'Online',
    AppMode.offlineOnly => 'Local-only',
    AppMode.hybrid => 'Hybrid',
  };
}
