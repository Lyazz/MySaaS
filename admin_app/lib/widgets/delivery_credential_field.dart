import 'package:flutter/material.dart';

import '../models/delivery_provider.dart';
import 'form/form_input.dart';

/// One credential input in a delivery-provider connection form.
///
/// A secret field that already has a value saved server-side never shows
/// that value — the real secret is write-only and is never sent back by the
/// API. Instead this shows a "saved" hint with a Clear action.
class DeliveryCredentialFieldInput extends StatelessWidget {
  final DeliveryCredentialField field;
  final TextEditingController controller;
  final bool isSaved;
  final bool isCleared;
  final VoidCallback onClear;

  const DeliveryCredentialFieldInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isSaved,
    required this.isCleared,
    required this.onClear,
  });

  bool get showSavedHint => field.secret && isSaved && !isCleared;

  @override
  Widget build(BuildContext context) {
    return FormInput(
      label: field.required ? '${field.label} *' : field.label,
      controller: controller,
      obscureText: field.secret,
      hint: showSavedHint ? 'Saved — leave blank to keep' : null,
      suffixIcon: showSavedHint
          ? TextButton(onPressed: onClear, child: const Text('Clear'))
          : null,
    );
  }
}
