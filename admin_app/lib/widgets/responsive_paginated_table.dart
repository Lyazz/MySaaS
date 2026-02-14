import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

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

class _ResponsivePaginatedTableState<T>
    extends State<ResponsivePaginatedTable<T>> {
  int _currentPage = 0;
  late int _rowsPerPage;

  @override
  void initState() {
    super.initState();
    _rowsPerPage = widget.rowsPerPageOptions.first;
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
          const Center(
            child: Padding(
              padding: EdgeInsets.all(48.0),
              child: Text(
                'No data available',
                style: TextStyle(color: Colors.grey),
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

    return Column(
      children: [
        // Table Container
        Container(
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
          clipBehavior:
              Clip.antiAlias, // Ensure children don't overflow corners
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Scrollable Area
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: widget.minWidth),
                  child: IntrinsicWidth(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Header
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

                        // Rows
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

              // Pagination Footer
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                  color: Colors.white,
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
        ),
      ],
    );
  }

  Widget _buildPaginationFooter(int start, int end, int total, int totalPages) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 600;

        return Flex(
          direction: isSmall ? Axis.vertical : Axis.horizontal,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Rows per page & Info
            Row(
              mainAxisAlignment: isSmall
                  ? MainAxisAlignment.spaceBetween
                  : MainAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Rows per page:',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: _rowsPerPage,
                          isDense: true,
                          icon: const Icon(LucideIcons.chevronDown, size: 14),
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF334155),
                          ),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() {
                                _rowsPerPage = value;
                                _currentPage = 0; // Reset to first page
                              });
                            }
                          },
                          items: widget.rowsPerPageOptions.map((n) {
                            return DropdownMenuItem(
                              value: n,
                              child: Text(n.toString()),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
                if (!isSmall) const SizedBox(width: 24),
                if (!isSmall)
                  Text(
                    '$start-$end of $total',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
                    ),
                  ),
              ],
            ),

            if (isSmall) const SizedBox(height: 12),
            if (isSmall)
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  '$start-$end of $total',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
            if (isSmall) const SizedBox(height: 12),

            // Pagination Controls
            Row(
              mainAxisAlignment: isSmall
                  ? MainAxisAlignment.center
                  : MainAxisAlignment.end,
              children: [
                IconButton(
                  onPressed: _currentPage > 0
                      ? () => setState(() => _currentPage--)
                      : null,
                  icon: const Icon(LucideIcons.chevronLeft, size: 16),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  splashRadius: 20,
                  tooltip: 'Previous Page',
                ),
                const SizedBox(width: 16),
                Text(
                  'Page ${_currentPage + 1} of $totalPages',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF334155),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 16),
                IconButton(
                  onPressed: _currentPage < totalPages - 1
                      ? () => setState(() => _currentPage++)
                      : null,
                  icon: const Icon(LucideIcons.chevronRight, size: 16),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  splashRadius: 20,
                  tooltip: 'Next Page',
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
