class AuthUser {
  final String id;
  final String email;
  final String? name;
  final String? role;

  AuthUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      role: json['role'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
    };
  }
  
  bool get isOwner => role == 'owner' || role == 'admin';
  bool get isAdmin => role == 'admin';
}
