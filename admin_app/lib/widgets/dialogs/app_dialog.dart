import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../buttons/app_button.dart';

enum AppDialogPrimaryVariant { primary, destructive }

class AppDialog extends StatelessWidget {
  final String title;
  final String? description;
  final Widget content;

  final double maxWidth;
  final EdgeInsets insetPadding;
  final bool showCloseButton;

  final List<Widget>? actions;

  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  final String? primaryLabel;
  final VoidCallback? onPrimary;
  final bool primaryLoading;
  final AppDialogPrimaryVariant primaryVariant;

  const AppDialog({
    super.key,
    required this.title,
    required this.content,
    this.description,
    this.maxWidth = 720,
    this.insetPadding = const EdgeInsets.symmetric(
      horizontal: 16,
      vertical: 24,
    ),
    this.showCloseButton = false,
    this.actions,
    this.secondaryLabel,
    this.onSecondary,
    this.primaryLabel,
    this.onPrimary,
    this.primaryLoading = false,
    this.primaryVariant = AppDialogPrimaryVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    final resolvedActions = actions ?? _buildDefaultActions(context);

    return Dialog(
      insetPadding: insetPadding,
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: maxWidth,
          maxHeight: MediaQuery.sizeOf(context).height * 0.9,
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A), // Slate-900
                        height: 1.1,
                      ),
                    ),
                  ),
                  if (showCloseButton)
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.close_rounded),
                      tooltip: 'admin.common.close'.tr(),
                    ),
                ],
              ),
              if (description != null && description!.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  description!,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFF64748B), // Slate-500
                    height: 1.3,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              Flexible(
                fit: FlexFit.loose,
                child: SingleChildScrollView(
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    child: content,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _AppDialogActionsBar(actions: resolvedActions),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildDefaultActions(BuildContext context) {
    final hasSecondary = secondaryLabel != null;
    final hasPrimary = primaryLabel != null;

    if (!hasSecondary && !hasPrimary) return const <Widget>[];

    final widgets = <Widget>[];
    if (hasSecondary) {
      widgets.add(
        AppButton.secondary(label: secondaryLabel!, onPressed: onSecondary),
      );
    }

    if (hasPrimary) {
      widgets.add(
        primaryVariant == AppDialogPrimaryVariant.destructive
            ? AppButton.destructive(
                label: primaryLabel!,
                onPressed: onPrimary,
                loading: primaryLoading,
              )
            : AppButton.primary(
                label: primaryLabel!,
                onPressed: onPrimary,
                loading: primaryLoading,
              ),
      );
    }

    return widgets;
  }
}

class _AppDialogActionsBar extends StatelessWidget {
  final List<Widget> actions;

  const _AppDialogActionsBar({required this.actions});

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 520;

        return Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Expanded(
              child: Wrap(
                alignment: WrapAlignment.end,
                runAlignment: WrapAlignment.center,
                spacing: 16,
                runSpacing: 12,
                children: actions,
              ),
            ),
          ],
        );
      },
    );
  }
}
