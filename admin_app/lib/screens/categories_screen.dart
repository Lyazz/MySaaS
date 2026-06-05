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
  Category? _categoryToDelete;
  bool _showDeleteModal = false;

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
    // We do local sorting in CategoryWorkspace so we don't necessarily need to refetch if not server paginated
  }

  void _toggleSortOrder() {
    setState(() {
      _sortOrder = _sortOrder == 'asc' ? 'desc' : 'asc';
    });
  }

  @override
  Widget build(BuildContext context) {
    final categoriesState = ref.watch(categoriesProvider);
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    final isMobile = MediaQuery.of(context).size.width < 800;

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
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 16 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!isMobile) ...[
                    _buildHeader(),
                    const SizedBox(height: 24),
                  ],
                  _buildToolbar(),
                  const SizedBox(height: 24),
                  if (categoriesState.isLoading)
                    const Center(
                        child: Padding(
                      padding: EdgeInsets.all(48.0),
                      child: CircularProgressIndicator(),
                    ))
                  else if (categoriesState.error != null)
                    Center(child: Text('Error: ${categoriesState.error}'))
                  else
                    CategoryWorkspace(
                      categories: categoriesState.categories,
                      searchQuery: _searchController.text,
                      sortBy: _sortBy,
                      sortOrder: _sortOrder,
                      onDeleteCategory: (category) {
                        setState(() {
                          _categoryToDelete = category;
                          _showDeleteModal = true;
                        });
                      },
                    ),
                ],
              ),
            ),
          ),
          if (_showDeleteModal) _buildDeleteModal(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    return Row(
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
                color: Theme.of(context).colorScheme.onSurface,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.categories.index.subtitle'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
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
    );
  }

  Widget _buildToolbar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: LayoutBuilder(builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final searchWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'admin.pages.categories.index.filters.searchLabel'.tr(),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
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
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
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
                InkWell(
                  onTap: _toggleSortOrder,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      border: Border.all(
                          color: Theme.of(context).colorScheme.outlineVariant),
                      borderRadius: BorderRadius.circular(8),
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                    child: Icon(
                      _sortOrder == 'asc'
                          ? LucideIcons.arrowUp
                          : LucideIcons.arrowDown,
                      size: 20,
                    ),
                  ),
                )
              ],
            ),
          ],
        );

        if (isMobile) {
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

  Future<void> _handleDelete() async {
    if (_categoryToDelete == null) return;

    final success = await ref
        .read(categoriesProvider.notifier)
        .deleteCategory(_categoryToDelete!.id);

    setState(() {
      _showDeleteModal = false;
      _categoryToDelete = null;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Category deleted successfully'
                : 'Failed to delete category',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  Widget _buildDeleteModal() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'admin.pages.categories.index.deleteModal.title'.tr(),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'admin.pages.categories.index.deleteModal.messageWithTitle'.tr(
                    namedArgs: {'title': _categoryToDelete?.title ?? ''}),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    label: 'admin.common.cancel'.tr(),
                    onPressed: () {
                      setState(() {
                        _showDeleteModal = false;
                        _categoryToDelete = null;
                      });
                    },
                  ),
                  const SizedBox(width: 12),
                  AppButton.danger(
                      label: 'admin.common.delete'.tr(),
                      onPressed: _handleDelete),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
