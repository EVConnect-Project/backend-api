class BreakdownRequestModel {
  final String id;
  final String userId;
  final String? mechanicId;
  final double lat;
  final double lng;
  final String? address;
  final String issueDescription;
  final String? vehicleInfo;
  final String status; // pending, assigned, in_progress, resolved, cancelled
  final String? mechanicNotes;
  final double? estimatedCost;
  final double? actualCost;
  final DateTime? resolvedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final MechanicInfo? mechanic;

  BreakdownRequestModel({
    required this.id,
    required this.userId,
    this.mechanicId,
    required this.lat,
    required this.lng,
    this.address,
    required this.issueDescription,
    this.vehicleInfo,
    required this.status,
    this.mechanicNotes,
    this.estimatedCost,
    this.actualCost,
    this.resolvedAt,
    required this.createdAt,
    required this.updatedAt,
    this.mechanic,
  });

  factory BreakdownRequestModel.fromJson(Map<String, dynamic> json) {
    return BreakdownRequestModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      mechanicId: json['mechanicId'] as String?,
      lat: double.parse(json['lat'].toString()),
      lng: double.parse(json['lng'].toString()),
      address: json['address'] as String?,
      issueDescription: json['issueDescription'] as String,
      vehicleInfo: json['vehicleInfo'] as String?,
      status: json['status'] as String,
      mechanicNotes: json['mechanicNotes'] as String?,
      estimatedCost: json['estimatedCost'] != null 
          ? double.parse(json['estimatedCost'].toString()) 
          : null,
      actualCost: json['actualCost'] != null 
          ? double.parse(json['actualCost'].toString()) 
          : null,
      resolvedAt: json['resolvedAt'] != null 
          ? DateTime.parse(json['resolvedAt'] as String) 
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      mechanic: json['mechanic'] != null 
          ? MechanicInfo.fromJson(json['mechanic'] as Map<String, dynamic>) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'mechanicId': mechanicId,
      'lat': lat,
      'lng': lng,
      'address': address,
      'issueDescription': issueDescription,
      'vehicleInfo': vehicleInfo,
      'status': status,
      'mechanicNotes': mechanicNotes,
      'estimatedCost': estimatedCost,
      'actualCost': actualCost,
      'resolvedAt': resolvedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class MechanicInfo {
  final String id;
  final String name;
  final String email;

  MechanicInfo({
    required this.id,
    required this.name,
    required this.email,
  });

  factory MechanicInfo.fromJson(Map<String, dynamic> json) {
    return MechanicInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
    );
  }
}
