import 'dart:async';

import 'package:connectivity_plus_platform_interface/connectivity_plus_platform_interface.dart';

/// Stands in for the `connectivity_plus` plugin, which has no implementation in
/// a plain `flutter test` process — any repository that consults
/// `SyncService.isOnline` throws `MissingPluginException` without it.
///
/// Defaults to offline so a test that only cares about local persistence never
/// reaches for the network.
class FakeConnectivityPlatform extends ConnectivityPlatform {
  final _controller = StreamController<List<ConnectivityResult>>.broadcast();
  List<ConnectivityResult> _results = const [ConnectivityResult.none];

  void setResults(List<ConnectivityResult> results, {bool emit = true}) {
    _results = results;
    if (emit) _controller.add(results);
  }

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async => _results;

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      _controller.stream;

  void dispose() => _controller.close();
}

/// Installs [FakeConnectivityPlatform] and returns a callback that restores the
/// platform that was there before. Call it from `setUpAll`/`tearDownAll`.
({FakeConnectivityPlatform fake, void Function() restore})
installFakeConnectivity() {
  final original = ConnectivityPlatform.instance;
  final fake = FakeConnectivityPlatform();
  ConnectivityPlatform.instance = fake;
  return (
    fake: fake,
    restore: () {
      ConnectivityPlatform.instance = original;
      fake.dispose();
    },
  );
}
