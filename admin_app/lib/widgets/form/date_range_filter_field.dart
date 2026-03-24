import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';

import 'form_input.dart';

class DateRangeFilterField extends StatefulWidget {
  final String label;
  final String hint;
  final DateTimeRange? range;
  final DateTime firstDate;
  final DateTime lastDate;
  final DateFormat dateFormat;
  final EdgeInsets contentPadding;
  final DateTimeRange Function(DateTimeRange range) normalize;
  final ValueChanged<DateTimeRange?> onChanged;

  DateRangeFilterField({
    super.key,
    this.label = 'Date Range',
    this.hint = 'Any time',
    required this.range,
    required this.firstDate,
    required this.lastDate,
    DateFormat? dateFormat,
    this.contentPadding = const EdgeInsets.symmetric(
      horizontal: 16,
      vertical: 14,
    ),
    DateTimeRange Function(DateTimeRange range)? normalize,
    required this.onChanged,
  })  : dateFormat = dateFormat ?? DateFormat('yyyy-MM-dd'),
        normalize = normalize ?? _identityRange;

  static DateTimeRange _identityRange(DateTimeRange range) => range;

  @override
  State<DateRangeFilterField> createState() => _DateRangeFilterFieldState();
}

class _DateRangeFilterFieldState extends State<DateRangeFilterField> {
  late final TextEditingController _controller = TextEditingController(
    text: _format(widget.range),
  );

  @override
  void didUpdateWidget(covariant DateRangeFilterField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.range != widget.range) {
      _controller.text = _format(widget.range);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _format(DateTimeRange? range) {
    if (range == null) return '';
    return '${widget.dateFormat.format(range.start)} - ${widget.dateFormat.format(range.end)}';
  }

  Future<void> _pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: widget.firstDate,
      lastDate: widget.lastDate,
      initialDateRange: widget.range,
    );
    if (picked == null) return;
    widget.onChanged(widget.normalize(picked));
  }

  @override
  Widget build(BuildContext context) {
    final hasRange = widget.range != null;

    return FormInput(
      label: widget.label,
      controller: _controller,
      hint: widget.hint,
      readOnly: true,
      prefixIcon: const Icon(
        LucideIcons.calendar,
        size: 16,
        color: Color(0xFF9CA3AF),
      ),
      suffixIcon: !hasRange
          ? null
          : IconButton(
              onPressed: () => widget.onChanged(null),
              icon: const Icon(LucideIcons.x, size: 16),
              tooltip: 'admin.common.clear'.tr(),
            ),
      contentPadding: widget.contentPadding,
      onTap: _pickRange,
    );
  }
}
