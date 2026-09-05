import '../models/subscription_tier.dart';
import 'package:easy_localization/easy_localization.dart';

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

  FeatureAccessInfo({
    required this.feature,
    required this.title,
    required this.description,
  });
}

class FeatureAccess {
  static final _featureInfo = <OnlineTierFeature, FeatureAccessInfo>{
    OnlineTierFeature.billing: FeatureAccessInfo(
      feature: OnlineTierFeature.billing,
      title: 'app.billing_subscription'.tr(),
      description: 'app.billing_and_subscription_manag'.tr(),
    ),
    OnlineTierFeature.integrations: FeatureAccessInfo(
      feature: OnlineTierFeature.integrations,
      title: 'app.cloud_integrations'.tr(),
      description: 'app.cloud_integrations_require_an'.tr(),
    ),
    OnlineTierFeature.domains: FeatureAccessInfo(
      feature: OnlineTierFeature.domains,
      title: 'app.custom_domains'.tr(),
      description: 'app.custom_domains_depend_on_the_h'.tr(),
    ),
    OnlineTierFeature.appearance: FeatureAccessInfo(
      feature: OnlineTierFeature.appearance,
      title: 'app.storefront_appearance'.tr(),
      description: 'app.storefront_appearance_controls'.tr(),
    ),
    OnlineTierFeature.homepage: FeatureAccessInfo(
      feature: OnlineTierFeature.homepage,
      title: 'admin.pages.settings.homepage.title'.tr(),
      description: 'app.homepage_sections_and_carousel'.tr(),
    ),
    OnlineTierFeature.legal: FeatureAccessInfo(
      feature: OnlineTierFeature.legal,
      title: 'admin.settingsHub.links.legal'.tr(),
      description: 'app.public_legal_pages_belong_to_t'.tr(),
    ),
    OnlineTierFeature.preview: FeatureAccessInfo(
      feature: OnlineTierFeature.preview,
      title: 'app.storefront_preview'.tr(),
      description: 'app.previewing_the_hosted_storefro'.tr(),
    ),
    OnlineTierFeature.builder: FeatureAccessInfo(
      feature: OnlineTierFeature.builder,
      title: 'app.template_builder'.tr(),
      description: 'app.the_template_builder_is_part_o'.tr(),
    ),
    OnlineTierFeature.landingBuilder: FeatureAccessInfo(
      feature: OnlineTierFeature.landingBuilder,
      title: 'app.landing_page_builder'.tr(),
      description: 'app.the_landing_page_builder_is_av'.tr(),
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
