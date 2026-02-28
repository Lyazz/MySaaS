import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class _TestFileAssetLoader extends AssetLoader {
  const _TestFileAssetLoader();

  static final Map<String, Map<String, dynamic>> _cache = {};

  static Map<String, dynamic> _flatten(Map<String, dynamic> input) {
    final out = <String, dynamic>{};

    void walk(Object? node, String prefix) {
      if (node is Map) {
        for (final entry in node.entries) {
          final k = entry.key.toString();
          final next = prefix.isEmpty ? k : '$prefix.$k';
          walk(entry.value, next);
        }
        return;
      }

      if (prefix.isNotEmpty) out[prefix] = node;
    }

    walk(input, '');
    return out;
  }

  static File? _resolveFile(String path, String languageCode) {
    final direct = File('$path/$languageCode.json');
    if (direct.existsSync()) return direct;

    final nested = File('admin_app/$path/$languageCode.json');
    if (nested.existsSync()) return nested;

    return null;
  }

  @override
  Future<Map<String, dynamic>> load(String path, Locale locale) {
    final key = locale.languageCode;
    final cached = _cache[key];
    if (cached != null) return Future.value(cached);

    final file = _resolveFile(path, key);
    if (file == null) {
      return Future.value({});
    }

    final raw = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    final data = _flatten(raw);
    _cache[key] = data;
    return Future.value(data);
  }
}

Widget buildLocalizedTestApp({
  Widget? home,
  RouterConfig<Object>? routerConfig,
  Locale startLocale = const Locale('en'),
}) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('fr'), Locale('ar')],
    path: 'assets/translations',
    assetLoader: const _TestFileAssetLoader(),
    fallbackLocale: const Locale('en'),
    startLocale: startLocale,
    useOnlyLangCode: true,
    saveLocale: false,
    child: Builder(
      builder: (context) {
        if (routerConfig != null) {
          return MaterialApp.router(
            routerConfig: routerConfig,
            locale: context.locale,
            supportedLocales: context.supportedLocales,
            localizationsDelegates: context.localizationDelegates,
          );
        }

        return MaterialApp(
          home: home,
          locale: context.locale,
          supportedLocales: context.supportedLocales,
          localizationsDelegates: context.localizationDelegates,
        );
      },
    ),
  );
}
