import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../services/api_service.dart';

class _ChecklistItem {
  final String id;
  final String label;
  final bool done;

  const _ChecklistItem({
    required this.id,
    required this.label,
    required this.done,
  });

  factory _ChecklistItem.fromJson(Map<String, dynamic> j) => _ChecklistItem(
        id: j['id']?.toString() ?? '',
        label: j['label']?.toString() ?? '',
        done: j['done'] == true,
      );
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  bool _loading = true;
  List<_ChecklistItem> _items = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiProvider);
      final res = await api.client
          .get('/admin/store-settings/onboarding-checklist');
      final raw = res.data;
      final list = raw is List
          ? raw
          : (raw is Map && raw['items'] is List ? raw['items'] : []);
      setState(() {
        _items = list
            .whereType<Map>()
            .map((e) => _ChecklistItem.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final done = _items.where((i) => i.done).length;
    final total = _items.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Setup Checklist')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Failed to load: $_error'),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _load,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (total > 0) ...[
                        Row(
                          children: [
                            const Text(
                              'Progress: ',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text('$done / $total steps completed'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: done / total,
                            minHeight: 8,
                            backgroundColor: const Color(0xFFE2E8F0),
                            color: const Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                      ..._items.map(
                        (item) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: item.done
                                  ? const Color(0xFF6EE7B7)
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                item.done
                                    ? LucideIcons.checkCircle
                                    : LucideIcons.circle,
                                color: item.done
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFCBD5E1),
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  item.label,
                                  style: TextStyle(
                                    decoration: item.done
                                        ? TextDecoration.lineThrough
                                        : null,
                                    color: item.done
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
