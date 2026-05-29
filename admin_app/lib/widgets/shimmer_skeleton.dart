import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ShimmerSkeleton extends StatefulWidget {
  final double? width;
  final double? height;
  final double borderRadius;

  const ShimmerSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 12,
  });

  @override
  State<ShimmerSkeleton> createState() => _ShimmerSkeletonState();
}

class _ShimmerSkeletonState extends State<ShimmerSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? AppColors.surface2 : const Color(0xFFE2E8F0);
    final shimmerColor = isDark ? AppColors.surface3 : const Color(0xFFF1F5F9);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [baseColor, shimmerColor, baseColor],
              stops: [
                _animation.value - 0.3,
                _animation.value,
                _animation.value + 0.3,
              ].map((e) => e.clamp(0.0, 1.0)).toList(),
            ),
          ),
        );
      },
    );
  }
}

class ProductCardSkeleton extends StatelessWidget {
  static const double _imageAspectRatio = 4 / 3;

  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return Container(
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: const AspectRatio(
              aspectRatio: _imageAspectRatio,
              child: ShimmerSkeleton(borderRadius: 0),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const ShimmerSkeleton(
                    width: double.infinity,
                    height: 16,
                    borderRadius: 4,
                  ),
                  const SizedBox(height: 8),
                  const ShimmerSkeleton(width: 70, height: 12, borderRadius: 4),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const ShimmerSkeleton(
                        width: 80,
                        height: 20,
                        borderRadius: 4,
                      ),
                      ShimmerSkeleton(width: 40, height: 40, borderRadius: 20),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CategoryCardSkeleton extends StatelessWidget {
  const CategoryCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return Container(
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: const ShimmerSkeleton(borderRadius: 0),
            ),
          ),
          const Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerSkeleton(
                  width: double.infinity,
                  height: 16,
                  borderRadius: 4,
                ),
                SizedBox(height: 4),
                ShimmerSkeleton(width: 60, height: 12, borderRadius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
