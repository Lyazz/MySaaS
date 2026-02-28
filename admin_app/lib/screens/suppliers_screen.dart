import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/suppliers_provider.dart';
import '../models/supplier.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/buttons/app_button.dart';

class SuppliersScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const SuppliersScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends ConsumerState<SuppliersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  String _sortBy = 'name_asc';

  @override
  void initState() {
    super.initState();
    if (widget.autoFetch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(suppliersProvider.notifier).fetchSuppliers();
      });
    }
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final suppliersState = ref.watch(suppliersProvider);
    final suppliers = suppliersState.suppliers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    final query = _searchController.text.trim().toLowerCase();
    final filteredSuppliers = query.isEmpty
        ? List<Supplier>.of(suppliers)
        : suppliers.where((supplier) {
            final name = supplier.name.toLowerCase();
            final email = (supplier.email ?? '').toLowerCase();
            final phone = (supplier.phone ?? '').toLowerCase();
            return name.contains(query) ||
                (email.isNotEmpty && email.contains(query)) ||
                (phone.isNotEmpty && phone.contains(query));
          }).toList();

    filteredSuppliers.sort((a, b) {
      final cmp = a.name.toLowerCase().compareTo(b.name.toLowerCase());
      return _sortBy == 'name_desc' ? -cmp : cmp;
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/suppliers/create'),
              backgroundColor: const Color(0xFF0F172A),
              child: const Icon(LucideIcons.plus, color: Colors.white),
            )
          : null,
      body: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMobile) ...[
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'admin.pages.suppliers.index.title'.tr(),
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF111827), // Gray-900
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'admin.pages.suppliers.index.subtitle'.tr(),
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 14,
                        ), // Gray-500
                      ),
                    ],
                  ),
                  AppButton.primary(
                    label: 'admin.pages.suppliers.index.addSupplier'.tr(),
                    icon: LucideIcons.plus,
                    onPressed: () => context.go('/suppliers/create'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            ResponsiveFilterBar(
              searchField: FormInput(
                label: 'admin.pages.suppliers.index.filters.searchLabel'.tr(),
                controller: _searchController,
                hint: 'admin.pages.suppliers.index.filters.searchPlaceholder'.tr(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                onChanged: (value) =>
                    _searchDebouncer.run(() => setState(() {})),
              ),
              filters: [
                SizedBox(
                  width: 200,
                  child: FormSelect<String>(
                    label: 'Sort',
                    value: _sortBy,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'name_asc',
                        child: Text('Name A-Z'),
                      ),
                      DropdownMenuItem(
                        value: 'name_desc',
                        child: Text('Name Z-A'),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() => _sortBy = value ?? 'name_asc');
                    },
                  ),
                ),
              ],
              onClearFilters: () {
                setState(() {
                  _searchController.clear();
                  _sortBy = 'name_asc';
                });
              },
            ),
            const SizedBox(height: 24),
            Expanded(
              child: suppliersState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildSuppliersTable(filteredSuppliers),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuppliersTable(List<Supplier> suppliers) {
    return ResponsivePaginatedTable<Supplier>(
      items: suppliers,
      minWidth: 900,
      header: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              'admin.pages.suppliers.index.table.name'.tr().toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              'admin.pages.suppliers.index.table.info'.tr().toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              'admin.pages.suppliers.index.table.address'.tr().toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          SizedBox(
            width: 220,
            child: Text(
              'admin.common.actions'.tr().toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
      rowBuilder: (context, supplier, index) {
        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
            vertical: 16,
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5), // Emerald-50
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        supplier.name.isNotEmpty
                            ? supplier.name[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF10B981), // Emerald-500
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      supplier.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827), // Gray-900
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (supplier.email != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            const Icon(
                              LucideIcons.mail,
                              size: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              supplier.email!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF4B5563), // Gray-600
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (supplier.phone != null)
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.phone,
                            size: 12,
                            color: Color(0xFF9CA3AF),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            supplier.phone!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563), // Gray-600
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  supplier.address ?? '-',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(
                width: 220,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.end,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      AppButton.secondary(
                        label: 'admin.common.edit'.tr(),
                        icon: LucideIcons.pencil,
                        size: AppButtonSize.sm,
                        onPressed: () => context.go('/suppliers/${supplier.id}'),
                      ),
                      AppButton.danger(
                        label: 'admin.common.delete'.tr(),
                        icon: LucideIcons.trash2,
                        size: AppButtonSize.sm,
                        onPressed: () => _confirmDelete(supplier),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmDelete(Supplier supplier) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AppDialog(
        title: 'admin.pages.suppliers.index.deleteModal.title'.tr(),
        description: 'admin.pages.suppliers.index.deleteModal.messageWithName'
            .tr(namedArgs: {'name': supplier.name}),
        content: Text(supplier.name),
        secondaryLabel: 'admin.common.cancel'.tr(),
        onSecondary: () => Navigator.pop(context, false),
        primaryLabel: 'admin.common.delete'.tr(),
        primaryVariant: AppDialogPrimaryVariant.destructive,
        onPrimary: () => Navigator.pop(context, true),
      ),
    );

    if (confirmed == true) {
      await ref.read(suppliersProvider.notifier).deleteSupplier(supplier.id);
    }
  }
}
