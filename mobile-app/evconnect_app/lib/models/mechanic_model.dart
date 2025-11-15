class MechanicModel {
  final String id;
  final String name;
  final List<String> services;
  final double lat;
  final double lng;
  final double rating;
  final String? phone;
  final String? email;
  final String? description;
  final bool available;
  final double? pricePerHour;
  final double? distance; // Distance in km (from API query)

  MechanicModel({
    required this.id,
    required this.name,
    required this.services,
    required this.lat,
    required this.lng,
    required this.rating,
    this.phone,
    this.email,
    this.description,
    required this.available,
    this.pricePerHour,
    this.distance,
  });

  factory MechanicModel.fromJson(Map<String, dynamic> json) {
    return MechanicModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      services: List<String>.from(json['services'] ?? []),
      lat: (json['lat'] ?? 0).toDouble(),
      lng: (json['lng'] ?? 0).toDouble(),
      rating: (json['rating'] ?? 0).toDouble(),
      phone: json['phone'],
      email: json['email'],
      description: json['description'],
      available: json['available'] ?? true,
      pricePerHour: json['pricePerHour'] != null 
          ? (json['pricePerHour']).toDouble() 
          : null,
      distance: json['distance'] != null 
          ? (json['distance']).toDouble() 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'services': services,
      'lat': lat,
      'lng': lng,
      'rating': rating,
      'phone': phone,
      'email': email,
      'description': description,
      'available': available,
      'pricePerHour': pricePerHour,
    };
  }
}
