import 'dart:math' as math;

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ResponsiveServerPaginatedTable<T> extends StatefulWidget {
  final List<T> items;
  final Widget? title;
  final Widget header;
  final Widget Function(BuildContext context, T item, int index) rowBuilder;
  final double minWidth;
  final bool isLoading;
  final Widget? emptyState;
  final bool showFooter;

  /// 1-based
  final int page;
  final int totalPages;
  final int totalItems;
  final int itemsPerPage;
  final ValueChanged<int> onPageChanged;

  const ResponsiveServerPaginatedTable({
    super.key,
    required this.items,
    this.title,
    required this.header,
    required this.rowBuilder,
    required this.page,
    required this.totalPages,
    required this.totalItems,
    required this.itemsPerPage,
    required this.onPageChanged,
    this.minWidth = 800,
    this.isLoading = false,
    this.emptyState,
    this.showFooter = true,
  });

  @override
  State<ResponsiveServerPaginatedTable<T>> createState() =>
      _ResponsiveServerPaginatedTableState<T>();
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

class _ResponsiveServerPaginatedTableState<T>
    extends State<ResponsiveServerPaginatedTable<T>> {
  final ScrollController _horizontalController = ScrollController();
  final ScrollController _verticalController = ScrollController();

  @override
  void dispose() {
    _horizontalController.dispose();
    _verticalController.dispose();
    super.dispose();
  }

  int get _safePage =>
      math.max(1, math.min(widget.page, math.max(1, widget.totalPages)));

  void _goToPage(int page) {
    final safePage = math.max(
      1,
      math.min(page, math.max(1, widget.totalPages)),
    );
    if (safePage == widget.page) return;
    widget.onPageChanged(safePage);
    if (_verticalController.hasClients) {
      _verticalController.jumpTo(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (widget.items.isEmpty) {
      return widget.emptyState ??
          Center(
            child: Padding(
              padding: EdgeInsets.all(48),
              child: Text(
                'admin.common.noDataAvailable'.tr(),
                style: const TextStyle(color: Colors.grey),
              ),
            ),
          );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final hasBoundedHeight = constraints.hasBoundedHeight;
        final availableWidth = constraints.hasBoundedWidth
            ? constraints.maxWidth
            : widget.minWidth;
        final tableWidth = availableWidth > widget.minWidth
            ? availableWidth
            : widget.minWidth;

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)), // Slate-200
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.title != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                    color: Colors.white,
                  ),
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A), // Slate-900
                    ),
                    child: widget.title!,
                  ),
                ),
              if (hasBoundedHeight)
                Expanded(
                  child: _buildScrollableArea(
                    context,
                    tableWidth,
                    widget.items,
                    useVerticalScroll: true,
                  ),
                )
              else
                _buildScrollableArea(
                  context,
                  tableWidth,
                  widget.items,
                  useVerticalScroll: false,
                ),
              if (widget.showFooter)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    color: Colors.white,
                  ),
                  child: _buildPaginationFooter(),
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
    List<T> items, {
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
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF8FAFC), // Slate-50
                    border: Border(
                      bottom: BorderSide(color: Color(0xFFE2E8F0)),
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
                          itemCount: items.length,
                          itemBuilder: (context, i) {
                            return Container(
                              decoration: const BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(color: Color(0xFFF1F5F9)),
                                ),
                              ),
                              child: widget.rowBuilder(context, items[i], i),
                            );
                          },
                        ),
                      ),
                    ),
                  )
                else
                  ...items.asMap().entries.map((entry) {
                    final index = entry.key;
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

  Widget _buildPaginationFooter() {
    final safePage = _safePage;
    final totalPages = math.max(1, widget.totalPages);
    final totalItems = math.max(0, widget.totalItems);
    final itemsPerPage = math.max(1, widget.itemsPerPage);

    final from = totalItems == 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
    final to = math.min(safePage * itemsPerPage, totalItems);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 600;

        return Flex(
          direction: isSmall ? Axis.vertical : Axis.horizontal,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (!isSmall)
              Text(
                'admin.common.showing'.tr(
                  namedArgs: {
                    'from': from.toString(),
                    'to': to.toString(),
                    'total': totalItems.toString(),
                  },
                ),
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B), // Slate-500
                ),
              ),
            if (isSmall)
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'admin.common.showing'.tr(
                    namedArgs: {
                      'from': from.toString(),
                      'to': to.toString(),
                      'total': totalItems.toString(),
                    },
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B), // Slate-500
                  ),
                ),
              ),
            if (isSmall) const SizedBox(height: 12),
            Row(
              mainAxisAlignment: isSmall
                  ? MainAxisAlignment.center
                  : MainAxisAlignment.end,
              children: [
                IconButton(
                  onPressed: safePage > 1
                      ? () => _goToPage(safePage - 1)
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
                      'page': safePage.toString(),
                      'total': totalPages.toString(),
                    },
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF334155), // Slate-700
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 16),
                IconButton(
                  onPressed: safePage < totalPages
                      ? () => _goToPage(safePage + 1)
                      : null,
                  icon: const Icon(LucideIcons.chevronRight, size: 16),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  splashRadius: 20,
                  tooltip: 'admin.common.next'.tr(),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
