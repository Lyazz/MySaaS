import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';

import 'form_input.dart';

enum DateRangePreset { today, last7d, last30d, last90d, custom }

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
  late DateRangePreset _preset = _presetFromRange(widget.range);

  @override
  void didUpdateWidget(covariant DateRangeFilterField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.range != widget.range) {
      _controller.text = _format(widget.range);
      _preset = _presetFromRange(widget.range);
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

  DateTime _startOfDay(DateTime date) => DateTime(date.year, date.month, date.day);

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  DateTimeRange _presetRange(DateRangePreset preset) {
    final today = _startOfDay(DateTime.now());
    final days = switch (preset) {
      DateRangePreset.today => 1,
      DateRangePreset.last7d => 7,
      DateRangePreset.last30d => 30,
      DateRangePreset.last90d => 90,
      DateRangePreset.custom => 7,
    };
    return widget.normalize(
      DateTimeRange(
        start: today.subtract(Duration(days: days - 1)),
        end: today,
      ),
    );
  }

  DateRangePreset _presetFromRange(DateTimeRange? range) {
    if (range == null) return DateRangePreset.custom;
    final today = _startOfDay(DateTime.now());
    final start = _startOfDay(range.start);
    final end = _startOfDay(range.end);

    if (!_sameDay(end, today)) return DateRangePreset.custom;
    if (_sameDay(start, today)) return DateRangePreset.today;
    if (_sameDay(start, today.subtract(const Duration(days: 6)))) {
      return DateRangePreset.last7d;
    }
    if (_sameDay(start, today.subtract(const Duration(days: 29)))) {
      return DateRangePreset.last30d;
    }
    if (_sameDay(start, today.subtract(const Duration(days: 89)))) {
      return DateRangePreset.last90d;
    }
    return DateRangePreset.custom;
  }

  String _presetLabel(DateRangePreset preset) {
    return switch (preset) {
      DateRangePreset.today => 'Today',
      DateRangePreset.last7d => 'Last 7 days',
      DateRangePreset.last30d => 'Last 30 days',
      DateRangePreset.last90d => 'Last 90 days',
      DateRangePreset.custom => 'Custom',
    };
  }

  Future<void> _selectPreset(DateRangePreset? preset) async {
    if (preset == null) return;
    setState(() => _preset = preset);

    if (preset == DateRangePreset.custom) {
      await _pickRange();
      return;
    }

    widget.onChanged(_presetRange(preset));
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<DateRangePreset>(
          key: ValueKey(_preset),
          initialValue: _preset,
          isExpanded: true,
          decoration: InputDecoration(
            labelText: widget.label,
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
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
          ),
          items: DateRangePreset.values
              .map(
                (preset) => DropdownMenuItem(
                  value: preset,
                  child: Text(_presetLabel(preset)),
                ),
              )
              .toList(),
          onChanged: _selectPreset,
        ),
        if (_preset == DateRangePreset.custom) ...[
          const SizedBox(height: 8),
          FormInput(
            label: widget.label,
            showLabel: false,
            controller: _controller,
            hint: widget.hint,
            readOnly: true,
            prefixIcon: const Icon(
              LucideIcons.calendar,
              size: 16,
              color: Color(0xFF9CA3AF),
            ),
            contentPadding: widget.contentPadding,
            onTap: _pickRange,
          ),
        ],
      ],
    );
  }
}
