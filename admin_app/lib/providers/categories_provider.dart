import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

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
      final authState = ref.read(authProvider);

      if (authState.token == null) {
        state = state.copyWith(isLoading: false, error: 'Not authenticated');
        return;
      }

      final queryParams = <String, dynamic>{};
      if (sortBy != null) queryParams['sortBy'] = sortBy;
      if (sortOrder != null) queryParams['sortOrder'] = sortOrder;

      final response = await api.client.get(
        '/admin/categories',
        queryParameters: queryParams,
      );

      final categoriesList = (response.data as List)
          .map((json) => Category.fromJson(json))
          .toList();

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

      final response = await api.client.post(
        '/admin/categories',
        data: {'title': title, 'slug': slug, 'imageUrl': imageUrl},
      );

      final newCategory = Category.fromJson(response.data);
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

      final response = await api.client.put(
        '/admin/categories/$id',
        data: {'title': title, 'slug': slug, 'imageUrl': imageUrl},
      );

      final updatedCategory = Category.fromJson(response.data);
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

      await api.client.delete('/admin/categories/$id');

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
