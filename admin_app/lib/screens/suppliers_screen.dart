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
import '../widgets/buttons/table_action_button.dart';
import '../theme/app_theme.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

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
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/suppliers/create'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Icon(
                LucideIcons.plus,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
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
                          color: textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'admin.pages.suppliers.index.subtitle'.tr(),
                        style: TextStyle(color: textMuted, fontSize: 14),
                      ),
                    ],
                  ),
                  AppButton.primary(
                    label: 'app.admin_pages_suppliers_index_ad'.tr().tr(),
                    icon: LucideIcons.plus,
                    onPressed: () => context.go('/suppliers/create'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            ResponsiveFilterBar(
              searchField: FormInput(
                label: 'app.admin_pages_suppliers_index_fi'.tr().tr(),
                controller: _searchController,
                hint: 'admin.pages.suppliers.index.filters.searchPlaceholder'
                    .tr(),
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
                  child: FormSelect<String>(showLabel: false, 
                    label: 'admin.pages.pos.catalog.actions.sort'.tr(),
                    value: _sortBy,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    items: [
                      DropdownMenuItem(
                        value: 'name_asc',
                        child: Text( 'app.name_a_z'.tr()),
                      ),
                      DropdownMenuItem(
                        value: 'name_desc',
                        child: Text( 'app.name_z_a'.tr()),
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
                  : _buildSuppliersTable(filteredSuppliers, isDark: isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuppliersTable(
    List<Supplier> suppliers, {
    required bool isDark,
  }) {
    final headerTextColor = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final primaryTextColor = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final secondaryTextColor = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final mutedTextColor = isDark
        ? AppColors.textMuted
        : AppColors.lightTextMuted;
    final avatarBgColor = isDark
        ? AppColors.greenSurface
        : const Color(0xFFECFDF5);
    final avatarTextColor = isDark ? AppColors.greenText : AppColors.green;

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
                color: headerTextColor,
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
                color: headerTextColor,
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
                color: headerTextColor,
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
                color: headerTextColor,
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
                        color: avatarBgColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        supplier.name.isNotEmpty
                            ? supplier.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: avatarTextColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        supplier.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: primaryTextColor,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
                            Icon(
                              LucideIcons.mail,
                              size: 12,
                              color: mutedTextColor,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                supplier.email!,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: secondaryTextColor,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (supplier.phone != null)
                      Row(
                        children: [
                          Icon(
                            LucideIcons.phone,
                            size: 12,
                            color: mutedTextColor,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              supplier.phone!,
                              style: TextStyle(
                                fontSize: 13,
                                color: secondaryTextColor,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
                  style: TextStyle(fontSize: 13, color: mutedTextColor),
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
                      TableActionButton(
                        tooltip: 'admin.common.edit'.tr(),
                        icon: LucideIcons.pencil,
                        onPressed: () =>
                            context.go('/suppliers/${supplier.id}'),
                      ),
                      TableActionButton(
                        tooltip: 'admin.common.delete'.tr(),
                        icon: LucideIcons.trash2,
                        isDanger: true,
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
        title: 'app.admin_pages_suppliers_index_de'.tr().tr(),
        description: 'app.admin_pages_suppliers_index_de2'.tr()
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
