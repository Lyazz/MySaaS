import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import '../../providers/printer_profiles_provider.dart';
import '../../models/printer_profile.dart';
import '../../services/discovery_service.dart';
import '../../services/print_service.dart';
import 'receipt_layout_editor.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../models/pos_models.dart'; // For CartItem

class PrintersSettingsPage extends ConsumerStatefulWidget {
  const PrintersSettingsPage({super.key});

  @override
  ConsumerState<PrintersSettingsPage> createState() =>
      _PrintersSettingsPageState();
}

class _PrintersSettingsPageState extends ConsumerState<PrintersSettingsPage> {
  // View State
  bool _isEditing = false;
  PrinterProfile? _editingProfile;

  // Form State
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _ipController;
  late TextEditingController _portController;
  late TextEditingController _macController;
  late TextEditingController _deviceIdController;
  late TextEditingController _printerNameController;
  late TextEditingController _portNameController;

  PrinterTransport _transport = PrinterTransport.network;
  int _paperWidth = 80;
  bool _cut = true;
  bool _drawer = false;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _nameController = TextEditingController();
    _ipController = TextEditingController();
    _portController = TextEditingController(text: '9100');
    _macController = TextEditingController();
    _deviceIdController = TextEditingController();
    _printerNameController = TextEditingController();
    _portNameController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ipController.dispose();
    _portController.dispose();
    _macController.dispose();
    _deviceIdController.dispose();
    _printerNameController.dispose();
    _portNameController.dispose();
    super.dispose();
  }

  void _startEditing([PrinterProfile? profile]) {
    setState(() {
      _isEditing = true;
      _editingProfile = profile;

      if (profile != null) {
        _nameController.text = profile.name;
        _transport = profile.transport;
        _paperWidth = profile.paperWidth;
        _cut = profile.cut;
        _drawer = profile.drawer;

        _ipController.text = profile.ip ?? '';
        _portController.text = profile.port?.toString() ?? '9100';
        _macController.text = profile.macAddress ?? '';
        _deviceIdController.text = profile.deviceId ?? '';
        _printerNameController.text = profile.printerName ?? '';
        _portNameController.text = profile.portName ?? '';
      } else {
        // Reset for new
        _nameController.clear();
        _transport = PrinterTransport.network;
        _paperWidth = 80;
        _cut = true;
        _drawer = false;
        _ipController.clear();
        _portController.text = '9100';
        _macController.clear();
        _deviceIdController.clear();
        _printerNameController.clear();
        _portNameController.clear();
      }
    });
  }

  void _cancelEditing() {
    setState(() {
      _isEditing = false;
      _editingProfile = null;
    });
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final connectionParams = <String, dynamic>{};

    switch (_transport) {
      case PrinterTransport.network:
        connectionParams['ip'] = _ipController.text;
        connectionParams['port'] = int.tryParse(_portController.text) ?? 9100;
        break;
      case PrinterTransport.bluetooth:
        connectionParams['macAddress'] = _macController.text;
        break;
      case PrinterTransport.ble:
        connectionParams['deviceId'] = _deviceIdController.text;
        break;
      case PrinterTransport.windows:
        connectionParams['printerName'] = _printerNameController.text;
        break;
      case PrinterTransport.serial:
        connectionParams['portName'] = _portNameController.text;
        break;
      case PrinterTransport.pdf:
        break;
    }

    final capabilityParams = {
      'paperWidth': _paperWidth,
      'cut': _cut,
      'drawer': _drawer,
    };

    final newProfile = PrinterProfile(
      id: _editingProfile?.id ?? const Uuid().v4(),
      name: _nameController.text,
      transport: _transport,
      connectionParams: connectionParams,
      capabilityParams: capabilityParams,
    );

    if (_editingProfile == null) {
      ref.read(printerProfilesProvider.notifier).addProfile(newProfile);
    } else {
      ref.read(printerProfilesProvider.notifier).updateProfile(newProfile);
    }

    _cancelEditing();
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Printer saved successfully')));
  }

  @override
  Widget build(BuildContext context) {
    const accentColor = Color(0xFF0D9488); // Teal 600

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isEditing) _buildEditingHeader() else _buildMainHeader(),
          const SizedBox(height: 24),
          if (_isEditing) _buildForm(accentColor) else _buildList(accentColor),
        ],
      ),
    );
  }

  Widget _buildMainHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Printer Settings',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.5,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Manage your receipt printers and layout settings.',
          style: TextStyle(fontSize: 14, color: Colors.grey[500]),
        ),
      ],
    );
  }

  Widget _buildEditingHeader() {
    return Row(
      children: [
        IconButton(
          onPressed: _cancelEditing,
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A)),
        ),
        const SizedBox(width: 8),
        Text(
          _editingProfile == null ? 'Add Printer' : 'Edit Printer',
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.5,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildList(Color accentColor) {
    final profilesState = ref.watch(printerProfilesProvider);

    if (profilesState.profiles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                LucideIcons.printer,
                size: 64,
                color: Colors.grey[300],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No printers configured',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add a printer to start printing receipts',
              style: TextStyle(color: Colors.grey[500]),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => _startEditing(),
              icon: const Icon(LucideIcons.plus),
              label: const Text('Add Printer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Saved Printers',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF334155),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _startEditing(),
              icon: const Icon(LucideIcons.plus, size: 18),
              label: const Text('Add New'),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Layout Editor Link
        Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                LucideIcons.layoutTemplate,
                color: Colors.amber.shade700,
              ),
            ),
            title: const Text(
              'Receipt Layout Configuration',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: const Text(
              'Customize your receipt header, footer, and content',
            ),
            trailing: const Icon(LucideIcons.chevronRight),
            onTap: () {
              // Open Layout Editor
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ReceiptLayoutEditor(
                    initialLayout: profilesState.receiptLayout,
                    onSave: (layout) {
                      ref
                          .read(printerProfilesProvider.notifier)
                          .saveLayout(layout);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Layout Saved')),
                      );
                      Navigator.pop(context);
                    },
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
        ...profilesState.profiles.map(
          (profile) => _buildProfileCard(
            profile,
            profilesState.defaultProfile?.id == profile.id,
            accentColor,
          ),
        ),
      ],
    );
  }

  Widget _buildProfileCard(
    PrinterProfile profile,
    bool isDefault,
    Color accentColor,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDefault ? accentColor : Colors.transparent,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDefault
                ? accentColor.withValues(alpha: 0.1)
                : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            _getIconForTransport(profile.transport),
            color: isDefault ? accentColor : const Color(0xFF64748B),
          ),
        ),
        title: Row(
          children: [
            Text(
              profile.name,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            if (isDefault) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'DEFAULT',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoBadge(
                LucideIcons.usb,
                profile.transport.name.toUpperCase(),
              ),
              const SizedBox(height: 4),
              _buildInfoBadge(LucideIcons.link, _getConnectionSummary(profile)),
            ],
          ),
        ),
        trailing: PopupMenuButton(
          icon: const Icon(LucideIcons.moreVertical, color: Color(0xFF94A3B8)),
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'edit', child: Text('Edit Config')),
            if (!isDefault)
              const PopupMenuItem(
                value: 'default',
                child: Text('Set as Default'),
              ),
            const PopupMenuItem(value: 'test', child: Text('Test Print')),
            const PopupMenuItem(
              value: 'delete',
              child: Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
          onSelected: (value) => _handleMenuAction(value, profile),
        ),
      ),
    );
  }

  Widget _buildInfoBadge(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: const Color(0xFF64748B)),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
        ),
      ],
    );
  }

  Future<void> _handleMenuAction(String value, PrinterProfile profile) async {
    switch (value) {
      case 'edit':
        _startEditing(profile);
        break;
      case 'default':
        ref
            .read(printerProfilesProvider.notifier)
            .setDefaultProfile(profile.id);
        break;
      case 'test':
        await _testPrint(profile);
        break;
      case 'delete':
        final confirm = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Delete Printer?'),
            content: const Text(
              'Are you sure you want to delete this profile?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text(
                  'Delete',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            ],
          ),
        );
        if (confirm == true) {
          ref.read(printerProfilesProvider.notifier).removeProfile(profile.id);
        }
        break;
    }
  }

  Widget _buildForm(Color accentColor) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;

        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildFormSection(
                    title: 'Basic Information',
                    icon: LucideIcons.info,
                    accentColor: accentColor,
                    children: [
                      TextFormField(
                        controller: _nameController,
                        decoration: _inputDecoration(
                          'Profile Name',
                          hint: 'e.g. Kitchen Printer',
                        ),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Name is required' : null,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<PrinterTransport>(
                        value: _transport,
                        decoration: _inputDecoration('Transport Type'),
                        items: PrinterTransport.values.map((t) {
                          return DropdownMenuItem(
                            value: t,
                            child: Text(
                              t.name.toUpperCase().replaceAll('_', ' '),
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _transport = value!;
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildFormSection(
                    title: 'Connection Details',
                    icon: LucideIcons.radio,
                    accentColor: accentColor,
                    children: [
                      if (_transport == PrinterTransport.network) ...[
                        if (isMobile) ...[
                          TextFormField(
                            controller: _ipController,
                            decoration: _inputDecoration(
                              'IP Address',
                              hint: '192.168.1.100',
                            ),
                            validator: (v) =>
                                v!.isEmpty ? 'IP is required' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _portController,
                            decoration: _inputDecoration('Port', hint: '9100'),
                            keyboardType: TextInputType.number,
                          ),
                        ] else ...[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 2,
                                child: TextFormField(
                                  controller: _ipController,
                                  decoration: _inputDecoration(
                                    'IP Address',
                                    hint: '192.168.1.100',
                                  ),
                                  validator: (v) =>
                                      v!.isEmpty ? 'IP is required' : null,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _portController,
                                  decoration: _inputDecoration(
                                    'Port',
                                    hint: '9100',
                                  ),
                                  keyboardType: TextInputType.number,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ] else if (_transport == PrinterTransport.bluetooth) ...[
                        TextFormField(
                          controller: _macController,
                          decoration: _inputDecoration(
                            'MAC Address',
                            hint: '00:11:22:33:44:55',
                          ),
                          validator: (v) =>
                              v!.isEmpty ? 'MAC is required' : null,
                        ),
                      ] else if (_transport == PrinterTransport.ble) ...[
                        TextFormField(
                          controller: _deviceIdController,
                          decoration: _inputDecoration(
                            'Device ID (UUID)',
                            hint: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
                            suffixIcon: IconButton(
                              icon: const Icon(LucideIcons.search),
                              onPressed: _showBleScanDialog,
                              tooltip: 'Scan for BLE Devices',
                            ),
                          ),
                          validator: (v) =>
                              v!.isEmpty ? 'ID is required' : null,
                        ),
                      ] else if (_transport == PrinterTransport.windows) ...[
                        TextFormField(
                          controller: _printerNameController,
                          decoration: _inputDecoration(
                            'Printer Name',
                            hint: 'POS-58',
                          ),
                          validator: (v) =>
                              v!.isEmpty ? 'Name is required' : null,
                        ),
                      ] else if (_transport == PrinterTransport.serial) ...[
                        TextFormField(
                          controller: _portNameController,
                          decoration: _inputDecoration(
                            'Serial Port',
                            hint: 'COM1 or /dev/ttyS0',
                            suffixIcon: IconButton(
                              icon: const Icon(LucideIcons.refreshCcw),
                              onPressed: _showSerialPortPicker,
                              tooltip: 'Scan for Ports',
                            ),
                          ),
                          validator: (v) =>
                              v!.isEmpty ? 'Port is required' : null,
                        ),
                      ] else ...[
                        const Text(
                          'Uses system default print dialog.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildFormSection(
                    title: 'Capabilities',
                    icon: LucideIcons.settings,
                    accentColor: accentColor,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<int>(
                              value: _paperWidth,
                              decoration: _inputDecoration('Paper Width'),
                              items: const [
                                DropdownMenuItem(
                                  value: 80,
                                  child: Text('80mm (Standard)'),
                                ),
                                DropdownMenuItem(
                                  value: 58,
                                  child: Text('58mm (Narrow)'),
                                ),
                              ],
                              onChanged: (v) =>
                                  setState(() => _paperWidth = v!),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (isMobile) ...[
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Auto Cut Paper'),
                          value: _cut,
                          onChanged: (v) => setState(() => _cut = v!),
                          activeColor: accentColor,
                        ),
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Open Cash Drawer'),
                          subtitle: const Text('After printing'),
                          value: _drawer,
                          onChanged: (v) => setState(() => _drawer = v!),
                          activeColor: accentColor,
                        ),
                      ] else ...[
                        Row(
                          children: [
                            Expanded(
                              child: CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                title: const Text('Auto Cut Paper'),
                                value: _cut,
                                onChanged: (v) => setState(() => _cut = v!),
                                activeColor: accentColor,
                              ),
                            ),
                            Expanded(
                              child: CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                title: const Text('Open Cash Drawer'),
                                subtitle: const Text('After printing'),
                                value: _drawer,
                                onChanged: (v) => setState(() => _drawer = v!),
                                activeColor: accentColor,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: _cancelEditing,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 16,
                          ),
                        ),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 16),
                      ElevatedButton.icon(
                        onPressed: _save,
                        icon: const Icon(LucideIcons.save),
                        label: const Text('Save Profile'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accentColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFormSection({
    required String title,
    required IconData icon,
    required Color accentColor,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: accentColor, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }

  Future<void> _showSerialPortPicker() async {
    final ports = DiscoveryService.getAvailableSerialPorts();
    if (ports.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('No serial ports found')));
      }
      return;
    }

    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ListTile(
            title: Text(
              'Select Serial Port',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          ...ports.map(
            (port) => ListTile(
              leading: const Icon(LucideIcons.hardDrive),
              title: Text(port),
              onTap: () => Navigator.pop(context, port),
            ),
          ),
        ],
      ),
    );

    if (selected != null) {
      setState(() {
        _portNameController.text = selected;
      });
    }
  }

  Future<void> _showBleScanDialog() async {
    // Check permissions first? (assuming handled by app start or native OS)

    showDialog(
      context: context,
      builder: (context) => const _BleScanDialog(),
    ).then((result) {
      if (result != null && result is ScanResult) {
        setState(() {
          _deviceIdController.text = result.device.remoteId.str;
        });
      }
    });
  }

  InputDecoration _inputDecoration(
    String label, {
    String? hint,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF0D9488), width: 2),
      ),
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  IconData _getIconForTransport(PrinterTransport transport) {
    switch (transport) {
      case PrinterTransport.network:
        return LucideIcons.network;
      case PrinterTransport.bluetooth:
        return LucideIcons.bluetooth;
      case PrinterTransport.ble:
        return LucideIcons.bluetooth;
      case PrinterTransport.windows:
        return LucideIcons.printer;
      case PrinterTransport.serial:
        return LucideIcons.hardDrive;
      case PrinterTransport.pdf:
        return LucideIcons.fileText;
    }
  }

  String _getConnectionSummary(PrinterProfile profile) {
    switch (profile.transport) {
      case PrinterTransport.network:
        return 'IP: ${profile.ip ?? 'N/A'}:${profile.port ?? 9100}';
      case PrinterTransport.bluetooth:
        return 'MAC: ${profile.macAddress ?? 'N/A'}';
      case PrinterTransport.ble:
        return 'ID: ${profile.deviceId ?? 'N/A'}';
      case PrinterTransport.windows:
        return 'Printer: ${profile.printerName ?? 'N/A'}';
      case PrinterTransport.serial:
        return 'Port: ${profile.portName ?? 'N/A'}';
      case PrinterTransport.pdf:
        return 'System Default Dialog';
    }
  }

  Future<void> _testPrint(PrinterProfile profile) async {
    try {
      final items = [
        CartItem(
          productId: 'test-1',
          name: 'Test Product 1',
          quantity: 1,
          price: 10.0,
        ),
        CartItem(
          productId: 'test-2',
          name: 'Test Product 2',
          quantity: 2,
          price: 7.5,
        ),
      ];

      await ref
          .read(printServiceProvider)
          .printReceipt(
            profile: profile,
            items: items,
            total: 25.0,
            layout: ref.read(printerProfilesProvider).receiptLayout,
          );

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Test print sent')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Test print failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class _BleScanDialog extends StatefulWidget {
  const _BleScanDialog();

  @override
  State<_BleScanDialog> createState() => _BleScanDialogState();
}

class _BleScanDialogState extends State<_BleScanDialog> {
  final List<ScanResult> _results = [];
  bool _isScanning = true;

  @override
  void initState() {
    super.initState();
    _startScan();
  }

  void _startScan() {
    setState(() {
      _results.clear();
      _isScanning = true;
    });

    DiscoveryService.scanBleDevices().listen((results) {
      if (mounted) {
        setState(() {
          _results.clear(); // FlutterBluePlus returns snapshot of all results
          _results.addAll(results);
        });
      }
    });

    // Auto stop after 5s (can also be handled by the service timeout)
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        setState(() {
          _isScanning = false;
        });
      }
    });
  }

  @override
  void dispose() {
    DiscoveryService.stopBleScan();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Text('Scanning BLE Devices'),
          if (_isScanning) ...[
            const SizedBox(width: 16),
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        height: 300,
        child: _results.isEmpty
            ? const Center(child: Text('No devices found'))
            : ListView.builder(
                itemCount: _results.length,
                itemBuilder: (context, index) {
                  final result = _results[index];
                  final name = result.device.platformName.isNotEmpty
                      ? result.device.platformName
                      : 'Unknown Device';
                  return ListTile(
                    title: Text(name),
                    subtitle: Text(result.device.remoteId.str),
                    trailing: Text('${result.rssi} dBm'),
                    onTap: () => Navigator.pop(context, result),
                  );
                },
              ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        if (!_isScanning)
          TextButton(onPressed: _startScan, child: const Text('Scan Again')),
      ],
    );
  }
}
