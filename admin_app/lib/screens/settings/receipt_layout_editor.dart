import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../models/receipt_layout.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/buttons/app_button.dart';

class ReceiptLayoutEditor extends StatefulWidget {
  final ReceiptLayout? initialLayout;
  final Function(ReceiptLayout) onSave;

  const ReceiptLayoutEditor({
    super.key,
    this.initialLayout,
    required this.onSave,
  });

  @override
  State<ReceiptLayoutEditor> createState() => _ReceiptLayoutEditorState();
}

class _ReceiptLayoutEditorState extends State<ReceiptLayoutEditor> {
  late ReceiptLayout _layout;
  late TextEditingController _headerTextController;
  late TextEditingController _footerTextController;

  @override
  void initState() {
    super.initState();
    _layout = widget.initialLayout ?? ReceiptLayout.standard();
    _headerTextController = TextEditingController(text: _layout.headerText);
    _footerTextController = TextEditingController(text: _layout.footerText);

    _headerTextController.addListener(() {
      setState(() {
        _layout = _layout; // Just trigger rebuild
      });
    });
    _footerTextController.addListener(() {
      setState(() {
        _layout = _layout; // Just trigger rebuild
      });
    });
  }

  @override
  void dispose() {
    _headerTextController.dispose();
    _footerTextController.dispose();
    super.dispose();
  }

  // Helper to update layout
  void _updateLayout(ReceiptLayout newLayout) {
    setState(() {
      _layout = newLayout;
    });
  }

  @override
  Widget build(BuildContext context) {
    // We update the layout object's text fields from controllers before passing to preview/save
    // Actually, distinct properties might be better, but let's sync on rebuild
    // Better yet, let's construct the "current" layout dynamically for the preview
    final currentLayout = ReceiptLayout(
      id: _layout.id,
      name: _layout.name,
      showLogo: _layout.showLogo,
      showHeader: _layout.showHeader,
      headerText: _headerTextController.text,
      showDate: _layout.showDate,
      showOrderNumber: _layout.showOrderNumber,
      showCustomerInfo: _layout.showCustomerInfo,
      showFooter: _layout.showFooter,
      footerText: _footerTextController.text,
      showTaxBreakdown: _layout.showTaxBreakdown,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 900;

        if (isMobile) {
          return DefaultTabController(
            length: 2,
            child: Scaffold(
              backgroundColor: const Color(0xFFF1F5F9),
              appBar: AppBar(
                title: const Text('Edit Receipt Layout'),
                backgroundColor: Colors.white,
                elevation: 0,
                bottom: const TabBar(
                  tabs: [
                    Tab(text: 'Editor', icon: Icon(LucideIcons.edit3)),
                    Tab(text: 'Preview', icon: Icon(LucideIcons.eye)),
                  ],
                  labelColor: Color(0xFF0F172A),
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: Color(0xFF0D9488),
                ),
                actions: [
                  IconButton(
                    onPressed: () => widget.onSave(currentLayout),
                    icon: const Icon(
                      LucideIcons.save,
                      color: Color(0xFF0D9488),
                    ),
                  ),
                ],
              ),
              body: TabBarView(
                children: [
                  _buildEditor(currentLayout),
                  Container(
                    color: const Color(0xFFE2E8F0),
                    padding: const EdgeInsets.all(16), // Reduced padding
                    child: Center(
                      child: SingleChildScrollView(
                        child: _ReceiptPreview(layout: currentLayout),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        // Desktop / Tablet Layout
        return Scaffold(
          backgroundColor: const Color(0xFFF1F5F9),
          appBar: AppBar(
            title: const Text('Edit Receipt Layout'),
            backgroundColor: Colors.white,
            elevation: 0,
            actions: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: AppButton.primary(
                  label: 'Save Layout',
                  icon: LucideIcons.save,
                  size: AppButtonSize.sm,
                  onPressed: () => widget.onSave(currentLayout),
                ),
              ),
              const SizedBox(width: 16),
            ],
          ),
          body: Row(
            children: [
              // Left: Editor Controls
              Expanded(flex: 2, child: _buildEditor(currentLayout)),

              // Right: Live Preview
              Expanded(
                flex: 3,
                child: Container(
                  color: const Color(0xFFE2E8F0),
                  padding: const EdgeInsets.all(32),
                  child: Center(child: _ReceiptPreview(layout: currentLayout)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEditor(ReceiptLayout currentLayout) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Header'),
            SwitchListTile(
              title: const Text('Show Store Name / Header'),
              value: currentLayout.showHeader,
              onChanged: (v) => _updateLayout(
                ReceiptLayout(
                  id: _layout.id,
                  name: _layout.name,
                  showLogo: _layout.showLogo,
                  showHeader: v,
                  headerText: _layout.headerText, // Controller has raw text
                  showDate: _layout.showDate,
                  showOrderNumber: _layout.showOrderNumber,
                  showCustomerInfo: _layout.showCustomerInfo,
                  showFooter: _layout.showFooter,
                  footerText: _layout.footerText,
                  showTaxBreakdown: _layout.showTaxBreakdown,
                ),
              ),
            ),
            if (currentLayout.showHeader)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: FormInput(
                  label: 'Header Text',
                  controller: _headerTextController,
                ),
              ),

            const Divider(height: 32),

            _buildSectionHeader('Content'),
            SwitchListTile(
              title: const Text('Show Order Number'),
              value: currentLayout.showOrderNumber,
              onChanged: (v) => _updateLayout(
                ReceiptLayout(
                  id: _layout.id,
                  name: _layout.name,
                  showLogo: _layout.showLogo,
                  showHeader: currentLayout.showHeader,
                  headerText: currentLayout.headerText,
                  showDate: currentLayout.showDate,
                  showOrderNumber: v,
                  showCustomerInfo: currentLayout.showCustomerInfo,
                  showFooter: currentLayout.showFooter,
                  footerText: currentLayout.footerText,
                  showTaxBreakdown: currentLayout.showTaxBreakdown,
                ),
              ),
            ),
            SwitchListTile(
              title: const Text('Show Date & Time'),
              value: currentLayout.showDate,
              onChanged: (v) => _updateLayout(
                ReceiptLayout(
                  // ... copy relevant fields
                  id: _layout.id,
                  name: _layout.name,
                  showLogo: _layout.showLogo,
                  showHeader: currentLayout.showHeader,
                  headerText: currentLayout.headerText,
                  showDate: v,
                  showOrderNumber: currentLayout.showOrderNumber,
                  showCustomerInfo: currentLayout.showCustomerInfo,
                  showFooter: currentLayout.showFooter,
                  footerText: currentLayout.footerText,
                  showTaxBreakdown: currentLayout.showTaxBreakdown,
                ),
              ),
            ),
            SwitchListTile(
              title: const Text('Show Customer Info'),
              value: currentLayout.showCustomerInfo,
              onChanged: (v) => _updateLayout(
                ReceiptLayout(
                  id: _layout.id,
                  name: _layout.name,
                  showLogo: _layout.showLogo,
                  showHeader: currentLayout.showHeader,
                  headerText: currentLayout.headerText,
                  showDate: currentLayout.showDate,
                  showOrderNumber: currentLayout.showOrderNumber,
                  showCustomerInfo: v,
                  showFooter: currentLayout.showFooter,
                  footerText: currentLayout.footerText,
                  showTaxBreakdown: currentLayout.showTaxBreakdown,
                ),
              ),
            ),

            const Divider(height: 32),

            _buildSectionHeader('Footer'),
            SwitchListTile(
              title: const Text('Show Footer Message'),
              value: currentLayout.showFooter,
              onChanged: (v) => _updateLayout(
                ReceiptLayout(
                  id: _layout.id,
                  name: _layout.name,
                  showLogo: _layout.showLogo,
                  showHeader: currentLayout.showHeader,
                  headerText: currentLayout.headerText,
                  showDate: currentLayout.showDate,
                  showOrderNumber: currentLayout.showOrderNumber,
                  showCustomerInfo: currentLayout.showCustomerInfo,
                  showFooter: v,
                  footerText: currentLayout.footerText,
                  showTaxBreakdown: currentLayout.showTaxBreakdown,
                ),
              ),
            ),
            if (currentLayout.showFooter)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: FormInput(
                  label: 'Footer Text',
                  controller: _footerTextController,
                  maxLines: 2,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, left: 16, top: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Color(0xFF334155),
        ),
      ),
    );
  }
}

class _ReceiptPreview extends StatelessWidget {
  final ReceiptLayout layout;

  const _ReceiptPreview({required this.layout});

  @override
  Widget build(BuildContext context) {
    // Simulate 80mm width (approx 380px visual width)
    return Container(
      width: 380,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          if (layout.showHeader) ...[
            Text(
              layout.headerText,
              textAlign: TextAlign.center,
              style: GoogleFonts.courierPrime(
                fontSize: 24, // Size 2 equivalent
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (layout.showOrderNumber)
            Text(
              'Order #12345',
              textAlign: TextAlign.center,
              style: GoogleFonts.courierPrime(fontSize: 14),
            ),

          if (layout.showDate)
            Text(
              DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now()),
              textAlign: TextAlign.center,
              style: GoogleFonts.courierPrime(fontSize: 14),
            ),

          if (layout.showCustomerInfo) ...[
            const SizedBox(height: 16),
            Text(
              'Customer: John Doe\nPhone: +1 234 567 8900',
              style: GoogleFonts.courierPrime(fontSize: 14),
            ),
          ],

          const SizedBox(height: 16),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 8),

          // Items Header
          Row(
            children: [
              Expanded(flex: 3, child: _monoText('Item', bold: true)),
              Expanded(
                flex: 1,
                child: _monoText('Qty', align: TextAlign.center, bold: true),
              ),
              Expanded(
                flex: 1,
                child: _monoText('Price', align: TextAlign.right, bold: true),
              ),
              Expanded(
                flex: 1,
                child: _monoText('Total', align: TextAlign.right, bold: true),
              ),
            ],
          ),
          const Divider(color: Colors.black, thickness: 1),

          // Sample items (preview)
          _buildSampleItem('Cheeseburger', 2, 8.50),
          _buildSampleItem('Fries (Large)', 1, 4.00),
          _buildSampleItem('Cola', 2, 2.50),

          const SizedBox(height: 8),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 8),

          // Totals
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _monoText('TOTAL', size: 24, bold: true),
              _monoText('\$26.00', size: 24, bold: true),
            ],
          ),

          const SizedBox(height: 32),

          if (layout.showFooter)
            Text(
              layout.footerText,
              textAlign: TextAlign.center,
              style: GoogleFonts.courierPrime(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),

          const SizedBox(height: 24),
          // Cut marker visual
          Row(
            children: List.generate(
              20,
              (index) => Expanded(
                child: Container(
                  height: 1,
                  color: Colors.black,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _monoText(
    String text, {
    TextAlign align = TextAlign.left,
    bool bold = false,
    double size = 14,
  }) {
    return Text(
      text,
      textAlign: align,
      style: GoogleFonts.courierPrime(
        fontSize: size,
        fontWeight: bold ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  Widget _buildSampleItem(String name, int qty, double price) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 3, child: _monoText(name)),
          Expanded(
            flex: 1,
            child: _monoText(qty.toString(), align: TextAlign.center),
          ),
          Expanded(
            flex: 1,
            child: _monoText(price.toStringAsFixed(2), align: TextAlign.right),
          ),
          Expanded(
            flex: 1,
            child: _monoText(
              (qty * price).toStringAsFixed(2),
              align: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
