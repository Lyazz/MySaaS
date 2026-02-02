import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

// Simple user model for now
class User {
  final String id;
  final String email;
  final String? name;
  final String? role;

  User({required this.id, required this.email, this.name, this.role});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'],
      role: json['role'],
    );
  }
}

class AuthState {
  final User? user;
  final String? token;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.token, this.isLoading = false, this.error});

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    User? user,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    return AuthState();
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiService = ref.read(apiProvider);
      final response = await apiService.client.post(
        '/login',
        data: {'email': email, 'password': password},
      );

      if (response.data != null && response.data['token'] != null) {
        final token = response.data['token'];
        final user = User.fromJson(
          response.data['user'] ?? {'id': 'temp', 'email': email},
        );

        apiService.setToken(token);
        state = state.copyWith(isLoading: false, token: token, user: user);
      } else {
        throw Exception("Invalid response from server");
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  void logout() {
    final apiService = ref.read(apiProvider);
    apiService.setToken(null);
    state = AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
