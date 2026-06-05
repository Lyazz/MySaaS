import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/app_mode.dart';
import '../models/product.dart';
import '../providers/auth_provider.dart';
import '../providers/categories_provider.dart';
import '../theme/app_theme.dart';
import '../utils/debouncer.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/category_workspace.dart';

class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});

  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  String _sortBy = 'createdAt';
  String _sortOrder = 'desc';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(categoriesProvider.notifier)
          .fetchCategories(sortBy: _sortBy, sortOrder: _sortOrder);
    });
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _setSort(String field) {
    setState(() {
      _sortBy = field;
    });
  }

  void _toggleSortOrder() {
    setState(() {
      _sortOrder = _sortOrder == 'asc' ? 'desc' : 'asc';
    });
  }

  Future<void> _confirmDelete(Category category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black54,
      builder: (context) => _DeleteDialog(category: category),
    );

    if (confirmed == true && mounted) {
      final success = await ref
          .read(categoriesProvider.notifier)
          .deleteCategory(category.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? 'admin.pages.categories.index.deleteModal.success'.tr()
                  : 'admin.pages.categories.index.deleteModal.error'.tr(),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesState = ref.watch(categoriesProvider);
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    final isMobile = MediaQuery.of(context).size.width < 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Scaffold(
      floatingActionButton: (isMobile && !isOfflineTenant)
          ? FloatingActionButton(
              onPressed: () => context.go('/categories/create'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Icon(
                LucideIcons.plus,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
            )
          : null,
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(isMobile ? 16 : 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header (desktop only) ──────────────────────────────────
              if (!isMobile) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'admin.pages.categories.index.title'.tr(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'admin.pages.categories.index.subtitle'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                    if (!isOfflineTenant)
                      AppButton.primary(
                        label: 'admin.pages.categories.index.addCategory'.tr(),
                        icon: LucideIcons.plus,
                        onPressed: () => context.go('/categories/create'),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
              ],

              // ── Filter toolbar ─────────────────────────────────────────
              _buildToolbar(isDark),
              const SizedBox(height: 24),

              // ── Content area ───────────────────────────────────────────
              if (categoriesState.isLoading)
                _buildLoadingState(isDark)
              else if (categoriesState.error != null)
                _buildErrorState(categoriesState.error!, isDark)
              else
                CategoryWorkspace(
                  categories: categoriesState.categories,
                  searchQuery: _searchController.text,
                  sortBy: _sortBy,
                  sortOrder: _sortOrder,
                  onDeleteCategory: _confirmDelete,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    final brand = Theme.of(context).colorScheme.primary;
    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(48),
      child: Center(
        child: Column(
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(brand),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'admin.pages.categories.index.loading'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDark ? AppColors.textSecondary : AppColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error, bool isDark) {
    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(48),
      child: Center(
        child: Text(
          'Error: $error',
          style: TextStyle(
            color: AppColors.red,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildToolbar(bool isDark) {
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(16),
      child: LayoutBuilder(builder: (context, constraints) {
        final isMobileLayout = constraints.maxWidth < 600;

        final searchWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'admin.pages.categories.index.filters.searchLabel'.tr(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            FormInput(
              label: '',
              controller: _searchController,
              hint: 'admin.pages.categories.index.filters.searchPlaceholder'.tr(),
              onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
            ),
          ],
        );

        final sortWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'admin.pages.categories.index.sort.sortBy'.tr(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: FormSelect<String>(
                    label: '',
                    value: _sortBy,
                    items: [
                      DropdownMenuItem(
                          value: 'createdAt',
                          child: Text('admin.pages.categories.index.sort.newest'.tr())),
                      DropdownMenuItem(
                          value: 'title',
                          child: Text('admin.pages.categories.index.sort.title'.tr())),
                      DropdownMenuItem(
                          value: 'slug',
                          child: Text('admin.pages.categories.index.sort.slug'.tr())),
                      DropdownMenuItem(
                          value: 'products',
                          child: Text('admin.pages.categories.index.sort.products'.tr())),
                    ],
                    onChanged: (value) {
                      if (value != null) _setSort(value);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                // Sort order toggle
                Tooltip(
                  message: _sortOrder == 'asc'
                      ? 'admin.common.next'.tr()
                      : 'admin.common.previous'.tr(),
                  child: InkWell(
                    onTap: _toggleSortOrder,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        border: Border.all(color: surfaceBorder),
                        borderRadius: BorderRadius.circular(8),
                        color: surface2,
                      ),
                      child: Icon(
                        _sortOrder == 'asc'
                            ? LucideIcons.arrowUp
                            : LucideIcons.arrowDown,
                        size: 16,
                        color: textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        );

        if (isMobileLayout) {
          return Column(
            children: [
              searchWidget,
              const SizedBox(height: 16),
              sortWidget,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(flex: 2, child: searchWidget),
            const SizedBox(width: 16),
            Expanded(flex: 1, child: sortWidget),
          ],
        );
      }),
    );
  }
}

// ── Delete confirmation dialog ─────────────────────────────────────────────
class _DeleteDialog extends StatelessWidget {
  final Category category;

  const _DeleteDialog({required this.category});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon + title row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(LucideIcons.alertTriangle, size: 20, color: AppColors.red),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'admin.pages.categories.index.deleteModal.title'.tr(),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'admin.pages.categories.index.deleteModal.messageWithTitle'.tr(
                    namedArgs: {'title': category.title}),
                style: TextStyle(
                  fontSize: 14,
                  color: textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    label: 'admin.common.cancel'.tr(),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                  const SizedBox(width: 8),
                  AppButton.danger(
                    label: 'admin.common.delete'.tr(),
                    onPressed: () => Navigator.of(context).pop(true),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared ui-card surface ─────────────────────────────────────────────────
class _UiCard extends StatelessWidget {
  final bool isDark;
  final Widget child;
  final EdgeInsets padding;

  const _UiCard({
    required this.isDark,
    required this.child,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}
