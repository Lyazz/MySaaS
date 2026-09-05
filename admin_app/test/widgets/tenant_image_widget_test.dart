import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:admin_app/services/workspace_file_service.dart';
import 'package:admin_app/widgets/offline_image_widget.dart';
import 'package:admin_app/widgets/tenant_image_widget.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');
  late Directory appDocsDir;

  setUpAll(() async {
    appDocsDir = await Directory.systemTemp.createTemp('tenant-image-widget');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, (call) async {
          if (call.method == 'getApplicationDocumentsDirectory') {
            return appDocsDir.path;
          }
          if (call.method == 'getTemporaryDirectory') {
            return appDocsDir.path;
          }
          return appDocsDir.path;
        });
  });

  setUp(() async {
    await _clearDirectory(appDocsDir);
    TenantModeService().initialize(
      mode: AppMode.offlineOnly,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );

    final imageDir = Directory(
      p.join(
        appDocsDir.path,
        WorkspaceFileService.workspaceRootDirName,
        TenantModeService().activeNamespaceKey,
        WorkspaceFileService.imagesDirName,
      ),
    )..createSync(recursive: true);
    await File(p.join(imageDir.path, 'local.png')).writeAsBytes(_pngBytes);
  });

  tearDownAll(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, null);
    await appDocsDir.delete(recursive: true);
  });

  testWidgets('keeps local workspace image paths unchanged', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiProvider.overrideWith(
            (ref) => ApiService(baseUrl: 'http://localhost:3000/api'),
          ),
        ],
        child: const Directionality(
          textDirection: TextDirection.ltr,
          child: TenantImageWidget(imagePath: 'images/local.png'),
        ),
      ),
    );
    await tester.pump();

    final offlineWidget = tester.widget<OfflineImageWidget>(
      find.byType(OfflineImageWidget),
    );
    expect(offlineWidget.imagePath, 'images/local.png');
  });

  testWidgets('resolves relative remote image paths against the api origin', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiProvider.overrideWith(
            (ref) => ApiService(baseUrl: 'http://localhost:3000/api'),
          ),
        ],
        child: const Directionality(
          textDirection: TextDirection.ltr,
          child: TenantImageWidget(imagePath: '/uploads/item.png'),
        ),
      ),
    );
    await tester.pump();

    final offlineWidget = tester.widget<OfflineImageWidget>(
      find.byType(OfflineImageWidget),
    );
    expect(offlineWidget.imagePath, 'http://localhost:3000/uploads/item.png');
  });
}

Future<void> _clearDirectory(Directory directory) async {
  if (!directory.existsSync()) {
    await directory.create(recursive: true);
    return;
  }

  for (final entity in directory.listSync()) {
    await entity.delete(recursive: true);
  }
}

final _pngBytes = <int>[
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  0,
  0,
  0,
  13,
  73,
  72,
  68,
  82,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  8,
  4,
  0,
  0,
  0,
  181,
  28,
  12,
  2,
  0,
  0,
  0,
  11,
  73,
  68,
  65,
  84,
  120,
  218,
  99,
  252,
  255,
  31,
  0,
  3,
  3,
  2,
  0,
  238,
  217,
  210,
  234,
  0,
  0,
  0,
  0,
  73,
  69,
  78,
  68,
  174,
  66,
  96,
  130,
];
