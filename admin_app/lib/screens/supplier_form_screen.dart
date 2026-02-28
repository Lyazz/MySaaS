import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';

import '../providers/suppliers_provider.dart';
import '../models/supplier.dart';
import '../widgets/form/admin_form_shell.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';

class SupplierFormScreen extends ConsumerStatefulWidget {
  final String? supplierId;

  const SupplierFormScreen({super.key, this.supplierId});

  @override
  ConsumerState<SupplierFormScreen> createState() => _SupplierFormScreenState();
}

class _SupplierFormScreenState extends ConsumerState<SupplierFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _addressController;
  late TextEditingController _notesController;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _addressController = TextEditingController();
    _notesController = TextEditingController();

    if (widget.supplierId != null) {
      _loadSupplier();
    }
  }

  Future<void> _loadSupplier() async {
    setState(() => _isLoading = true);
    try {
      final supplier = await ref
          .read(suppliersProvider.notifier)
          .fetchSupplier(widget.supplierId!);
      if (supplier != null) {
        _nameController.text = supplier.name;
        _emailController.text = supplier.email ?? '';
        _phoneController.text = supplier.phone ?? '';
        _addressController.text = supplier.address ?? '';
        _notesController.text = supplier.notes ?? '';
      }
    } catch (e) {
      setState(() => _error = 'Failed to load supplier: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveSupplier() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final supplier = Supplier(
      id: widget.supplierId ?? '',
      name: _nameController.text,
      email: _emailController.text,
      phone: _phoneController.text,
      address: _addressController.text,
      notes: _notesController.text,
    );

    try {
      if (widget.supplierId != null) {
        await ref.read(suppliersProvider.notifier).updateSupplier(supplier);
      } else {
        await ref.read(suppliersProvider.notifier).addSupplier(supplier);
      }
      if (mounted) context.go('/suppliers');
    } catch (e) {
      setState(() => _error = 'Error saving: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading &&
        widget.supplierId != null &&
        _nameController.text.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return AdminFormShell(
      title: widget.supplierId != null
          ? 'admin.pages.suppliers.edit.title'.tr()
          : 'admin.pages.suppliers.create.title'.tr(),
      subtitle: widget.supplierId != null
          ? 'admin.pages.suppliers.edit.subtitle'.tr()
          : 'admin.pages.suppliers.create.subtitle'.tr(),
      backPath: '/suppliers',
      backLabel: 'admin.pages.suppliers.index.title'.tr(),
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
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (isDesktop)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: FormInput(
                                  controller: _nameController,
                                  label: 'admin.forms.supplier.name.label'.tr(),
                                  hint: 'admin.forms.supplier.name.placeholder'
                                      .tr(),
                                  validator: (v) =>
                                      v!.isEmpty
                                          ? 'admin.forms.supplier.name.required'
                                                .tr()
                                          : null,
                                ),
                              ),
                              const SizedBox(width: 24),
                              Expanded(
                                child: FormInput(
                                  controller: _phoneController,
                                  label: 'admin.forms.supplier.phone.label'.tr(),
                                  hint: 'admin.forms.supplier.phone.placeholder'
                                      .tr(),
                                  keyboardType: TextInputType.phone,
                                ),
                              ),
                            ],
                          )
                        else ...[
                          FormInput(
                            controller: _nameController,
                            label: 'admin.forms.supplier.name.label'.tr(),
                            hint: 'admin.forms.supplier.name.placeholder'.tr(),
                            validator: (v) =>
                                v!.isEmpty
                                    ? 'admin.forms.supplier.name.required'.tr()
                                    : null,
                          ),
                          const SizedBox(height: 24),
                          FormInput(
                            controller: _phoneController,
                            label: 'admin.forms.supplier.phone.label'.tr(),
                            hint: 'admin.forms.supplier.phone.placeholder'.tr(),
                            keyboardType: TextInputType.phone,
                          ),
                        ],
                        const SizedBox(height: 24),
                        if (isDesktop)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: FormInput(
                                  controller: _emailController,
                                  label: 'admin.forms.supplier.email.label'.tr(),
                                  hint: 'admin.forms.supplier.email.placeholder'
                                      .tr(),
                                  keyboardType: TextInputType.emailAddress,
                                ),
                              ),
                              const SizedBox(width: 24),
                              Expanded(
                                child: FormInput(
                                  controller: _addressController,
                                  label: 'admin.forms.supplier.address.label'
                                      .tr(),
                                  hint:
                                      'admin.forms.supplier.address.placeholder'
                                          .tr(),
                                ),
                              ),
                            ],
                          )
                        else ...[
                          FormInput(
                            controller: _emailController,
                            label: 'admin.forms.supplier.email.label'.tr(),
                            hint: 'admin.forms.supplier.email.placeholder'.tr(),
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 24),
                          FormInput(
                            controller: _addressController,
                            label: 'admin.forms.supplier.address.label'.tr(),
                            hint:
                                'admin.forms.supplier.address.placeholder'.tr(),
                          ),
                        ],
                        const SizedBox(height: 24),
                        FormInput(
                          controller: _notesController,
                          label: 'admin.forms.supplier.notes.label'.tr(),
                          hint: 'admin.forms.supplier.notes.placeholder'.tr(),
                          maxLines: 3,
                        ),
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
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    label: 'admin.common.cancel'.tr(),
                    onPressed: () => context.go('/suppliers'),
                  ),
                  const SizedBox(width: 12),
                  AppButton.primary(
                    label: widget.supplierId != null
                        ? 'admin.common.update'.tr()
                        : 'admin.pages.suppliers.create.submit'.tr(),
                    onPressed: _saveSupplier,
                    loading: _isLoading,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
