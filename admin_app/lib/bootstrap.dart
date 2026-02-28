import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/bootstrap_config.dart';

final bootstrapProvider = Provider<BootstrapConfig>(
  (ref) => const BootstrapConfig(apiBaseUrl: 'http://localhost:3000/api'),
);
