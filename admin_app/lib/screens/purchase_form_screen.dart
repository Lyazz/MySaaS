import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/purchases_provider.dart';
import '../providers/suppliers_provider.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';

class PurchaseFormScreen extends ConsumerStatefulWidget {
  const PurchaseFormScreen({super.key});

  @override
  ConsumerState<PurchaseFormScreen> createState() => _PurchaseFormScreenState();
}

class _PurchaseFormScreenState extends ConsumerState<PurchaseFormScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedSupplierId;
  String? _selectedSupplierName;
  bool _isLoading = false;

  Future<void> _createDraft() async {
    if (!_formKey.currentState!.validate() || _selectedSupplierId == null) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final purchase = await ref
          .read(purchasesProvider.notifier)
          .createDraftPurchase(_selectedSupplierId!, _selectedSupplierName!);

      if (mounted) {
        context.replace('/purchases/${purchase.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final suppliersState = ref.watch(suppliersProvider);
    final suppliers = suppliersState.suppliers;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Purchase Order'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 600),
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'New Purchase Order',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Select a supplier to start a new purchase order. You can add items later.',
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 32),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue[200]!),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              LucideIcons.info,
                              color: Colors.blue[800],
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'A draft purchase order will be created. You can add products and finalize details in the next step.',
                                style: TextStyle(
                                  color: Colors.blue[900],
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      FormSelect<String>(
                        label: 'Select Supplier',
                        value: _selectedSupplierId,
                        items: suppliers
                            .map(
                              (s) => DropdownMenuItem(
                                value: s.id,
                                child: Text(s.name),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() {
                            _selectedSupplierId = value;
                            _selectedSupplierName = suppliers
                                .firstWhere((s) => s.id == value)
                                .name;
                          });
                        },
                        validator: (v) => v == null ? 'Required' : null,
                      ),
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          AppButton.secondary(
                            label: 'Cancel',
                            onPressed: () => context.pop(),
                          ),
                          const SizedBox(width: 12),
                          AppButton.primary(
                            label: 'Create Draft',
                            onPressed: _selectedSupplierId == null
                                ? null
                                : _createDraft,
                            loading: _isLoading,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
