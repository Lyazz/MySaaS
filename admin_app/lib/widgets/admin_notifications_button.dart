import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/admin_notification.dart';
import '../providers/notifications_provider.dart';
import '../theme/app_theme.dart';

// ---------------------------------------------------------------------------
// Public entry point – drop-in replacement for the old widget
// ---------------------------------------------------------------------------

class AdminNotificationsButton extends ConsumerStatefulWidget {
  const AdminNotificationsButton({super.key, this.compact = false});

  final bool compact;

  @override
  ConsumerState<AdminNotificationsButton> createState() =>
      _AdminNotificationsButtonState();
}

class _AdminNotificationsButtonState
    extends ConsumerState<AdminNotificationsButton>
    with SingleTickerProviderStateMixin {
  final _overlayController = OverlayPortalController();
  final _buttonKey = GlobalKey();
  bool _hovered = false;

  // Bell pulse animation
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  void _onUnreadChanged(int count) {
    if (count > 0 && !_pulseCtrl.isAnimating) {
      _pulseCtrl.repeat(reverse: true);
    } else if (count == 0) {
      _pulseCtrl.stop();
      _pulseCtrl.reset();
    }
  }

  Offset _getDropdownOffset() {
    final box =
        _buttonKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return Offset.zero;
    final position = box.localToGlobal(Offset.zero);
    final size = box.size;
    return Offset(position.dx + size.width - 380, position.dy + size.height + 8);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminNotificationsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Side-effect: animate bell on unread change
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _onUnreadChanged(state.unreadCount);
    });

    final borderColor =
        isDark ? AppColors.surfaceBorder : AppColors.lightSidebarBorder;
    final hoverBg =
        isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final iconColor =
        isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final hoverColor =
        isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    return OverlayPortal(
      controller: _overlayController,
      overlayChildBuilder: (context) => _NotificationDropdown(
        state: state,
        isDark: isDark,
        offset: _getDropdownOffset(),
        onClose: _overlayController.hide,
        onNavigate: (item) async {
          _overlayController.hide();
          // Keep a reference to the main widget's context before await
          final mainContext = this.context;
          await ref
              .read(adminNotificationsProvider.notifier)
              .markRead(item.id);
          if (!mainContext.mounted) return;
          _openNotification(mainContext, item);
        },
        onMarkAllRead: () =>
            ref.read(adminNotificationsProvider.notifier).markAllRead(),
        onRefresh: () =>
            ref.read(adminNotificationsProvider.notifier).refresh(),
        onViewAll: () {
          _overlayController.hide();
          final mainContext = this.context;
          if (!mainContext.mounted) return;
          mainContext.go('/notifications');
        },
      ),
      child: MouseRegion(
        key: _buttonKey,
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: () {
            if (_overlayController.isShowing) {
              _overlayController.hide();
            } else {
              ref.read(adminNotificationsProvider.notifier).refresh();
              _overlayController.show();
            }
          },
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: _overlayController.isShowing
                      ? hoverBg
                      : (_hovered ? hoverBg : Colors.transparent),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                ),
                child: ScaleTransition(
                  scale: _pulseAnim,
                  child: Icon(
                    LucideIcons.bell,
                    size: 16,
                    color: _hovered || _overlayController.isShowing
                        ? hoverColor
                        : iconColor,
                  ),
                ),
              ),
              if (state.unreadCount > 0)
                Positioned(
                  right: -5,
                  top: -5,
                  child: _AnimatedBadge(count: state.unreadCount, isDark: isDark),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _openNotification(BuildContext context, AdminNotification item) {
    final route = item.data['route']?.trim();
    if (route != null && route.isNotEmpty) {
      context.go(route);
      return;
    }
    final orderId = item.data['orderId']?.trim();
    if (orderId != null && orderId.isNotEmpty) {
      context.go('/orders/$orderId');
    }
  }
}

// ---------------------------------------------------------------------------
// Animated badge
// ---------------------------------------------------------------------------

class _AnimatedBadge extends StatefulWidget {
  const _AnimatedBadge({required this.count, required this.isDark});
  final int count;
  final bool isDark;

  @override
  State<_AnimatedBadge> createState() => _AnimatedBadgeState();
}

class _AnimatedBadgeState extends State<_AnimatedBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _scaleAnim =
        CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut);
    _ctrl.forward();
  }

  @override
  void didUpdateWidget(_AnimatedBadge old) {
    super.didUpdateWidget(old);
    if (old.count != widget.count) {
      _ctrl.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnim,
      child: Container(
        constraints: const BoxConstraints(minWidth: 17),
        height: 17,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.brand,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: widget.isDark
                ? AppColors.contentBg
                : AppColors.lightTopbarBg,
          ),
        ),
        child: Center(
          child: Text(
            widget.count > 9 ? '9+' : '${widget.count}',
            style: const TextStyle(
              color: AppColors.brandContrast,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Full-panel dropdown overlay
// ---------------------------------------------------------------------------

class _NotificationDropdown extends StatefulWidget {
  const _NotificationDropdown({
    required this.state,
    required this.isDark,
    required this.offset,
    required this.onClose,
    required this.onNavigate,
    required this.onMarkAllRead,
    required this.onRefresh,
    required this.onViewAll,
  });

  final AdminNotificationsState state;
  final bool isDark;
  final Offset offset;
  final VoidCallback onClose;
  final ValueChanged<AdminNotification> onNavigate;
  final VoidCallback onMarkAllRead;
  final VoidCallback onRefresh;
  final VoidCallback onViewAll;

  @override
  State<_NotificationDropdown> createState() => _NotificationDropdownState();
}

class _NotificationDropdownState extends State<_NotificationDropdown>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _fadeAnim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    // Clamp panel so it never goes off-screen
    final left = widget.offset.dx.clamp(8.0, screenSize.width - 388.0);
    final top = widget.offset.dy.clamp(8.0, screenSize.height - 60.0);

    return Stack(
      children: [
        // Backdrop
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: widget.onClose,
          ),
        ),
        // Panel
        Positioned(
          left: left,
          top: top,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SlideTransition(
              position: _slideAnim,
              child: _NotificationPanel(
                state: widget.state,
                isDark: widget.isDark,
                onNavigate: widget.onNavigate,
                onMarkAllRead: widget.onMarkAllRead,
                onRefresh: widget.onRefresh,
                onClose: widget.onClose,
                onViewAll: widget.onViewAll,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// The panel itself
// ---------------------------------------------------------------------------

class _NotificationPanel extends StatelessWidget {
  const _NotificationPanel({
    required this.state,
    required this.isDark,
    required this.onNavigate,
    required this.onMarkAllRead,
    required this.onRefresh,
    required this.onClose,
    required this.onViewAll,
  });

  final AdminNotificationsState state;
  final bool isDark;
  final ValueChanged<AdminNotification> onNavigate;
  final VoidCallback onMarkAllRead;
  final VoidCallback onRefresh;
  final VoidCallback onClose;
  final VoidCallback onViewAll;

  Color get _surface =>
      isDark ? AppColors.surface2 : AppColors.lightSurface1;
  Color get _border =>
      isDark ? AppColors.surfaceBorder : AppColors.lightSidebarBorder;
  Color get _textPrimary =>
      isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
  Color get _textSecondary =>
      isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
  Color get _textTertiary =>
      isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
  Color get _divider =>
      isDark ? AppColors.surfaceBorder : AppColors.lightSidebarBorder;
  Color get _hoverBg =>
      isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;

  @override
  Widget build(BuildContext context) {
    // Group items into today / earlier
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final List<AdminNotification> todayItems = [];
    final List<AdminNotification> earlierItems = [];

    for (final item in state.items.take(20)) {
      if (item.createdAt.isAfter(todayStart)) {
        todayItems.add(item);
      } else {
        earlierItems.add(item);
      }
    }

    return Material(
      color: Colors.transparent,
      child: Container(
        width: 380,
        constraints: const BoxConstraints(maxHeight: 560),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
              blurRadius: 28,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Accent bar ─────────────────────────────────────────────
              Container(
                height: 3,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.brand, Color(0xFF86EFAC)],
                  ),
                ),
              ),

              // ── Header ─────────────────────────────────────────────────
              _PanelHeader(
                unreadCount: state.unreadCount,
                isLoading: state.isLoading,
                isDark: isDark,
                textPrimary: _textPrimary,
                textSecondary: _textSecondary,
                textTertiary: _textTertiary,
                border: _border,
                hoverBg: _hoverBg,
                onRefresh: onRefresh,
                onMarkAllRead: state.unreadCount > 0 ? onMarkAllRead : null,
                onClose: onClose,
              ),

              // ── Divider ─────────────────────────────────────────────────
              Divider(height: 1, thickness: 1, color: _divider),

              // ── Content ─────────────────────────────────────────────────
              Flexible(
                child: _buildBody(context, todayItems, earlierItems),
              ),

              // ── Footer ─────────────────────────────────────────────────
              if (state.items.isNotEmpty) ...[
                Divider(height: 1, thickness: 1, color: _divider),
                _PanelFooter(
                  isDark: isDark,
                  textTertiary: _textTertiary,
                  textPrimary: _textPrimary,
                  hoverBg: _hoverBg,
                  border: _border,
                  onViewAll: onViewAll,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    List<AdminNotification> todayItems,
    List<AdminNotification> earlierItems,
  ) {
    if (state.isLoading && state.items.isEmpty) {
      return _LoadingState(isDark: isDark, textTertiary: _textTertiary);
    }

    if (state.items.isEmpty) {
      return _EmptyState(isDark: isDark, textPrimary: _textPrimary,
          textSecondary: _textSecondary);
    }

    return ListView(
      shrinkWrap: true,
      padding: EdgeInsets.zero,
      children: [
        if (todayItems.isNotEmpty) ...[
          _SectionLabel(label: 'Today', isDark: isDark,
              textTertiary: _textTertiary),
          ...todayItems.asMap().entries.map((e) => _NotificationRow(
                item: e.value,
                isDark: isDark,
                index: e.key,
                textPrimary: _textPrimary,
                textSecondary: _textSecondary,
                textTertiary: _textTertiary,
                dividerColor: _divider,
                onTap: () => onNavigate(e.value),
              )),
        ],
        if (earlierItems.isNotEmpty) ...[
          _SectionLabel(label: 'Earlier', isDark: isDark,
              textTertiary: _textTertiary),
          ...earlierItems.asMap().entries.map((e) => _NotificationRow(
                item: e.value,
                isDark: isDark,
                index: todayItems.length + e.key,
                textPrimary: _textPrimary,
                textSecondary: _textSecondary,
                textTertiary: _textTertiary,
                dividerColor: _divider,
                onTap: () => onNavigate(e.value),
              )),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Panel header
// ---------------------------------------------------------------------------

class _PanelHeader extends StatelessWidget {
  const _PanelHeader({
    required this.unreadCount,
    required this.isLoading,
    required this.isDark,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.border,
    required this.hoverBg,
    required this.onRefresh,
    required this.onMarkAllRead,
    required this.onClose,
  });

  final int unreadCount;
  final bool isLoading;
  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color border;
  final Color hoverBg;
  final VoidCallback onRefresh;
  final VoidCallback? onMarkAllRead;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Icon + title
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.brand, Color(0xFF86EFAC)],
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.bell,
              size: 16,
              color: AppColors.brandContrast,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Notifications',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    if (unreadCount > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.brand.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '$unreadCount new',
                          style: const TextStyle(
                            color: AppColors.brand,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                Text(
                  unreadCount == 0
                      ? 'All caught up'
                      : '$unreadCount unread notification${unreadCount == 1 ? '' : 's'}',
                  style: TextStyle(color: textTertiary, fontSize: 11),
                ),
              ],
            ),
          ),
          // Actions
          Row(
            children: [
              if (onMarkAllRead != null)
                _HeaderAction(
                  icon: LucideIcons.checkCheck,
                  tooltip: 'Mark all read',
                  isDark: isDark,
                  hoverBg: hoverBg,
                  textTertiary: textTertiary,
                  border: border,
                  onPressed: onMarkAllRead!,
                ),
              const SizedBox(width: 4),
              _HeaderAction(
                icon: LucideIcons.refreshCw,
                tooltip: 'Refresh',
                isDark: isDark,
                hoverBg: hoverBg,
                textTertiary: textTertiary,
                border: border,
                onPressed: onRefresh,
                isLoading: isLoading,
              ),
              const SizedBox(width: 4),
              _HeaderAction(
                icon: LucideIcons.x,
                tooltip: 'Close',
                isDark: isDark,
                hoverBg: hoverBg,
                textTertiary: textTertiary,
                border: border,
                onPressed: onClose,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Small hoverable icon button for the header
class _HeaderAction extends StatefulWidget {
  const _HeaderAction({
    required this.icon,
    required this.tooltip,
    required this.isDark,
    required this.hoverBg,
    required this.textTertiary,
    required this.border,
    required this.onPressed,
    this.isLoading = false,
  });

  final IconData icon;
  final String tooltip;
  final bool isDark;
  final Color hoverBg;
  final Color textTertiary;
  final Color border;
  final VoidCallback onPressed;
  final bool isLoading;

  @override
  State<_HeaderAction> createState() => _HeaderActionState();
}

class _HeaderActionState extends State<_HeaderAction>
    with SingleTickerProviderStateMixin {
  bool _hovered = false;
  late final AnimationController _spinCtrl;

  @override
  void initState() {
    super.initState();
    _spinCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    if (widget.isLoading) _spinCtrl.repeat();
  }

  @override
  void didUpdateWidget(_HeaderAction old) {
    super.didUpdateWidget(old);
    if (widget.isLoading && !_spinCtrl.isAnimating) {
      _spinCtrl.repeat();
    } else if (!widget.isLoading) {
      _spinCtrl.stop();
      _spinCtrl.reset();
    }
  }

  @override
  void dispose() {
    _spinCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.tooltip,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 130),
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _hovered
                  ? widget.hoverBg
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: widget.border),
            ),
            child: AnimatedBuilder(
              animation: _spinCtrl,
              builder: (_, child) => Transform.rotate(
                angle: _spinCtrl.value * 2 * math.pi,
                child: child,
              ),
              child: Icon(
                widget.icon,
                size: 13,
                color: _hovered
                    ? (widget.isDark
                        ? AppColors.textPrimary
                        : AppColors.lightTextPrimary)
                    : widget.textTertiary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({
    required this.label,
    required this.isDark,
    required this.textTertiary,
  });

  final String label;
  final bool isDark;
  final Color textTertiary;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: textTertiary,
          fontSize: 9.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.9,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Notification row
// ---------------------------------------------------------------------------

class _NotificationRow extends StatefulWidget {
  const _NotificationRow({
    required this.item,
    required this.isDark,
    required this.index,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.dividerColor,
    required this.onTap,
  });

  final AdminNotification item;
  final bool isDark;
  final int index;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color dividerColor;
  final VoidCallback onTap;

  @override
  State<_NotificationRow> createState() => _NotificationRowState();
}

class _NotificationRowState extends State<_NotificationRow>
    with SingleTickerProviderStateMixin {
  bool _hovered = false;
  late final AnimationController _enterCtrl;
  late final Animation<double> _fadeIn;
  late final Animation<Offset> _slideIn;

  @override
  void initState() {
    super.initState();
    _enterCtrl = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 260 + widget.index * 35),
    );
    _fadeIn = CurvedAnimation(parent: _enterCtrl, curve: Curves.easeOut);
    _slideIn = Tween<Offset>(
      begin: const Offset(0.04, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _enterCtrl, curve: Curves.easeOut));
    _enterCtrl.forward();
  }

  @override
  void dispose() {
    _enterCtrl.dispose();
    super.dispose();
  }

  Color get _iconBg {
    if (widget.item.isUnread) {
      return AppColors.brand.withValues(alpha: 0.15);
    }
    return widget.isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
  }

  Color get _rowBg {
    if (_hovered) {
      return widget.isDark
          ? AppColors.navHoverBg
          : AppColors.lightNavHoverBg;
    }
    if (widget.item.isUnread) {
      return AppColors.brand.withValues(alpha: 0.04);
    }
    return Colors.transparent;
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeIn,
      child: SlideTransition(
        position: _slideIn,
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() => _hovered = true),
          onExit: (_) => setState(() => _hovered = false),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 130),
              color: _rowBg,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Icon ──────────────────────────────────────────────
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 130),
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _iconBg,
                      borderRadius: BorderRadius.circular(10),
                      border: widget.item.isUnread
                          ? Border.all(
                              color: AppColors.brand.withValues(alpha: 0.3))
                          : null,
                    ),
                    child: Icon(
                      _iconFor(widget.item),
                      size: 16,
                      color: widget.item.isUnread
                          ? AppColors.brand
                          : widget.textTertiary,
                    ),
                  ),
                  const SizedBox(width: 11),
                  // ── Text ─────────────────────────────────────────────
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Text(
                                widget.item.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: widget.textPrimary,
                                  fontSize: 12.5,
                                  fontWeight: widget.item.isUnread
                                      ? FontWeight.w700
                                      : FontWeight.w600,
                                  letterSpacing: -0.1,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _formatTime(widget.item.createdAt),
                              style: TextStyle(
                                color: widget.textTertiary,
                                fontSize: 10,
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                            if (widget.item.isUnread) ...[
                              const SizedBox(width: 6),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: AppColors.brand,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          widget.item.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: widget.textSecondary,
                            fontSize: 11.5,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Arrow on hover
                  AnimatedOpacity(
                    opacity: _hovered ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 130),
                    child: Padding(
                      padding: const EdgeInsets.only(left: 6, top: 4),
                      child: Icon(
                        LucideIcons.arrowRight,
                        size: 13,
                        color: widget.textTertiary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return DateFormat('MMM d').format(dt);
  }

  IconData _iconFor(AdminNotification item) {
    if (item.type == 'ORDER_CREATED' || item.entityType == 'ORDER') {
      return LucideIcons.shoppingBag;
    }
    if (item.entityType == 'PRODUCT') return LucideIcons.package;
    if (item.entityType == 'CUSTOMER') return LucideIcons.user;
    if (item.entityType == 'PAYMENT') return LucideIcons.creditCard;
    return LucideIcons.bell;
  }
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

class _LoadingState extends StatefulWidget {
  const _LoadingState({required this.isDark, required this.textTertiary});
  final bool isDark;
  final Color textTertiary;

  @override
  State<_LoadingState> createState() => _LoadingStateState();
}

class _LoadingStateState extends State<_LoadingState>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _shimmer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _shimmer = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(
          3,
          (i) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AnimatedBuilder(
              animation: _shimmer,
              builder: (_, __) {
                final opacity = 0.04 + 0.06 * (0.5 + 0.5 * math.sin(
                  _shimmer.value * 2 * math.pi + i * 0.8,
                ));
                return Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: (widget.isDark ? Colors.white : Colors.black)
                            .withValues(alpha: opacity * 1.5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 11,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: (widget.isDark ? Colors.white : Colors.black)
                                  .withValues(alpha: opacity),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 9,
                            width: 160,
                            decoration: BoxDecoration(
                              color: (widget.isDark ? Colors.white : Colors.black)
                                  .withValues(alpha: opacity * 0.7),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyState extends StatefulWidget {
  const _EmptyState({
    required this.isDark,
    required this.textPrimary,
    required this.textSecondary,
  });

  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;

  @override
  State<_EmptyState> createState() => _EmptyStateState();
}

class _EmptyStateState extends State<_EmptyState>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _float;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _float = Tween<double>(begin: -4, end: 4).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _float,
            builder: (_, child) => Transform.translate(
              offset: Offset(0, _float.value),
              child: child,
            ),
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0x20C6F432),
                    Color(0x0886EFAC),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.brand.withValues(alpha: 0.2),
                ),
              ),
              child: Icon(
                LucideIcons.bellOff,
                size: 24,
                color: AppColors.brand.withValues(alpha: 0.6),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'All caught up!',
            style: TextStyle(
              color: widget.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'No new notifications right now.',
            style: TextStyle(
              color: widget.textSecondary,
              fontSize: 11.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Panel footer
// ---------------------------------------------------------------------------

class _PanelFooter extends StatefulWidget {
  const _PanelFooter({
    required this.isDark,
    required this.textTertiary,
    required this.textPrimary,
    required this.hoverBg,
    required this.border,
    required this.onViewAll,
  });

  final bool isDark;
  final Color textTertiary;
  final Color textPrimary;
  final Color hoverBg;
  final Color border;
  final VoidCallback onViewAll;

  @override
  State<_PanelFooter> createState() => _PanelFooterState();
}

class _PanelFooterState extends State<_PanelFooter> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onViewAll,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 130),
          color: _hovered ? widget.hoverBg : Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'View all notifications',
                style: TextStyle(
                  color: _hovered ? widget.textPrimary : widget.textTertiary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                LucideIcons.arrowRight,
                size: 12,
                color: _hovered ? widget.textPrimary : widget.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
