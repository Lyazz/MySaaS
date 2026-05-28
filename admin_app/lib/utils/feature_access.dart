import '../models/subscription_tier.dart';

enum OnlineTierFeature {
  billing,
  integrations,
  domains,
  appearance,
  homepage,
  legal,
  preview,
  builder,
  landingBuilder,
}

class FeatureAccessInfo {
  final OnlineTierFeature feature;
  final String title;
  final String description;

  const FeatureAccessInfo({
    required this.feature,
    required this.title,
    required this.description,
  });
}

class FeatureAccess {
  static const _featureInfo = <OnlineTierFeature, FeatureAccessInfo>{
    OnlineTierFeature.billing: FeatureAccessInfo(
      feature: OnlineTierFeature.billing,
      title: 'Billing & Subscription',
      description:
          'Billing and subscription management are available on online tiers only.',
    ),
    OnlineTierFeature.integrations: FeatureAccessInfo(
      feature: OnlineTierFeature.integrations,
      title: 'Cloud Integrations',
      description:
          'Cloud integrations require an online tier with remote services enabled.',
    ),
    OnlineTierFeature.domains: FeatureAccessInfo(
      feature: OnlineTierFeature.domains,
      title: 'Custom Domains',
      description:
          'Custom domains depend on the hosted storefront and require an online tier.',
    ),
    OnlineTierFeature.appearance: FeatureAccessInfo(
      feature: OnlineTierFeature.appearance,
      title: 'Storefront Appearance',
      description:
          'Storefront appearance controls apply to the hosted storefront and require an online tier.',
    ),
    OnlineTierFeature.homepage: FeatureAccessInfo(
      feature: OnlineTierFeature.homepage,
      title: 'Homepage Settings',
      description:
          'Homepage sections and carousel settings are storefront-managed and require an online tier.',
    ),
    OnlineTierFeature.legal: FeatureAccessInfo(
      feature: OnlineTierFeature.legal,
      title: 'Legal Pages',
      description:
          'Public legal pages belong to the hosted storefront and require an online tier.',
    ),
    OnlineTierFeature.preview: FeatureAccessInfo(
      feature: OnlineTierFeature.preview,
      title: 'Storefront Preview',
      description:
          'Previewing the hosted storefront requires an online tier storefront.',
    ),
    OnlineTierFeature.builder: FeatureAccessInfo(
      feature: OnlineTierFeature.builder,
      title: 'Template Builder',
      description:
          'The template builder is part of hosted storefront management and requires an online tier.',
    ),
    OnlineTierFeature.landingBuilder: FeatureAccessInfo(
      feature: OnlineTierFeature.landingBuilder,
      title: 'Landing Page Builder',
      description:
          'The landing page builder is available on online tiers only.',
    ),
  };

  static bool isLockedForTier(
    SubscriptionTier subscriptionTier,
    OnlineTierFeature feature,
  ) {
    switch (feature) {
      case OnlineTierFeature.billing:
      case OnlineTierFeature.integrations:
      case OnlineTierFeature.domains:
      case OnlineTierFeature.appearance:
      case OnlineTierFeature.homepage:
      case OnlineTierFeature.legal:
      case OnlineTierFeature.preview:
      case OnlineTierFeature.builder:
      case OnlineTierFeature.landingBuilder:
        return subscriptionTier != SubscriptionTier.online;
    }
  }

  static FeatureAccessInfo infoFor(OnlineTierFeature feature) =>
      _featureInfo[feature]!;

  static OnlineTierFeature? fromName(String raw) {
    final normalized = raw.trim();
    for (final feature in OnlineTierFeature.values) {
      if (feature.name == normalized) return feature;
    }
    return null;
  }

  static OnlineTierFeature? featureForRoute(String path) {
    if (path == '/billing') return OnlineTierFeature.billing;
    if (path == '/integrations') return OnlineTierFeature.integrations;
    if (path == '/settings/appearance') return OnlineTierFeature.appearance;
    if (path == '/settings/homepage') return OnlineTierFeature.homepage;
    if (path == '/settings/legal') return OnlineTierFeature.legal;
    if (path == '/settings/domains') return OnlineTierFeature.domains;
    if (path == '/storefront/preview') return OnlineTierFeature.preview;
    if (path == '/storefront/builder') return OnlineTierFeature.builder;
    if (path == '/storefront/landing-builder') {
      return OnlineTierFeature.landingBuilder;
    }
    return null;
  }
}
