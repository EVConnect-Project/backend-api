import '../models/breakdown_request_model.dart';
import '../core/api_client.dart';

class BreakdownService {
  final ApiClient _apiClient;

  BreakdownService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Create a breakdown assistance request
  Future<Map<String, dynamic>> createRequest({
    required double lat,
    required double lng,
    String? address,
    required String issueDescription,
    String? vehicleInfo,
  }) async {
    try {
      final response = await _apiClient.post(
        '/breakdown/request',
        data: {
          'lat': lat,
          'lng': lng,
          'address': address,
          'issueDescription': issueDescription,
          'vehicleInfo': vehicleInfo,
        },
      );

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error creating breakdown request: $e');
    }
  }

  /// Get user's breakdown requests
  Future<List<BreakdownRequestModel>> getMyRequests() async {
    try {
      final response = await _apiClient.get('/breakdown/my-requests');

      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => BreakdownRequestModel.fromJson(json as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading breakdown requests: $e');
    }
  }

  /// Get specific request details
  Future<BreakdownRequestModel> getRequestById(String id) async {
    try {
      final response = await _apiClient.get('/breakdown/request/$id');

      return BreakdownRequestModel.fromJson(response.data as Map<String, dynamic>);
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading breakdown request: $e');
    }
  }

  /// Update request status
  Future<Map<String, dynamic>> updateRequest(
    String id,
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/breakdown/request/$id',
        data: data,
      );

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error updating breakdown request: $e');
    }
  }

  /// Cancel request
  Future<Map<String, dynamic>> cancelRequest(String id) async {
    try {
      final response = await _apiClient.delete('/breakdown/request/$id');

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error cancelling breakdown request: $e');
    }
  }

  // Mechanic-specific methods

  /// Get available breakdown requests (mechanic only)
  Future<List<BreakdownRequestModel>> getAvailableRequests() async {
    try {
      final response = await _apiClient.get('/breakdown/available');

      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => BreakdownRequestModel.fromJson(json as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading available requests: $e');
    }
  }

  /// Get mechanic's assigned requests
  Future<List<BreakdownRequestModel>> getMechanicRequests() async {
    try {
      final response = await _apiClient.get('/breakdown/mechanic/my-requests');

      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => BreakdownRequestModel.fromJson(json as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error loading mechanic requests: $e');
    }
  }

  /// Assign self as mechanic to a request
  Future<Map<String, dynamic>> assignToRequest(String requestId) async {
    try {
      final response = await _apiClient.post(
        '/breakdown/request/$requestId/assign',
      );

      return response.data as Map<String, dynamic>;
    } on ApiException catch (e) {
      throw Exception(e.message);
    } catch (e) {
      throw Exception('Error assigning to request: $e');
    }
  }
}
