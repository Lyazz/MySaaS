import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/admin_user.dart';
import '../models/staff_role.dart';
import '../providers/admin_users_provider.dart';
import '../providers/staff_roles_provider.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/badges/status_badges.dart';
import '../theme/app_theme.dart';

class UsersScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const UsersScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  String _activeTab = 'users';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.autoFetch) {
      Future.microtask(() async {
        await ref.read(staffRolesProvider.notifier).fetchRoles();
        await ref.read(adminUsersProvider.notifier).fetchUsers();
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final usersState = ref.watch(adminUsersProvider);
    final rolesState = ref.watch(staffRolesProvider);
    final isMobile = MediaQuery.of(context).size.width < 800;

    final query = _searchController.text.trim().toLowerCase();
    final filteredUsers = query.isEmpty
        ? usersState.users
        : usersState.users.where((u) {
            return u.email.toLowerCase().contains(query) ||
                u.role.toLowerCase().contains(query);
          }).toList();

    final filteredRoles = query.isEmpty
        ? rolesState.roles
        : rolesState.roles.where((r) {
            return r.name.toLowerCase().contains(query);
          }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      body: Padding(
        padding: EdgeInsets.all(isMobile ? 12 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'admin.nav.users'.tr(),
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'admin.pages.users.subtitle'.tr(),
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isMobile) ...[
                  const SizedBox(width: 12),
                  AppButton.secondary(
                    label: 'admin.common.refresh'.tr(),
                    icon: LucideIcons.refreshCw,
                    onPressed: usersState.isLoading || rolesState.isLoading
                        ? null
                        : () async {
                            if (_activeTab == 'users') {
                              await ref
                                  .read(adminUsersProvider.notifier)
                                  .fetchUsers();
                            } else {
                              await ref
                                  .read(staffRolesProvider.notifier)
                                  .fetchRoles();
                            }
                          },
                  ),
                  const SizedBox(width: 12),
                  if (_activeTab == 'users')
                    AppButton.primary(
                      label: 'admin.pages.users.actions.add'.tr(),
                      icon: LucideIcons.userPlus,
                      onPressed: () => _openCreateUser(context),
                    )
                  else
                    AppButton.primary(
                      label: 'app.admin_pages_users_roles_action'.tr().tr(),
                      icon: LucideIcons.plus,
                      onPressed: () => _openCreateRole(context),
                    ),
                ],
              ],
            ),
            if (isMobile) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: AppButton.secondary(
                      label: 'admin.common.refresh'.tr(),
                      icon: LucideIcons.refreshCw,
                      onPressed: usersState.isLoading || rolesState.isLoading
                          ? null
                          : () async {
                              if (_activeTab == 'users') {
                                await ref
                                    .read(adminUsersProvider.notifier)
                                    .fetchUsers();
                              } else {
                                await ref
                                    .read(staffRolesProvider.notifier)
                                    .fetchRoles();
                              }
                            },
                      fullWidth: true,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _activeTab == 'users'
                        ? AppButton.primary(
                            label: 'admin.pages.users.actions.add'.tr(),
                            icon: LucideIcons.userPlus,
                            onPressed: () => _openCreateUser(context),
                            fullWidth: true,
                          )
                        : AppButton.primary(
                            label: 'app.admin_pages_users_roles_action'.tr()
                                .tr(),
                            icon: LucideIcons.plus,
                            onPressed: () => _openCreateRole(context),
                            fullWidth: true,
                          ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 20),
            _Tabs(
              active: _activeTab,
              onChange: (tab) => setState(() => _activeTab = tab),
            ),
            const SizedBox(height: 12),
            ResponsiveFilterBar(
              searchField: FormInput(
                label: 'admin.common.search'.tr(),
                controller: _searchController,
                hint: 'admin.pages.users.searchPlaceholder'.tr(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                onChanged: (_) => setState(() {}),
              ),
              filters: const [],
              onClearFilters: () => setState(_searchController.clear),
            ),
            const SizedBox(height: 12),
            if (_activeTab == 'users')
              Row(
                children: [
                  Checkbox(
                    value: usersState.includeInactive,
                    onChanged: usersState.isLoading
                        ? null
                        : (v) async {
                            await ref
                                .read(adminUsersProvider.notifier)
                                .fetchUsers(includeInactive: v == true);
                          },
                  ),
                  Text( 'app.admin_pages_users_includeinact'.tr().tr()),
                ],
              ),
            const SizedBox(height: 12),
            if (usersState.error != null || rolesState.error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.alertCircle, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        usersState.error ??
                            rolesState.error ??
                            'admin.common.error'.tr(),
                        style: const TextStyle(color: Color(0xFF991B1B)),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            Expanded(
              child: _activeTab == 'users'
                  ? _UsersTable(
                      loading: usersState.isLoading,
                      users: filteredUsers,
                      staffRoles: rolesState.roles,
                      onEdit: (u) => _openEditUser(context, u),
                      onDeactivate: (u) => _confirmDeactivate(context, u),
                    )
                  : _RolesTable(
                      loading: rolesState.isLoading,
                      roles: filteredRoles,
                      onEdit: (r) => _openEditRole(context, r),
                      onDelete: (r) => _confirmDeleteRole(context, r),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openCreateUser(BuildContext context) async {
    final roles = ref.read(staffRolesProvider).roles;
    final result = await showDialog<_UserFormResult>(
      context: context,
      builder: (ctx) => _UserDialog(
        title: 'admin.pages.users.create.title'.tr(),
        roles: roles,
        requirePassword: true,
      ),
    );
    if (result == null) return;
    await ref
        .read(adminUsersProvider.notifier)
        .createUser(
          email: result.email,
          password: result.password,
          role: result.role,
          staffRoleId: result.staffRoleId,
        );
  }

  Future<void> _openEditUser(BuildContext context, AdminUser user) async {
    final roles = ref.read(staffRolesProvider).roles;
    final result = await showDialog<_UserFormResult>(
      context: context,
      builder: (ctx) => _UserDialog(
        title: 'admin.pages.users.edit.title'.tr(),
        roles: roles,
        initialEmail: user.email,
        initialRole: user.role == 'owner' ? 'admin' : user.role,
        initialStaffRoleId: user.staffRoleId,
        showActiveToggle: user.role != 'owner',
        initialIsActive: user.isActive,
        requirePassword: false,
      ),
    );
    if (result == null) return;
    await ref
        .read(adminUsersProvider.notifier)
        .updateUser(
          user.id,
          email: result.email,
          password: result.password.isEmpty ? null : result.password,
          role: user.role == 'owner' ? null : result.role,
          staffRoleId: result.role == 'staff' ? result.staffRoleId ?? '' : '',
          isActive: user.role == 'owner' ? null : result.isActive,
        );
  }

  Future<void> _confirmDeactivate(BuildContext context, AdminUser user) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: 'admin.pages.users.actions.deactivate'.tr(),
        description: 'app.admin_pages_users_hints_deacti'.tr().tr(),
        content: Text(user.email),
        secondaryLabel: 'admin.common.cancel'.tr(),
        onSecondary: () => Navigator.of(ctx).pop(false),
        primaryLabel: 'admin.pages.users.actions.deactivate'.tr(),
        primaryVariant: AppDialogPrimaryVariant.destructive,
        onPrimary: () => Navigator.of(ctx).pop(true),
      ),
    );
    if (ok != true) return;
    await ref.read(adminUsersProvider.notifier).deactivateUser(user.id);
  }

  Future<void> _openCreateRole(BuildContext context) async {
    final result = await showDialog<_RoleFormResult>(
      context: context,
      builder: (ctx) =>
          _RoleDialog(title: 'app.admin_pages_users_roles_create'.tr().tr()),
    );
    if (result == null) return;
    await ref
        .read(staffRolesProvider.notifier)
        .createRole(name: result.name, permissions: result.permissions);
  }

  Future<void> _openEditRole(BuildContext context, StaffRole role) async {
    final result = await showDialog<_RoleFormResult>(
      context: context,
      builder: (ctx) => _RoleDialog(
        title: 'app.admin_pages_users_roles_editti'.tr().tr(),
        initialName: role.name,
        initialPermissions: role.permissions,
      ),
    );
    if (result == null) return;
    await ref
        .read(staffRolesProvider.notifier)
        .updateRole(
          role.id,
          name: result.name,
          permissions: result.permissions,
        );
  }

  Future<void> _confirmDeleteRole(BuildContext context, StaffRole role) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: 'app.admin_confirmmodal_defaults_ti'.tr().tr(),
        description: 'app.admin_confirmmodal_defaults_me'.tr().tr(),
        content: Text(role.name),
        secondaryLabel: 'admin.common.cancel'.tr(),
        onSecondary: () => Navigator.of(ctx).pop(false),
        primaryLabel: 'admin.common.delete'.tr(),
        primaryVariant: AppDialogPrimaryVariant.destructive,
        onPrimary: () => Navigator.of(ctx).pop(true),
      ),
    );
    if (ok != true) return;
    await ref.read(staffRolesProvider.notifier).deleteRole(role.id);
  }
}

class _Tabs extends StatelessWidget {
  final String active;
  final ValueChanged<String> onChange;

  const _Tabs({required this.active, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _TabButton(
            label: 'admin.pages.users.tabs.users'.tr(),
            active: active == 'users',
            onTap: () => onChange('users'),
          ),
          _TabButton(
            label: 'admin.pages.users.tabs.roles'.tr(),
            active: active == 'roles',
            onTap: () => onChange('roles'),
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        backgroundColor: active
            ? (isDark ? AppColors.surface3 : Colors.white)
            : Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: active
              ? (isDark ? AppColors.textPrimary : const Color(0xFF0F172A))
              : const Color(0xFF64748B),
        ),
      ),
    );
  }
}

class _UsersTable extends StatelessWidget {
  final bool loading;
  final List<AdminUser> users;
  final List<StaffRole> staffRoles;
  final ValueChanged<AdminUser> onEdit;
  final ValueChanged<AdminUser> onDeactivate;

  const _UsersTable({
    required this.loading,
    required this.users,
    required this.staffRoles,
    required this.onEdit,
    required this.onDeactivate,
  });

  String _roleName(String? staffRoleId) {
    if (staffRoleId == null || staffRoleId.isEmpty) return '—';
    for (final role in staffRoles) {
      if (role.id == staffRoleId) return role.name;
    }
    return '—';
  }

  @override
  Widget build(BuildContext context) {
    return ResponsivePaginatedTable<AdminUser>(
      items: users,
      isLoading: loading,
      emptyState: Center(child: Text('admin.pages.users.empty'.tr())),
      minWidth: 980,
      header: Row(
        children: [
          _buildHeaderCell('admin.pages.users.columns.email'.tr(), flex: 4),
          _buildHeaderCell('admin.pages.users.columns.role'.tr(), flex: 2),
          _buildHeaderCell('admin.pages.users.columns.staffRole'.tr(), flex: 3),
          _buildHeaderCell('admin.pages.users.columns.status'.tr(), flex: 2),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText('admin.common.actions'.tr()),
            ),
          ),
        ],
      ),
      rowBuilder: (context, u, index) {
        final staffRole = u.role == 'staff' ? _roleName(u.staffRoleId) : '—';
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 4,
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: u.isActive
                          ? const Color(0xFFDCFCE7) // Green-100
                          : const Color(0xFFE2E8F0), // Slate-200
                      child: Text(
                        u.email.isNotEmpty ? u.email[0].toUpperCase() : '?',
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        u.email,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  u.role.toUpperCase(),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: Color(0xFF334155), // Slate-700
                  ),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  staffRole,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: staffRole == '—'
                        ? const Color(0xFF94A3B8) // Slate-400
                        : const Color(0xFF475569), // Slate-600
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: ActiveBadge(isActive: u.isActive),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(
                    spacing: 8,
                    children: [
                      TableActionButton(
                        tooltip: 'admin.common.edit'.tr(),
                        icon: LucideIcons.pencil,
                        onPressed: () => onEdit(u),
                      ),
                      if (u.isActive && u.role != 'owner')
                        TableActionButton(
                          tooltip: 'admin.pages.users.actions.deactivate'.tr(),
                          onPressed: () => onDeactivate(u),
                          icon: LucideIcons.userX,
                          isDanger: true,
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _headerText(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF64748B), // Slate-500
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(flex: flex, child: _headerText(text));
  }
}

class _RolesTable extends StatelessWidget {
  final bool loading;
  final List<StaffRole> roles;
  final ValueChanged<StaffRole> onEdit;
  final ValueChanged<StaffRole> onDelete;

  const _RolesTable({
    required this.loading,
    required this.roles,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsivePaginatedTable<StaffRole>(
      items: roles,
      isLoading: loading,
      emptyState: Center(child: Text('admin.pages.users.roles.empty'.tr())),
      minWidth: 900,
      header: Row(
        children: [
          _buildHeaderCell(
            'admin.pages.users.roles.columns.name'.tr(),
            flex: 5,
          ),
          _buildHeaderCell(
            'admin.pages.users.roles.columns.permissions'.tr(),
            flex: 2,
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: _headerText('admin.common.actions'.tr()),
            ),
          ),
        ],
      ),
      rowBuilder: (context, r, index) {
        final count = r.permissions.fold<int>(
          0,
          (sum, p) => sum + p.actions.length,
        );
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 5,
                child: Text(
                  r.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$count ${'admin.common.actions'.tr()}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(
                    spacing: 8,
                    children: [
                      TableActionButton(
                        tooltip: 'admin.common.edit'.tr(),
                        icon: LucideIcons.pencil,
                        onPressed: () => onEdit(r),
                      ),
                      TableActionButton(
                        tooltip: 'admin.common.delete'.tr(),
                        icon: LucideIcons.trash2,
                        isDanger: true,
                        onPressed: () => onDelete(r),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _headerText(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF64748B), // Slate-500
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildHeaderCell(String text, {required int flex}) {
    return Expanded(flex: flex, child: _headerText(text));
  }
}

class _UserFormResult {
  final String email;
  final String password;
  final String role;
  final String? staffRoleId;
  final bool? isActive;

  _UserFormResult({
    required this.email,
    required this.password,
    required this.role,
    required this.staffRoleId,
    required this.isActive,
  });
}

class _UserDialog extends StatefulWidget {
  final String title;
  final List<StaffRole> roles;
  final String? initialEmail;
  final String? initialRole;
  final String? initialStaffRoleId;
  final bool showActiveToggle;
  final bool initialIsActive;
  final bool requirePassword;

  const _UserDialog({
    required this.title,
    required this.roles,
    this.initialEmail,
    this.initialRole,
    this.initialStaffRoleId,
    this.showActiveToggle = false,
    this.initialIsActive = true,
    this.requirePassword = true,
  });

  @override
  State<_UserDialog> createState() => _UserDialogState();
}

class _UserDialogState extends State<_UserDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _password;
  late String _role;
  String? _staffRoleId;
  late bool _isActive;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.initialEmail ?? '');
    _password = TextEditingController();
    _role = widget.initialRole ?? 'staff';
    _staffRoleId = widget.initialStaffRoleId;
    _isActive = widget.initialIsActive;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: widget.title,
      description: 'app.create_or_update_an_admin_staf'.tr(),
      maxWidth: 720,
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormInput(
              label: 'admin.pages.users.fields.email'.tr(),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Email required' : null,
            ),
            const SizedBox(height: 16),
            FormInput(
              label: 'superAdmin.login.form.password.label'.tr(),
              controller: _password,
              obscureText: true,
              validator: (v) {
                if (!widget.requirePassword) return null;
                if (v == null || v.trim().isEmpty) return 'Password required';
                if (v.trim().length < 8) return 'Min 8 characters';
                return null;
              },
            ),
            SizedBox(height: 16),
            FormSelect<String>(
              label: 'admin.pages.users.fields.role'.tr(),
              value: _role,
              items: [
                DropdownMenuItem(value: 'staff', child: Text( 'admin.roles.staff'.tr())),
                DropdownMenuItem(value: 'admin', child: Text( 'admin.roles.admin'.tr())),
              ],
              onChanged: (v) {
                if (v == null) return;
                setState(() {
                  _role = v;
                  if (_role != 'staff') _staffRoleId = null;
                });
              },
            ),
            if (_role == 'staff') ...[
              const SizedBox(height: 16),
              FormSelect<String?>(
                label: 'admin.pages.users.fields.staffRole'.tr(),
                value: _staffRoleId,
                items: [
                  DropdownMenuItem<String?>(
                    value: null,
                    child: Text( 'app.no_staff_role'.tr()),
                  ),
                  ...widget.roles.map(
                    (r) => DropdownMenuItem<String?>(
                      value: r.id,
                      child: Text(r.name),
                    ),
                  ),
                ],
                onChanged: (v) => setState(() => _staffRoleId = v),
              ),
            ],
            if (widget.showActiveToggle) ...[
              const SizedBox(height: 8),
              SwitchListTile(
                title: Text( 'superAdmin.tenants.status.active'.tr()),
                value: _isActive,
                onChanged: (v) => setState(() => _isActive = v),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ],
        ),
      ),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.of(context).pop(),
      primaryLabel: 'Save',
      onPrimary: () {
        if (!_formKey.currentState!.validate()) return;
        Navigator.of(context).pop(
          _UserFormResult(
            email: _email.text,
            password: _password.text,
            role: _role,
            staffRoleId: _staffRoleId,
            isActive: widget.showActiveToggle ? _isActive : null,
          ),
        );
      },
    );
  }
}

class _RoleFormResult {
  final String name;
  final List<StaffRolePermissionGroup> permissions;

  _RoleFormResult({required this.name, required this.permissions});
}

class _RoleDialog extends StatefulWidget {
  final String title;
  final String? initialName;
  final List<StaffRolePermissionGroup>? initialPermissions;

  const _RoleDialog({
    required this.title,
    this.initialName,
    this.initialPermissions,
  });

  @override
  State<_RoleDialog> createState() => _RoleDialogState();
}

class _RoleDialogState extends State<_RoleDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final Map<String, Set<String>> _selected;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.initialName ?? '');
    _selected = {for (final r in StaffRole.resources) r: <String>{}};
    final initial =
        widget.initialPermissions ?? const <StaffRolePermissionGroup>[];
    for (final p in initial) {
      if (!_selected.containsKey(p.resource)) continue;
      _selected[p.resource] = p.actions.toSet();
    }
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: widget.title,
      description: 'app.define_a_role_and_its_permissi'.tr(),
      maxWidth: 840,
      content: Form(
        key: _formKey,
        child: Column(
          children: [
            FormInput(
              label: 'app.role_name'.tr(),
              controller: _name,
              validator: (v) => (v == null || v.trim().length < 2)
                  ? 'Name is too short'
                  : null,
            ),
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerLeft,
              child: Text( 'admin.pages.users.roles.fields.permissions'.tr(),
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ),
            const SizedBox(height: 12),
            for (final resource in StaffRole.resources)
              _PermissionRow(
                resource: resource,
                selectedActions: _selected[resource]!,
                onToggle: (action, next) {
                  setState(() {
                    final set = _selected[resource]!;
                    if (next) {
                      set.add(action);
                    } else {
                      set.remove(action);
                    }
                  });
                },
              ),
          ],
        ),
      ),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.of(context).pop(),
      primaryLabel: 'Save',
      onPrimary: () {
        if (!_formKey.currentState!.validate()) return;
        final perms = <StaffRolePermissionGroup>[];
        for (final entry in _selected.entries) {
          if (entry.value.isEmpty) continue;
          perms.add(
            StaffRolePermissionGroup(
              resource: entry.key,
              actions: entry.value.toList(),
            ),
          );
        }
        if (perms.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text( 'app.select_at_least_one_permission'.tr())),
          );
          return;
        }
        Navigator.of(
          context,
        ).pop(_RoleFormResult(name: _name.text, permissions: perms));
      },
    );
  }
}

class _PermissionRow extends StatelessWidget {
  final String resource;
  final Set<String> selectedActions;
  final void Function(String action, bool next) onToggle;

  const _PermissionRow({
    required this.resource,
    required this.selectedActions,
    required this.onToggle,
  });

  String _label(String resource) {
    return resource
        .replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(0)}')
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _label(resource),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            children: [
              for (final action in StaffRole.actions)
                FilterChip(
                  label: Text(action),
                  selected: selectedActions.contains(action),
                  onSelected: (v) => onToggle(action, v),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
