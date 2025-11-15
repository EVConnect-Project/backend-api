class ChargerModel {
  final String id;
  final String ownerId;
  final double lat;
  final double lng;
  final double powerKw;
  final double pricePerKwh;
  final bool verified;
  final String? name;
  final String? address;
  final String? description;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ChargerModel({
    required this.id,
    required this.ownerId,
    required this.lat,
    required this.lng,
    required this.powerKw,
    required this.pricePerKwh,
    required this.verified,
    this.name,
    this.address,
    this.description,
    this.status = 'available',
    this.createdAt,
    this.updatedAt,
  });

  factory ChargerModel.fromJson(Map<String, dynamic> json) {
    // Backend returns numeric values as strings from PostgreSQL
    double parseLat(dynamic value) {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.parse(value);
      return 0.0;
    }

    double parseLng(dynamic value) {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.parse(value);
      return 0.0;
    }

    double parsePowerKw(dynamic value) {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.parse(value);
      return 0.0;
    }

    double parsePrice(dynamic value) {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.parse(value);
      return 0.0;
    }

    return ChargerModel(
      id: json['id'] as String,
      ownerId: json['ownerId'] as String,
      lat: parseLat(json['lat']),
      lng: parseLng(json['lng']),
      powerKw: parsePowerKw(json['powerKw']),
      pricePerKwh: parsePrice(json['pricePerKwh']),
      verified: json['verified'] as bool? ?? false,
      name: json['name'] as String?,
      address: json['address'] as String?,
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'available',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ownerId': ownerId,
      'lat': lat,
      'lng': lng,
      'powerKw': powerKw,
      'pricePerKwh': pricePerKwh,
      'verified': verified,
      'name': name,
      'address': address,
      'description': description,
      'status': status,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }
}
