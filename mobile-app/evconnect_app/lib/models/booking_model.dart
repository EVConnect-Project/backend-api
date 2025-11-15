import 'charger_model.dart';

class BookingModel {
  final String id;
  final String userId;
  final String chargerId;
  final DateTime startTime;
  final DateTime endTime;
  final String status;
  final double price;
  final double? energyConsumed;
  final ChargerModel? charger;  // Include charger details from backend

  BookingModel({
    required this.id,
    required this.userId,
    required this.chargerId,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.price,
    this.energyConsumed,
    this.charger,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      chargerId: json['chargerId'] ?? '',
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      status: json['status'] ?? 'pending',
      price: _parseDouble(json['price']),
      energyConsumed: json['energyConsumed'] != null 
          ? _parseDouble(json['energyConsumed']) 
          : null,
      charger: json['charger'] != null 
          ? ChargerModel.fromJson(json['charger']) 
          : null,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'chargerId': chargerId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'status': status,
      'price': price,
      'energyConsumed': energyConsumed,
      if (charger != null) 'charger': charger!.toJson(),
    };
  }
}
