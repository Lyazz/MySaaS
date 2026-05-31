import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'form/form_select.dart';
import 'package:easy_localization/easy_localization.dart';
import '../theme/app_theme.dart';

class ResponsivePaginatedTable<T> extends StatefulWidget {
  final List<T> items;
  final Widget header;
  final Widget Function(BuildContext context, T item, int index) rowBuilder;
  final double minWidth;
  final List<int> rowsPerPageOptions;
  final bool isLoading;
  final Widget? emptyState;

  const ResponsivePaginatedTable({
    super.key,
    required this.items,
    required this.header,
    required this.rowBuilder,
    this.minWidth = 800,
    this.rowsPerPageOptions = const [10, 20, 50, 100],
    this.isLoading = false,
    this.emptyState,
  });

  @override
  State<ResponsivePaginatedTable<T>> createState() =>
      _ResponsivePaginatedTableState<T>();
}

class _TableScrollBehavior extends MaterialScrollBehavior {
  const _TableScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.trackpad,
    PointerDeviceKind.stylus,
    PointerDeviceKind.unknown,
  };
}

class _ResponsivePaginatedTableState<T>
    extends State<ResponsivePaginatedTable<T>> {
  int _currentPage = 0;
  late int _rowsPerPage;
  final ScrollController _horizontalController = ScrollController();
  final ScrollController _verticalController = ScrollController();

  @override
  void initState() {
    super.initState();
    _rowsPerPage = widget.rowsPerPageOptions.first;
  }

  @override
  void dispose() {
    _horizontalController.dispose();
    _verticalController.dispose();
    super.dispose();
  }

  void _scrollRowsToTop() {
    if (_verticalController.hasClients) {
      _verticalController.jumpTo(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (widget.items.isEmpty) {
      return widget.emptyState ??
          Center(
            child: Padding(
              padding: EdgeInsets.all(48.0),
              child: Text(
                'admin.common.noDataAvailable'.tr(),
                style: const TextStyle(color: Colors.grey),
              ),
            ),
          );
    }

    // Pagination logic
    final totalItems = widget.items.length;
    final totalPages = (totalItems / _rowsPerPage).ceil();

    // Ensure current page is valid after data changes
    if (_currentPage >= totalPages && totalPages > 0) {
      _currentPage = totalPages - 1;
    }
    if (_currentPage < 0) _currentPage = 0;

    final startIndex = _currentPage * _rowsPerPage;
    final endIndex = (startIndex + _rowsPerPage < totalItems)
        ? startIndex + _rowsPerPage
        : totalItems;
    final currentItems = widget.items.sublist(startIndex, endIndex);

    return LayoutBuilder(
      builder: (context, constraints) {
        final hasBoundedHeight = constraints.hasBoundedHeight;
        final availableWidth = constraints.hasBoundedWidth
            ? constraints.maxWidth
            : widget.minWidth;
        final tableWidth = availableWidth > widget.minWidth
            ? availableWidth
            : widget.minWidth;

        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? AppColors.surfaceBorder
                  : AppColors.lightSurfaceBorder,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          clipBehavior:
              Clip.antiAlias, // Ensure children don't overflow corners
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (hasBoundedHeight)
                Expanded(
                  child: _buildScrollableArea(
                    context,
                    tableWidth,
                    currentItems,
                    startIndex,
                    useVerticalScroll: true,
                  ),
                )
              else
                _buildScrollableArea(
                  context,
                  tableWidth,
                  currentItems,
                  startIndex,
                  useVerticalScroll: false,
                ),

              // Pagination Footer
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: isDark
                          ? AppColors.surfaceBorder
                          : AppColors.lightSurfaceBorder,
                    ),
                  ),
                  color: Theme.of(context).colorScheme.surface,
                ),
                child: _buildPaginationFooter(
                  startIndex + 1,
                  endIndex,
                  totalItems,
                  totalPages,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildScrollableArea(
    BuildContext context,
    double tableWidth,
    List<T> currentItems,
    int startIndex, {
    required bool useVerticalScroll,
  }) {
    return ScrollConfiguration(
      behavior: const _TableScrollBehavior(),
      child: Scrollbar(
        controller: _horizontalController,
        thumbVisibility: true,
        trackVisibility: true,
        interactive: true,
        notificationPredicate: (notification) =>
            notification.metrics.axis == Axis.horizontal,
        child: SingleChildScrollView(
          controller: _horizontalController,
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: tableWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppColors.surface2
                        : AppColors.lightSurface2,
                    border: Border(
                      bottom: BorderSide(
                        color: Theme.of(context).brightness == Brightness.dark
                            ? AppColors.surfaceBorder
                            : AppColors.lightSurfaceBorder,
                      ),
                    ),
                  ),
                  child: widget.header,
                ),

                if (useVerticalScroll)
                  Expanded(
                    child: ScrollConfiguration(
                      behavior: const _TableScrollBehavior(),
                      child: Scrollbar(
                        controller: _verticalController,
                        thumbVisibility: true,
                        trackVisibility: true,
                        interactive: true,
                        notificationPredicate: (notification) =>
                            notification.metrics.axis == Axis.vertical,
                        child: ListView.builder(
                          controller: _verticalController,
                          itemCount: currentItems.length,
                          itemBuilder: (context, i) {
                            final index = startIndex + i;
                            final item = currentItems[i];
                            return Container(
                              decoration: const BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(color: Color(0xFFF1F5F9)),
                                ),
                              ),
                              child: widget.rowBuilder(context, item, index),
                            );
                          },
                        ),
                      ),
                    ),
                  )
                else
                  ...currentItems.asMap().entries.map((entry) {
                    final index = startIndex + entry.key;
                    final item = entry.value;
                    return Container(
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: Color(0xFFF1F5F9)),
                        ),
                      ),
                      child: widget.rowBuilder(context, item, index),
                    );
                  }),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaginationFooter(int start, int end, int total, int totalPages) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 600;

        Widget rowsPerPageControl() {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${'admin.common.rowsPerPage'.tr()}:',
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 96,
                child: FormSelect<int>(
                  label: 'admin.common.rowsPerPage'.tr(),
                  showLabel: false,
                  value: _rowsPerPage,
                  icon: const Icon(LucideIcons.chevronDown, size: 14),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 10,
                  ),
                  borderRadius: 6,
                  items: widget.rowsPerPageOptions.map((n) {
                    return DropdownMenuItem(
                      value: n,
                      child: Text(n.toString()),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _rowsPerPage = value;
                      _currentPage = 0; // Reset to first page
                      _scrollRowsToTop();
                    });
                  },
                ),
              ),
            ],
          );
        }

        Widget showingText({TextAlign? align}) {
          return Text(
            'admin.common.showing'.tr(
              namedArgs: {
                'from': start.toString(),
                'to': end.toString(),
                'total': total.toString(),
              },
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: align,
            style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
          );
        }

        Widget paginationControls() {
          return Row(
            mainAxisAlignment: isSmall
                ? MainAxisAlignment.center
                : MainAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                onPressed: _currentPage > 0
                    ? () => setState(() {
                        _currentPage--;
                        _scrollRowsToTop();
                      })
                    : null,
                icon: const Icon(LucideIcons.chevronLeft, size: 16),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
                tooltip: 'admin.common.previous'.tr(),
              ),
              const SizedBox(width: 16),
              Text(
                'admin.common.page'.tr(
                  namedArgs: {
                    'page': (_currentPage + 1).toString(),
                    'total': totalPages.toString(),
                  },
                ),
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 16),
              IconButton(
                onPressed: _currentPage < totalPages - 1
                    ? () => setState(() {
                        _currentPage++;
                        _scrollRowsToTop();
                      })
                    : null,
                icon: const Icon(LucideIcons.chevronRight, size: 16),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
                tooltip: 'admin.common.next'.tr(),
              ),
            ],
          );
        }

        if (isSmall) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  rowsPerPageControl(),
                  const SizedBox(width: 12),
                  Expanded(child: showingText(align: TextAlign.right)),
                ],
              ),
              const SizedBox(height: 12),
              paginationControls(),
            ],
          );
        }

        return Row(
          children: [
            Expanded(
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 24,
                runSpacing: 8,
                children: [rowsPerPageControl(), showingText()],
              ),
            ),
            const SizedBox(width: 12),
            paginationControls(),
          ],
        );
      },
    );
  }
}
