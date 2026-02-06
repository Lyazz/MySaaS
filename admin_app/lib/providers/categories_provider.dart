import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';

class CategoriesState {
  final List<Category> categories;
  final bool isLoading;
  final String? error;

  CategoriesState({
    this.categories = const [],
    this.isLoading = false,
    this.error,
  });

  CategoriesState copyWith({
    List<Category>? categories,
    bool? isLoading,
    String? error,
  }) {
    return CategoriesState(
      categories: categories ?? this.categories,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class CategoriesNotifier extends Notifier<CategoriesState> {
  @override
  CategoriesState build() {
    // Return mock data initially
    return CategoriesState(
      categories: [
        Category(id: '1', title: 'Electronics'),
        Category(id: '2', title: 'Clothing'),
        Category(id: '3', title: 'Home & Garden'),
        Category(id: '4', title: 'Books'),
      ],
    );
  }

  Future<void> fetchCategories() async {
    // Mock fetch - assume data is already loaded or simulate delay
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 500));
    state = state.copyWith(isLoading: false);
  }

  Future<void> addCategory(String title) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(milliseconds: 500)); // Simulate API
      final newCategory = Category(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
      );
      state = state.copyWith(
        isLoading: false,
        categories: [...state.categories, newCategory],
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateCategory(String id, String title) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final updatedCategories = state.categories.map((c) {
        if (c.id == id) {
          return Category(id: id, title: title);
        }
        return c;
      }).toList();
      state = state.copyWith(isLoading: false, categories: updatedCategories);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> deleteCategory(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final updatedCategories = state.categories
          .where((c) => c.id != id)
          .toList();
      state = state.copyWith(isLoading: false, categories: updatedCategories);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final categoriesProvider =
    NotifierProvider<CategoriesNotifier, CategoriesState>(
      CategoriesNotifier.new,
    );
