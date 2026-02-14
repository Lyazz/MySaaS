import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/suppliers_provider.dart';
import '../models/supplier.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';

class SuppliersScreen extends ConsumerStatefulWidget {
  const SuppliersScreen({super.key});

  @override
  ConsumerState<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends ConsumerState<SuppliersScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(suppliersProvider.notifier).fetchSuppliers();
    });
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final suppliersState = ref.watch(suppliersProvider);
    final suppliers = suppliersState.suppliers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/suppliers/create'),
              backgroundColor: const Color(0xFF0F172A),
              child: const Icon(LucideIcons.plus, color: Colors.white),
            )
          : null,
      body: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMobile) ...[
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Suppliers',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF111827), // Gray-900
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Manage your suppliers list',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 14,
                        ), // Gray-500
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/suppliers/create'),
                    icon: const Icon(LucideIcons.plus, size: 16),
                    label: const Text('Add Supplier'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981), // Emerald-500
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            // Search and Sort
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Search suppliers...',
                        prefixIcon: Icon(
                          LucideIcons.search,
                          size: 18,
                          color: Color(0xFF9CA3AF),
                        ),
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      onChanged: (value) =>
                          _searchDebouncer.run(() => setState(() {})),
                    ),
                  ),
                  Container(
                    height: 24,
                    width: 1,
                    color: const Color(0xFFE5E7EB),
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Row(
                      children: [
                        const Text(
                          'Sort by:',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            children: [
                              const Text(
                                'Name',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF374151),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                LucideIcons.chevronDown,
                                size: 14,
                                color: Color(0xFF6B7280),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: suppliersState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildSuppliersTable(suppliers),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuppliersTable(List<Supplier> suppliers) {
    return ResponsivePaginatedTable<Supplier>(
      items: suppliers,
      minWidth: 900,
      header: const Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              'NAME',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              'INFO',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              'ADDRESS',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          SizedBox(
            width: 140,
            child: Text(
              'ACTIONS',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
      rowBuilder: (context, supplier, index) {
        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
            vertical: 16,
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5), // Emerald-50
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        supplier.name.isNotEmpty
                            ? supplier.name[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF10B981), // Emerald-500
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      supplier.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827), // Gray-900
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (supplier.email != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            const Icon(
                              LucideIcons.mail,
                              size: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              supplier.email!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF4B5563), // Gray-600
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (supplier.phone != null)
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.phone,
                            size: 12,
                            color: Color(0xFF9CA3AF),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            supplier.phone!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563), // Gray-600
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  supplier.address ?? '-',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(
                width: 140,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    InkWell(
                      onTap: () => context.go('/suppliers/${supplier.id}'),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        child: Row(
                          children: const [
                            Icon(
                              LucideIcons.pencil,
                              size: 14,
                              color: Color(0xFF10B981),
                            ), // Emerald-500
                            SizedBox(width: 4),
                            Text(
                              'Edit',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () => _confirmDelete(supplier),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        child: Row(
                          children: const [
                            Icon(
                              LucideIcons.trash2,
                              size: 14,
                              color: Color(0xFFEF4444),
                            ), // Red-500
                            SizedBox(width: 4),
                            Text(
                              'Delete',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFFEF4444),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmDelete(Supplier supplier) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Supplier'),
        content: Text(
          'Are you sure you want to delete ${supplier.name}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFDC2626), // Red-600
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(suppliersProvider.notifier).deleteSupplier(supplier.id);
    }
  }
}
