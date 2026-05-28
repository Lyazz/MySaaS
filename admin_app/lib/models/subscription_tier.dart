enum SubscriptionTier { offlineOnly, online }

extension SubscriptionTierX on SubscriptionTier {
  bool get unlocksHostedFeatures => this == SubscriptionTier.online;

  String get label => switch (this) {
    SubscriptionTier.offlineOnly => 'Offline-only',
    SubscriptionTier.online => 'Online',
  };
}
