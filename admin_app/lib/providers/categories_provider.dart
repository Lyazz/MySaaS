import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../repositories/category_repository.dart';

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
    return CategoriesState();
  }

  Future<void> fetchCategories({String? sortBy, String? sortOrder}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CategoryRepository(api);
      final categoriesList = await repo.getCategories();

      state = state.copyWith(isLoading: false, categories: categoriesList);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> createCategory({
    required String title,
    required String slug,
    String? imageUrl,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CategoryRepository(api);
      final newCategory = await repo.createCategory(
        title: title,
        slug: slug,
        imageUrl: imageUrl,
      );
      state = state.copyWith(
        isLoading: false,
        categories: [...state.categories, newCategory],
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateCategory({
    required String id,
    required String title,
    required String slug,
    String? imageUrl,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CategoryRepository(api);
      final updatedCategory = await repo.updateCategory(
        id: id,
        title: title,
        slug: slug,
        imageUrl: imageUrl,
      );
      final updatedCategories = state.categories.map((c) {
        if (c.id == id) {
          return updatedCategory;
        }
        return c;
      }).toList();

      state = state.copyWith(isLoading: false, categories: updatedCategories);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> deleteCategory(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final repo = CategoryRepository(api);
      await repo.deleteCategory(id);

      final updatedCategories = state.categories
          .where((c) => c.id != id)
          .toList();

      state = state.copyWith(isLoading: false, categories: updatedCategories);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}

final categoriesProvider =
    NotifierProvider<CategoriesNotifier, CategoriesState>(
      CategoriesNotifier.new,
    );
