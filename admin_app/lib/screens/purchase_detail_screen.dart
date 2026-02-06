import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/purchases_provider.dart';

class PurchaseDetailScreen extends ConsumerWidget {
  final String purchaseId;

  const PurchaseDetailScreen({super.key, required this.purchaseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final purchaseAsync = ref
        .read(purchasesProvider.notifier)
        .fetchPurchase(purchaseId);

    return FutureBuilder(
      future: purchaseAsync,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Purchase Not Found')),
            body: const Center(child: Text('Purchase not found')),
          );
        }

        final purchase = snapshot.data!;

        return Scaffold(
          appBar: AppBar(
            title: Text('Purchase #${purchase.id}'),
            leading: IconButton(
              icon: const Icon(LucideIcons.arrowLeft),
              onPressed: () => context.pop(),
            ),
          ),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoRow('Supplier', purchase.supplierName),
                const Divider(height: 32),
                _buildInfoRow(
                  'Date',
                  DateFormat.yMMMd().add_jm().format(purchase.createdAt),
                ),
                const Divider(height: 32),
                _buildInfoRow('Status', purchase.status),
                const Divider(height: 32),
                _buildInfoRow(
                  'Total Amount',
                  NumberFormat.simpleCurrency().format(purchase.totalAmount),
                ),
                const Divider(height: 32),
                if (purchase.notes != null) ...[
                  _buildInfoRow('Notes', purchase.notes!),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
