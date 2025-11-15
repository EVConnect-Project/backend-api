import 'package:flutter/material.dart';
import '../../services/breakdown_service.dart';
import '../../models/breakdown_request_model.dart';

class BreakdownRequestScreen extends StatefulWidget {
  const BreakdownRequestScreen({Key? key}) : super(key: key);

  @override
  State<BreakdownRequestScreen> createState() => _BreakdownRequestScreenState();
}

class _BreakdownRequestScreenState extends State<BreakdownRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _breakdownService = BreakdownService();
  final _issueController = TextEditingController();
  final _vehicleInfoController = TextEditingController();
  final _addressController = TextEditingController();

  bool _isLoading = false;
  double? _currentLat;
  double? _currentLng;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    // TODO: Implement actual location service
    // For now, using dummy coordinates
    setState(() {
      _currentLat = 6.9271; // Colombo, Sri Lanka
      _currentLng = 79.8612;
    });
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_currentLat == null || _currentLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to get your location. Please enable location services.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await _breakdownService.createRequest(
        lat: _currentLat!,
        lng: _currentLng!,
        address: _addressController.text.trim(),
        issueDescription: _issueController.text.trim(),
        vehicleInfo: _vehicleInfoController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Breakdown request submitted successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _issueController.dispose();
    _vehicleInfoController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Breakdown Assistance'),
        backgroundColor: Colors.green,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Location Card
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.location_on, color: Colors.red),
                          const SizedBox(width: 8),
                          Text(
                            'Current Location',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_currentLat != null && _currentLng != null)
                        Text(
                          'Lat: ${_currentLat!.toStringAsFixed(4)}, Lng: ${_currentLng!.toStringAsFixed(4)}',
                          style: TextStyle(color: Colors.grey[600]),
                        )
                      else
                        Text(
                          'Getting location...',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(
                          labelText: 'Address (Optional)',
                          hintText: 'Enter your current address',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.place),
                        ),
                        maxLines: 2,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Issue Description
              TextFormField(
                controller: _issueController,
                decoration: const InputDecoration(
                  labelText: 'Issue Description *',
                  hintText: 'Describe the problem with your vehicle',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.description),
                ),
                maxLines: 4,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please describe the issue';
                  }
                  if (value.trim().length < 10) {
                    return 'Please provide more details (at least 10 characters)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Vehicle Information
              TextFormField(
                controller: _vehicleInfoController,
                decoration: const InputDecoration(
                  labelText: 'Vehicle Information (Optional)',
                  hintText: 'e.g., Tesla Model 3, Red, ABC-1234',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.electric_car),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 24),

              // Information Card
              Card(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'A qualified mechanic will be assigned to assist you shortly.',
                          style: TextStyle(color: Colors.blue[900]),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton(
                onPressed: _isLoading ? null : _submitRequest,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Request Assistance',
                        style: TextStyle(fontSize: 16, color: Colors.white),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
