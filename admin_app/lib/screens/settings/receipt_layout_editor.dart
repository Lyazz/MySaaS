import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:printing/printing.dart';
import '../../models/receipt_layout.dart';
import '../../models/pos_models.dart';
import '../../models/customer.dart';
import '../../services/print_service.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/buttons/app_button.dart';
import '../../providers/store_settings_provider.dart';
import '../../services/api_service.dart';
import '../../repositories/contact_infos_repository.dart';

// ─── Accent / palette ───────────────────────────────────────────────────────
const _kAccent = Color(0xFF65A30D);
const _kAccentLight = Color(0xFFECFCCB);
const _kBg = Color(0xFFF8FAFC);
const _kCard = Colors.white;
const _kBorder = Color(0xFFE2E8F0);
const _kText = Color(0xFF0F172A);
const _kSubText = Color(0xFF64748B);

// ─── Preset templates ───────────────────────────────────────────────────────
class _PresetTemplate {
  final String key;
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final ReceiptLayout Function() build;

  const _PresetTemplate({
    required this.key,
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
    required this.build,
  });
}

final _kPresets = [
  _PresetTemplate(
    key: 'minimal',
    label: 'app.minimal'.tr(),
    description: 'app.store_name_items_total_only'.tr(),
    icon: LucideIcons.minimize2,
    color: const Color(0xFF6366F1),
    build: () => const ReceiptLayout(
      id: 'minimal',
      name: 'Minimal',
      showLogo: false,
      showStoreName: true,
      showStoreAddress: false,
      showStorePhone: false,
      showStoreEmail: false,
      showHeader: false,
      headerText: '',
      showDate: false,
      showOrderNumber: true,
      showCustomerInfo: false,
      showFooter: false,
      footerText: '',
      showTaxBreakdown: false,
    ),
  ),
  _PresetTemplate(
    key: 'full',
    label: 'app.full_detail'.tr(),
    description: 'app.everything_logo_contacts_tax_f'.tr(),
    icon: LucideIcons.layoutDashboard,
    color: const Color(0xFF65A30D),
    build: () => ReceiptLayout(
      id: 'full',
      name: 'Full Detail',
      showLogo: true,
      showStoreName: true,
      showStoreAddress: true,
      showStorePhone: true,
      showStoreEmail: true,
      showHeader: true,
      headerText: 'app.welcome'.tr(),
      showDate: true,
      showOrderNumber: true,
      showCustomerInfo: true,
      showFooter: true,
      footerText: 'app.thank_you_for_your_purchase'.tr(),
      showTaxBreakdown: true,
    ),
  ),
  _PresetTemplate(
    key: 'arabic',
    label: 'i18n.locales.ar'.tr(),
    description: 'app.rtl_safe_no_logo_clean_layout'.tr(),
    icon: LucideIcons.type,
    color: const Color(0xFFF59E0B),
    build: () => ReceiptLayout(
      id: 'arabic',
      name: 'Arabic Optimized',
      showLogo: false,
      showStoreName: true,
      showStoreAddress: true,
      showStorePhone: true,
      showStoreEmail: false,
      showHeader: false,
      headerText: '',
      showDate: true,
      showOrderNumber: true,
      showCustomerInfo: false,
      showFooter: true,
      footerText: 'app.str_378'.tr(),
      showTaxBreakdown: true,
    ),
  ),
  _PresetTemplate(
    key: 'kitchen',
    label: 'app.quick_print'.tr(),
    description: 'app.items_only_kitchen_ticket_styl'.tr(),
    icon: LucideIcons.chefHat,
    color: const Color(0xFFEF4444),
    build: () => const ReceiptLayout(
      id: 'kitchen',
      name: 'Quick Print',
      showLogo: false,
      showStoreName: false,
      showStoreAddress: false,
      showStorePhone: false,
      showStoreEmail: false,
      showHeader: false,
      headerText: '',
      showDate: true,
      showOrderNumber: true,
      showCustomerInfo: false,
      showFooter: false,
      footerText: '',
      showTaxBreakdown: false,
    ),
  ),
];

// ═══════════════════════════════════════════════════════════════════════════
class ReceiptLayoutEditor extends ConsumerStatefulWidget {
  final ReceiptLayout? initialLayout;
  final Function(ReceiptLayout) onSave;

  const ReceiptLayoutEditor({
    super.key,
    this.initialLayout,
    required this.onSave,
  });

  @override
  ConsumerState<ReceiptLayoutEditor> createState() =>
      _ReceiptLayoutEditorState();
}

class _ReceiptLayoutEditorState extends ConsumerState<ReceiptLayoutEditor>
    with SingleTickerProviderStateMixin {
  late ReceiptLayout _layout;
  late TextEditingController _headerTextController;
  late TextEditingController _footerTextController;
  late TextEditingController _storeNameController;
  late TextEditingController _storeAddressController;
  late TextEditingController _storePhoneController;
  late TextEditingController _storeEmailController;

  Map<String, String> _contactInfos = {};
  String? _activePreset;

  // Preview rebuild key — incrementing triggers PdfPreview rebuild
  int _previewKey = 0;

  @override
  void initState() {
    super.initState();
    _layout = widget.initialLayout ?? ReceiptLayout.standard();

    _headerTextController = TextEditingController(text: _layout.headerText);
    _footerTextController = TextEditingController(text: _layout.footerText);
    _storeNameController =
        TextEditingController(text: _layout.storeNameOverride ?? '');
    _storeAddressController =
        TextEditingController(text: _layout.storeAddressOverride ?? '');
    _storePhoneController =
        TextEditingController(text: _layout.storePhoneOverride ?? '');
    _storeEmailController =
        TextEditingController(text: _layout.storeEmailOverride ?? '');

    void rebuildPreview() {
      if (mounted) setState(() => _previewKey++);
    }

    _headerTextController.addListener(rebuildPreview);
    _footerTextController.addListener(rebuildPreview);
    _storeNameController.addListener(rebuildPreview);
    _storeAddressController.addListener(rebuildPreview);
    _storePhoneController.addListener(rebuildPreview);
    _storeEmailController.addListener(rebuildPreview);

    Future.microtask(_loadContactInfos);
  }

  Future<void> _loadContactInfos() async {
    try {
      final repo = ContactInfosRepository(ref.read(apiProvider));
      final items = await repo.list();
      final map = <String, String>{};
      for (final item in items) {
        map[item.kind] = item.value;
      }
      if (mounted) setState(() => _contactInfos = map);
    } catch (_) {}
  }

  @override
  void dispose() {
    _headerTextController.dispose();
    _footerTextController.dispose();
    _storeNameController.dispose();
    _storeAddressController.dispose();
    _storePhoneController.dispose();
    _storeEmailController.dispose();
    super.dispose();
  }

  void _updateLayout(ReceiptLayout newLayout) {
    setState(() {
      _layout = newLayout;
      _activePreset = null;
      _previewKey++;
    });
  }

  void _applyPreset(_PresetTemplate preset) {
    final built = preset.build();
    setState(() {
      _layout = built;
      _activePreset = preset.key;
      _headerTextController.text = built.headerText;
      _footerTextController.text = built.footerText;
      _storeNameController.text = built.storeNameOverride ?? '';
      _storeAddressController.text = built.storeAddressOverride ?? '';
      _storePhoneController.text = built.storePhoneOverride ?? '';
      _storeEmailController.text = built.storeEmailOverride ?? '';
      _previewKey++;
    });
  }

  ReceiptLayout get _currentLayout {
    return _layout.copyWith(
      headerText: _headerTextController.text,
      footerText: _footerTextController.text,
      storeNameOverride: _storeNameController.text.isNotEmpty
          ? _storeNameController.text
          : null,
      storeAddressOverride: _storeAddressController.text.isNotEmpty
          ? _storeAddressController.text
          : null,
      storePhoneOverride: _storePhoneController.text.isNotEmpty
          ? _storePhoneController.text
          : null,
      storeEmailOverride: _storeEmailController.text.isNotEmpty
          ? _storeEmailController.text
          : null,
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final currentLayout = _currentLayout;

    return LayoutBuilder(builder: (context, constraints) {
      final isMobile = constraints.maxWidth < 900;

      if (isMobile) {
        return _MobileLayout(
          currentLayout: currentLayout,
          onSave: () => widget.onSave(currentLayout),
          editorContent: _buildEditorScroll(currentLayout, isMobile: true),
          previewContent: _buildPreviewPanel(currentLayout),
        );
      }

      return Scaffold(
        backgroundColor: _kBg,
        appBar: _buildAppBar(currentLayout),
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Left: Editor ──────────────────────────────────────────────
            SizedBox(
              width: 420,
              child: _buildEditorScroll(currentLayout, isMobile: false),
            ),
            // ── Right: Preview ────────────────────────────────────────────
            Expanded(child: _buildPreviewPanel(currentLayout)),
          ],
        ),
      );
    });
  }

  // ── AppBar ────────────────────────────────────────────────────────────────
  PreferredSizeWidget _buildAppBar(ReceiptLayout currentLayout) {
    return AppBar(
      backgroundColor: _kCard,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: _kBorder),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _kAccentLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(LucideIcons.receipt,
                color: _kAccent, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text( 'app.admin_receipt_editor_title'.tr().tr(),
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _kText),
              ),
              Text( 'app.customize_your_receipt_layout'.tr(),
                style: const TextStyle(fontSize: 12, color: _kSubText),
              ),
            ],
          ),
        ],
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          child: AppButton.primary(
            label: 'app.admin_receipt_editor_savelayou'.tr().tr(),
            icon: LucideIcons.save,
            size: AppButtonSize.sm,
            onPressed: () => widget.onSave(currentLayout),
          ),
        ),
      ],
    );
  }

  // ── Editor scroll wrapper ─────────────────────────────────────────────────
  Widget _buildEditorScroll(ReceiptLayout currentLayout,
      {required bool isMobile}) {
    return Container(
      color: _kBg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildPresetsSection(),
            _buildSectionLabel(
                'admin.receipt.editor.storeInformation'.tr(), LucideIcons.store),
            _buildStoreInfoSection(currentLayout),
            const SizedBox(height: 8),
            _buildSectionLabel(
                'admin.receipt.editor.headerLegacy'.tr(), LucideIcons.chevronUp),
            _buildHeaderSection(currentLayout),
            const SizedBox(height: 8),
            _buildSectionLabel(
                'admin.receipt.editor.content'.tr(), LucideIcons.list),
            _buildContentSection(currentLayout),
            const SizedBox(height: 8),
            _buildSectionLabel(
                'admin.receipt.editor.footer'.tr(), LucideIcons.chevronDown),
            _buildFooterSection(currentLayout),
          ],
        ),
      ),
    );
  }

  // ── Section label (inline, no sliver) ─────────────────────────────────────
  Widget _buildSectionLabel(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: _kAccent),
          const SizedBox(width: 7),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: _kSubText,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(child: Divider(color: _kBorder, height: 1)),
        ],
      ),
    );
  }

  // ── Presets section ───────────────────────────────────────────────────────
  Widget _buildPresetsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.sparkles, size: 16, color: _kAccent),
            const SizedBox(width: 8),
            Text( 'app.quick_presets'.tr(),
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: _kSubText,
                  letterSpacing: 0.5),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.6,
          children: _kPresets
              .map((p) => _PresetCard(
                    preset: p,
                    isActive: _activePreset == p.key,
                    onTap: () => _applyPreset(p),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  // ── Store Info section ────────────────────────────────────────────────────
  Widget _buildStoreInfoSection(ReceiptLayout layout) {
    return _EditorCard(
      child: Column(
        children: [
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showlogo'.tr().tr(),
            icon: LucideIcons.image,
            value: layout.showLogo,
            onChanged: (v) => _updateLayout(layout.copyWith(showLogo: v)),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showstore'.tr().tr(),
            icon: LucideIcons.store,
            value: layout.showStoreName,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showStoreName: v)),
          ),
          _ExpandingField(
            visible: layout.showStoreName,
            child: FormInput(
              label: 'app.admin_receipt_editor_storename'.tr().tr(),
              controller: _storeNameController,
            ),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showstore2'.tr().tr(),
            icon: LucideIcons.mapPin,
            value: layout.showStoreAddress,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showStoreAddress: v)),
          ),
          _ExpandingField(
            visible: layout.showStoreAddress,
            child: FormInput(
              label: 'app.admin_receipt_editor_storeaddr'.tr().tr(),
              controller: _storeAddressController,
            ),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showstore3'.tr().tr(),
            icon: LucideIcons.phone,
            value: layout.showStorePhone,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showStorePhone: v)),
          ),
          _ExpandingField(
            visible: layout.showStorePhone,
            child: FormInput(
              label: 'app.admin_receipt_editor_storephon'.tr().tr(),
              controller: _storePhoneController,
            ),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showstore4'.tr().tr(),
            icon: LucideIcons.mail,
            value: layout.showStoreEmail,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showStoreEmail: v)),
          ),
          _ExpandingField(
            visible: layout.showStoreEmail,
            child: FormInput(
              label: 'app.admin_receipt_editor_storeemai'.tr().tr(),
              controller: _storeEmailController,
            ),
          ),
        ],
      ),
    );
  }

  // ── Header section ────────────────────────────────────────────────────────
  Widget _buildHeaderSection(ReceiptLayout layout) {
    return _EditorCard(
      child: Column(
        children: [
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showcusto'.tr().tr(),
            icon: LucideIcons.messageSquare,
            value: layout.showHeader,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showHeader: v)),
          ),
          _ExpandingField(
            visible: layout.showHeader,
            child: FormInput(
              label: 'app.admin_receipt_editor_headertex'.tr().tr(),
              controller: _headerTextController,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  // ── Content section ───────────────────────────────────────────────────────
  Widget _buildContentSection(ReceiptLayout layout) {
    return _EditorCard(
      child: Column(
        children: [
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showorder'.tr().tr(),
            icon: LucideIcons.hash,
            value: layout.showOrderNumber,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showOrderNumber: v)),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showdate'.tr().tr(),
            icon: LucideIcons.calendar,
            value: layout.showDate,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showDate: v)),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showcusto2'.tr().tr(),
            icon: LucideIcons.user,
            value: layout.showCustomerInfo,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showCustomerInfo: v)),
          ),
          const _Divider(),
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showtaxbr'.tr().tr(),
            icon: LucideIcons.percent,
            value: layout.showTaxBreakdown,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showTaxBreakdown: v)),
          ),
        ],
      ),
    );
  }

  // ── Footer section ────────────────────────────────────────────────────────
  Widget _buildFooterSection(ReceiptLayout layout) {
    return _EditorCard(
      child: Column(
        children: [
          _PillToggleRow(
            label: 'app.admin_receipt_editor_showfoote'.tr().tr(),
            icon: LucideIcons.chevronDown,
            value: layout.showFooter,
            onChanged: (v) =>
                _updateLayout(layout.copyWith(showFooter: v)),
          ),
          _ExpandingField(
            visible: layout.showFooter,
            child: FormInput(
              label: 'app.admin_receipt_editor_footertex'.tr().tr(),
              controller: _footerTextController,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  // ── Preview panel ─────────────────────────────────────────────────────────
  Widget _buildPreviewPanel(ReceiptLayout layout) {
    return Container(
      color: const Color(0xFFE9EFF8),
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
          child: Column(
            children: [
              // Label chip
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: _kAccentLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _kAccent.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.eye, size: 14, color: _kAccent),
                    const SizedBox(width: 6),
                    Text( 'admin.appearanceSettingsForm.preview.title'.tr(),
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _kAccent),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // Thermal printer device mockup
              _ThermalPrinterMockup(
                previewKey: _previewKey,
                layout: layout,
                contactInfos: _contactInfos,
              ),
              const SizedBox(height: 16),
              Text( 'app.receipt_updates_instantly_as_y'.tr(),
                style: TextStyle(
                    fontSize: 12,
                    color: _kSubText.withValues(alpha: 0.7)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Thermal Printer Device Mockup
// ═══════════════════════════════════════════════════════════════════════════
class _ThermalPrinterMockup extends ConsumerWidget {
  final int previewKey;
  final ReceiptLayout layout;
  final Map<String, String> contactInfos;

  const _ThermalPrinterMockup({
    required this.previewKey,
    required this.layout,
    required this.contactInfos,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providerState = ref.watch(storeSettingsProvider);
    final storeSettings = providerState.settings;
    final printService = ref.read(printServiceProvider);

    // Show loading placeholder while store settings load
    if (providerState.isLoading && storeSettings.name.isEmpty) {
      return const SizedBox(
        height: 300,
        child: Center(
          child: CircularProgressIndicator(color: _kAccent, strokeWidth: 2),
        ),
      );
    }

    final dummyItems = [
      CartItem(productId: '1', name: 'Cheeseburger', price: 8.50, quantity: 2),
      CartItem(productId: '2', name: 'Fries (Large)', price: 4.00, quantity: 1),
      CartItem(productId: '3', name: 'Cola', price: 2.50, quantity: 2),
    ];
    const total = 26.00;
    final customer = Customer(
        id: '1',
        name: 'Yanis M.',
        phone: '+XX X XXX XXXX',
        email: '',
        ordersCount: 0,
        totalSpent: 0);

    return Column(
      children: [
        // ── Printer body top ───────────────────────────────────────────────
        Container(
          width: 310,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(0xFF2D3748),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(14)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Status LED
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: const Color(0xFF4ADE80),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4ADE80).withValues(alpha: 0.6),
                      blurRadius: 6,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text( 'app.receipt_printer'.tr(),
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5),
              ),
              const SizedBox(width: 12),
              // Feed button
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFF4A5568),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Center(
                  child: Container(
                    width: 10,
                    height: 2,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ],
          ),
        ),
        // ── Paper slot ────────────────────────────────────────────────────
        Container(
          width: 310,
          height: 8,
          color: const Color(0xFF1A202C),
          child: Center(
            child: Container(
              width: 220,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF0D1117),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
        // ── Receipt paper ─────────────────────────────────────────────────
        Container(
          width: 280,
          constraints: const BoxConstraints(minHeight: 400, maxHeight: 600),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 16,
                  offset: const Offset(0, 6)),
            ],
          ),
          child: ClipRect(
            child: KeyedSubtree(
              key: ValueKey(previewKey),
              child: PdfPreview(
                build: (format) async {
                  try {
                    final doc = await printService.buildPdfDocument(
                      dummyItems,
                      total,
                      0.0,
                      customer,
                      '12345',
                      layout,
                      storeSettings,
                      contactInfos,
                      storeSettings.currencyCode.isNotEmpty
                          ? storeSettings.currencyCode
                          : 'DZD',
                    );
                    return doc.save();
                  } catch (e) {
                    // Rethrow so PdfPreview shows its own error widget
                    rethrow;
                  }
                },
                useActions: false,
                allowPrinting: false,
                allowSharing: false,
                canChangeOrientation: false,
                canChangePageFormat: false,
                canDebug: false,
              ),
            ),
          ),
        ),
        // ── Torn bottom edge ──────────────────────────────────────────────
        CustomPaint(
          size: const Size(280, 16),
          painter: _TornEdgePainter(),
        ),
        // ── Printer body bottom ────────────────────────────────────────────
        Container(
          width: 310,
          height: 16,
          decoration: BoxDecoration(
            color: const Color(0xFF2D3748),
            borderRadius:
                const BorderRadius.vertical(bottom: Radius.circular(14)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 4)),
            ],
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Torn Edge Painter
// ═══════════════════════════════════════════════════════════════════════════
class _TornEdgePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;
    final path = Path()..moveTo(0, 0);

    const teethCount = 18;
    final teethWidth = size.width / teethCount;
    for (int i = 0; i < teethCount; i++) {
      final x = i * teethWidth;
      path.lineTo(x + teethWidth / 2, size.height * 0.7);
      path.lineTo(x + teethWidth, 0);
    }
    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_TornEdgePainter oldDelegate) => false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Preset card
// ═══════════════════════════════════════════════════════════════════════════
class _PresetCard extends StatelessWidget {
  final _PresetTemplate preset;
  final bool isActive;
  final VoidCallback onTap;

  const _PresetCard(
      {required this.preset, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          color: isActive
              ? preset.color.withValues(alpha: 0.08)
              : _kCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? preset.color : _kBorder,
            width: isActive ? 2 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                      color: preset.color.withValues(alpha: 0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 2))
                ]
              : [],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: preset.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(preset.icon, size: 16, color: preset.color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    preset.label,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isActive ? preset.color : _kText),
                  ),
                  Text(
                    preset.description,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(fontSize: 10, color: _kSubText),
                  ),
                ],
              ),
            ),
            if (isActive)
              Icon(LucideIcons.checkCircle2, size: 16, color: preset.color),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Pill Toggle Row (ON / OFF segmented chip)
// ═══════════════════════════════════════════════════════════════════════════
class _PillToggleRow extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _PillToggleRow({
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: value
                  ? _kAccent.withValues(alpha: 0.1)
                  : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 16,
              color: value ? _kAccent : _kSubText,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: value ? _kText : _kSubText),
            ),
          ),
          // Segmented pill: OFF | ON
          _SegmentedPill(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}

class _SegmentedPill extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SegmentedPill({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 30,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _kBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _PillSegment(
            label: 'app.off'.tr(),
            isActive: !value,
            activeColor: const Color(0xFFEF4444),
            onTap: () => onChanged(false),
            isLeft: true,
          ),
          _PillSegment(
            label: 'app.on'.tr(),
            isActive: value,
            activeColor: _kAccent,
            onTap: () => onChanged(true),
            isLeft: false,
          ),
        ],
      ),
    );
  }
}

class _PillSegment extends StatelessWidget {
  final String label;
  final bool isActive;
  final Color activeColor;
  final VoidCallback onTap;
  final bool isLeft;

  const _PillSegment({
    required this.label,
    required this.isActive,
    required this.activeColor,
    required this.onTap,
    required this.isLeft,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: isActive ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.horizontal(
            left: isLeft ? const Radius.circular(20) : Radius.zero,
            right: !isLeft ? const Radius.circular(20) : Radius.zero,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isActive ? Colors.white : _kSubText,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}



// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
class _EditorCard extends StatelessWidget {
  final Widget child;

  const _EditorCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: child,
    );
  }
}

class _ExpandingField extends StatelessWidget {
  final bool visible;
  final Widget child;

  const _ExpandingField({required this.visible, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedCrossFade(
      firstChild: const SizedBox.shrink(),
      secondChild: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: child,
      ),
      crossFadeState:
          visible ? CrossFadeState.showSecond : CrossFadeState.showFirst,
      duration: const Duration(milliseconds: 220),
      sizeCurve: Curves.easeInOut,
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, indent: 16, endIndent: 16, color: _kBorder);
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Layout (tab-based)
// ═══════════════════════════════════════════════════════════════════════════
class _MobileLayout extends StatelessWidget {
  final ReceiptLayout currentLayout;
  final VoidCallback onSave;
  final Widget editorContent;
  final Widget previewContent;

  const _MobileLayout({
    required this.currentLayout,
    required this.onSave,
    required this.editorContent,
    required this.previewContent,
  });

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: _kBg,
        appBar: AppBar(
          backgroundColor: _kCard,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: _kAccentLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child:
                    const Icon(LucideIcons.receipt, color: _kAccent, size: 18),
              ),
              const SizedBox(width: 10),
              Text( 'app.receipt_layout'.tr(),
                style: TextStyle(
                    fontSize: 15, fontWeight: FontWeight.bold, color: _kText),
              ),
            ],
          ),
          bottom: TabBar(
            tabs: [
              Tab(
                  text: 'app.editor'.tr(),
                  icon: const Icon(LucideIcons.edit3, size: 16)),
              Tab(
                  text: 'admin.pages.onboarding.brand.preview'.tr(),
                  icon: const Icon(LucideIcons.eye, size: 16)),
            ],
            labelColor: _kAccent,
            unselectedLabelColor: _kSubText,
            indicatorColor: _kAccent,
            indicatorWeight: 2.5,
            labelStyle: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600),
          ),
          actions: [
            IconButton(
              onPressed: onSave,
              icon: const Icon(LucideIcons.save, color: _kAccent),
              tooltip: 'app.save_layout'.tr(),
            ),
          ],
        ),
        body: TabBarView(
          children: [
            editorContent,
            previewContent,
          ],
        ),
      ),
    );
  }
}
