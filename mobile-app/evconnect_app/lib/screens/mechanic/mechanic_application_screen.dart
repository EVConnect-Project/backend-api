import 'package:flutter/material.dart';
import '../../services/mechanic_service.dart';

class MechanicApplicationScreen extends StatefulWidget {
  const MechanicApplicationScreen({Key? key}) : super(key: key);

  @override
  State<MechanicApplicationScreen> createState() => _MechanicApplicationScreenState();
}

class _MechanicApplicationScreenState extends State<MechanicApplicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mechanicService = MechanicService();
  
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _yearsController = TextEditingController();
  final _certificationsController = TextEditingController();
  final _licenseController = TextEditingController();
  final _serviceAreaController = TextEditingController();

  final List<String> _selectedSkills = [];
  final List<String> _availableSkills = [
    'Battery Diagnosis',
    'Charging System Repair',
    'Electric Motor Repair',
    'Electrical Wiring',
    'Software Updates',
    'Brake System',
    'Suspension',
    'Tire Service',
    'General Maintenance',
  ];

  bool _isLoading = false;
  double? _serviceLat;
  double? _serviceLng;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    // TODO: Implement actual location service
    setState(() {
      _serviceLat = 6.9271; // Colombo, Sri Lanka
      _serviceLng = 79.8612;
    });
  }

  void _toggleSkill(String skill) {
    setState(() {
      if (_selectedSkills.contains(skill)) {
        _selectedSkills.remove(skill);
      } else {
        _selectedSkills.add(skill);
      }
    });
  }

  Future<void> _submitApplication() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedSkills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one skill'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_serviceLat == null || _serviceLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to get your location'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await _mechanicService.applyAsMechanic(
        fullName: _fullNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        email: _emailController.text.trim(),
        skills: _selectedSkills,
        yearsOfExperience: int.parse(_yearsController.text.trim()),
        certifications: _certificationsController.text.trim().isEmpty
            ? null
            : _certificationsController.text.trim(),
        licenseNumber: _licenseController.text.trim().isEmpty
            ? null
            : _licenseController.text.trim(),
        serviceLat: _serviceLat!,
        serviceLng: _serviceLng!,
        serviceArea: _serviceAreaController.text.trim().isEmpty
            ? null
            : _serviceAreaController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Application submitted successfully! We will review it soon.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
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
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _yearsController.dispose();
    _certificationsController.dispose();
    _licenseController.dispose();
    _serviceAreaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply as Mechanic'),
        backgroundColor: Colors.green,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Card
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
                          'Fill out this form to become a verified mechanic on EVConnect.',
                          style: TextStyle(color: Colors.blue[900]),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Personal Information
              Text(
                'Personal Information',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your full name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your phone number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Professional Information
              Text(
                'Professional Information',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _yearsController,
                decoration: const InputDecoration(
                  labelText: 'Years of Experience *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.work),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter years of experience';
                  }
                  final years = int.tryParse(value);
                  if (years == null || years < 0) {
                    return 'Please enter a valid number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _certificationsController,
                decoration: const InputDecoration(
                  labelText: 'Certifications (Optional)',
                  hintText: 'e.g., EV Certified Technician, ASE Certified',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.verified),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _licenseController,
                decoration: const InputDecoration(
                  labelText: 'License Number (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.badge),
                ),
              ),
              const SizedBox(height: 24),

              // Skills Selection
              Text(
                'Skills & Expertise *',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _availableSkills.map((skill) {
                  final isSelected = _selectedSkills.contains(skill);
                  return FilterChip(
                    label: Text(skill),
                    selected: isSelected,
                    onSelected: (selected) => _toggleSkill(skill),
                    selectedColor: Colors.green[100],
                    checkmarkColor: Colors.green,
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Service Area
              Text(
                'Service Area',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 12),
              Card(
                elevation: 1,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.location_on, color: Colors.red),
                          const SizedBox(width: 8),
                          if (_serviceLat != null && _serviceLng != null)
                            Text(
                              'Lat: ${_serviceLat!.toStringAsFixed(4)}, Lng: ${_serviceLng!.toStringAsFixed(4)}',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _serviceAreaController,
                decoration: const InputDecoration(
                  labelText: 'Service Area Description (Optional)',
                  hintText: 'e.g., Colombo and surrounding areas',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.map),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton(
                onPressed: _isLoading ? null : _submitApplication,
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
                        'Submit Application',
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
