import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';

import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../utils/tenant_currency.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/form/admin_form_shell.dart';
import '../widgets/form/form_input.dart';

class CustomerFormScreen extends ConsumerStatefulWidget {
  final String? customerId;

  const CustomerFormScreen({super.key, this.customerId});

  @override
  ConsumerState<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends ConsumerState<CustomerFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _address;
  late final TextEditingController _openingBalance;

  bool _initialLoading = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController();
    _phone = TextEditingController();
    _email = TextEditingController();
    _address = TextEditingController();
    _openingBalance = TextEditingController(
      text: 'admin.forms.product.stock.placeholder'.tr(),
    );

    if (widget.customerId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadCustomer());
    }
  }

  Future<void> _loadCustomer() async {
    final id = widget.customerId?.trim() ?? '';
    if (id.isEmpty) return;

    final cached = ref.read(customersProvider).detailsById[id];
    final cachedSummary = cached?.summary;
    if (cachedSummary != null) {
      _name.text = cachedSummary.name;
      _phone.text = cachedSummary.phone;
      _email.text = cachedSummary.email ?? '';
      _address.text = cachedSummary.address ?? '';
      _openingBalance.text = cachedSummary.openingBalance.toString();
      return;
    }

    setState(() {
      _initialLoading = true;
      _error = null;
    });

    try {
      final detail = await ref
          .read(customersProvider.notifier)
          .fetchCustomerDetail(id);
      final summary = detail?.summary;
      if (summary == null) {
        setState(() => _error = 'Customer not found');
        return;
      }

      _name.text = summary.name;
      _phone.text = summary.phone;
      _email.text = summary.email ?? '';
      _address.text = summary.address ?? '';
      _openingBalance.text = summary.openingBalance.toString();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _initialLoading = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
    _openingBalance.dispose();
    super.dispose();
  }

  double _parseMoney(String raw) {
    final normalized = raw.trim().replaceAll(',', '.');
    return double.tryParse(normalized) ?? 0;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final id = widget.customerId?.trim();
      if (id != null && id.isNotEmpty) {
        await ref
            .read(customersProvider.notifier)
            .updateCustomer(
              id,
              name: _name.text,
              phone: _phone.text,
              email: _email.text,
              address: _address.text,
            );
        if (mounted) context.go('/customers/$id');
      } else {
        await ref
            .read(customersProvider.notifier)
            .createCustomer(
              name: _name.text,
              phone: _phone.text,
              email: _email.text,
              address: _address.text,
              openingBalance: _parseMoney(_openingBalance.text),
            );
        if (mounted) context.go('/customers');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_initialLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isEditing =
        widget.customerId != null && widget.customerId!.trim().isNotEmpty;
    final currencyCode = tenantCurrencyCode(
      ref.watch(storeSettingsProvider).settings,
    );

    return AdminFormShell(
      title: isEditing
          ? 'admin.pages.customers.edit.title'.tr()
          : 'admin.pages.customers.create.title'.tr(),
      subtitle: isEditing
          ? 'admin.pages.customers.edit.subtitle'.tr()
          : 'admin.pages.customers.create.subtitle'.tr(),
      backPath: isEditing ? '/customers/${widget.customerId}' : '/customers',
      backLabel: isEditing
          ? 'admin.pages.customers.detail.fallbackTitle'.tr()
          : 'admin.pages.customers.index.title'.tr(),
      error: _error,
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(32),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isDesktop = constraints.maxWidth > 800;

                    final nameField = FormInput(
                      controller: _name,
                      label: 'admin.forms.customer.name.label'.tr(),
                      hint: 'admin.forms.customer.name.placeholder'.tr(),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'admin.forms.customer.name.required'.tr()
                          : null,
                    );

                    final phoneField = FormInput(
                      controller: _phone,
                      label: 'admin.forms.customer.phone.label'.tr(),
                      hint: 'admin.forms.customer.phone.placeholder'.tr(),
                      keyboardType: TextInputType.phone,
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'admin.forms.customer.phone.required'.tr()
                          : null,
                    );

                    final emailField = FormInput(
                      controller: _email,
                      label: 'admin.forms.customer.email.label'.tr(),
                      hint: 'admin.forms.customer.email.placeholder'.tr(),
                      keyboardType: TextInputType.emailAddress,
                    );

                    final addressField = FormInput(
                      controller: _address,
                      label: 'admin.forms.customer.address.label'.tr(),
                      hint: 'admin.forms.customer.address.placeholder'.tr(),
                      maxLines: 2,
                    );

                    final openingBalanceField = FormInput(
                      controller: _openingBalance,
                      label: 'app.admin_forms_customer_openingba'.tr().tr(),
                      hint: isEditing
                          ? 'admin.forms.customer.openingBalance.hint'.tr()
                          : 'admin.forms.customer.openingBalance.placeholder'
                                .tr(),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      prefixText: '$currencyCode ',
                      enabled: !isEditing,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                      ],
                      validator: isEditing
                          ? null
                          : (v) {
                              final value = (v ?? '').trim();
                              if (value.isEmpty) {
                                return 'admin.forms.customer.openingBalance.required'
                                    .tr();
                              }
                              if (double.tryParse(value.replaceAll(',', '.')) ==
                                  null) {
                                return 'admin.validation.invalidNumber'.tr();
                              }
                              return null;
                            },
                    );

                    if (isDesktop) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(child: nameField),
                              const SizedBox(width: 24),
                              Expanded(child: phoneField),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(child: emailField),
                              const SizedBox(width: 24),
                              Expanded(child: openingBalanceField),
                            ],
                          ),
                          const SizedBox(height: 24),
                          addressField,
                        ],
                      );
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        nameField,
                        const SizedBox(height: 24),
                        phoneField,
                        const SizedBox(height: 24),
                        emailField,
                        const SizedBox(height: 24),
                        openingBalanceField,
                        const SizedBox(height: 24),
                        addressField,
                      ],
                    );
                  },
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Align(
                alignment: Alignment.centerRight,
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  alignment: WrapAlignment.end,
                  children: [
                    AppButton.secondary(
                      label: 'admin.common.cancel'.tr(),
                      onPressed: _submitting
                          ? null
                          : () => context.go(
                              isEditing
                                  ? '/customers/${widget.customerId}'
                                  : '/customers',
                            ),
                    ),
                    AppButton.primary(
                      label: isEditing
                          ? 'admin.common.update'.tr()
                          : 'admin.pages.customers.create.submit'.tr(),
                      loading: _submitting,
                      onPressed: _submitting ? null : _submit,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
