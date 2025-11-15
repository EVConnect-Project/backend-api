import '../models/mechanic_application_model.dart';
import '../core/api_client.dart';

class MechanicService {
  final ApiClient _apiClient;

  MechanicService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Apply to become a mechanic
  Future<Map<String, dynamic>> applyAsMechanic({
    required String fullName,
    required String phoneNumber,
    required String email,
    required List<String> skills,
    required int yearsOfExperience,
    String? certifications,
    String? licenseNumber,
    required double serviceLat,
    required double serviceLng,
    String? serviceArea,
  }) async {
    try {
      final response = await _apiClient.post(
        '/mechanic/apply',
        data: {
          'fullName': fullName,
          'phoneNumber': phoneNumber,
          'email': email,
          'skills': skills,
          'yearsOfExperience': yearsOfExperience,
          'certifications': certifications,
          'licenseNumber': licenseNumber,
          'serviceLat': serviceLat,
          'serviceLng': serviceLng,
          'serviceArea': serviceArea,
        },
      );

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error submitting mechanic application: $e');
    }
  }

  /// Get user's mechanic application
  Future<MechanicApplicationModel> getMyApplication() async {
    try {
      final response = await _apiClient.get('/mechanic/my-application');

      return MechanicApplicationModel.fromJson(response.data as Map<String, dynamic>);
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading mechanic application: $e');
    }
  }

  // Admin-specific methods

  /// Get all mechanic applications (admin only)
  Future<List<MechanicApplicationModel>> getAllApplications({String? status}) async {
    try {
      final queryParams = status != null ? {'status': status} : null;
      final response = await _apiClient.get(
        '/mechanic/applications',
        queryParameters: queryParams,
      );

      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => MechanicApplicationModel.fromJson(json as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading mechanic applications: $e');
    }
  }

  /// Get specific application details (admin only)
  Future<MechanicApplicationModel> getApplicationById(String id) async {
    try {
      final response = await _apiClient.get('/mechanic/application/$id');

      return MechanicApplicationModel.fromJson(response.data as Map<String, dynamic>);
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading application: $e');
    }
  }

  /// Review/approve/reject mechanic application (admin only)
  Future<Map<String, dynamic>> reviewApplication({
    required String applicationId,
    required String status, // 'approved' or 'rejected'
    String? reviewNotes,
  }) async {
    try {
      final response = await _apiClient.patch(
        '/mechanic/application/$applicationId/review',
        data: {
          'status': status,
          'reviewNotes': reviewNotes,
        },
      );

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error reviewing application: $e');
    }
  }

  /// Check if user is a verified mechanic
  Future<bool> isMechanic() async {
    try {
      final response = await _apiClient.get('/mechanic/my-application');
      final application = MechanicApplicationModel.fromJson(response.data as Map<String, dynamic>);
      return application.status == 'approved';
    } catch (e) {
      // If no application found or error, user is not a mechanic
      return false;
    }
  }

  /// Get mechanic stats (for mechanic dashboard)
  Future<Map<String, dynamic>> getMechanicStats() async {
    try {
      final response = await _apiClient.get('/mechanic/stats');
      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading mechanic stats: $e');
    }
  }
}
