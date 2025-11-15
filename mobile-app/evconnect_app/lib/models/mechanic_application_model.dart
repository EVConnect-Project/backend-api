class MechanicApplicationModel {
  final String id;
  final String userId;
  final String fullName;
  final String phoneNumber;
  final String skills;
  final int yearsOfExperience;
  final String? certifications;
  final String serviceArea;
  final double? serviceLat;
  final double? serviceLng;
  final String? licenseNumber;
  final String? additionalInfo;
  final String status; // pending, approved, rejected
  final String? reviewedBy;
  final String? reviewNotes;
  final DateTime? reviewedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  MechanicApplicationModel({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.phoneNumber,
    required this.skills,
    required this.yearsOfExperience,
    this.certifications,
    required this.serviceArea,
    this.serviceLat,
    this.serviceLng,
    this.licenseNumber,
    this.additionalInfo,
    required this.status,
    this.reviewedBy,
    this.reviewNotes,
    this.reviewedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MechanicApplicationModel.fromJson(Map<String, dynamic> json) {
    return MechanicApplicationModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      fullName: json['fullName'] as String,
      phoneNumber: json['phoneNumber'] as String,
      skills: json['skills'] as String,
      yearsOfExperience: json['yearsOfExperience'] as int,
      certifications: json['certifications'] as String?,
      serviceArea: json['serviceArea'] as String,
      serviceLat: json['serviceLat'] != null 
          ? double.parse(json['serviceLat'].toString()) 
          : null,
      serviceLng: json['serviceLng'] != null 
          ? double.parse(json['serviceLng'].toString()) 
          : null,
      licenseNumber: json['licenseNumber'] as String?,
      additionalInfo: json['additionalInfo'] as String?,
      status: json['status'] as String,
      reviewedBy: json['reviewedBy'] as String?,
      reviewNotes: json['reviewNotes'] as String?,
      reviewedAt: json['reviewedAt'] != null 
          ? DateTime.parse(json['reviewedAt'] as String) 
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'skills': skills,
      'yearsOfExperience': yearsOfExperience,
      'certifications': certifications,
      'serviceArea': serviceArea,
      'serviceLat': serviceLat,
      'serviceLng': serviceLng,
      'licenseNumber': licenseNumber,
      'additionalInfo': additionalInfo,
      'status': status,
      'reviewedBy': reviewedBy,
      'reviewNotes': reviewNotes,
      'reviewedAt': reviewedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
