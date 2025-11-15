import 'package:flutter/material.dart';
import '../../services/breakdown_service.dart';
import '../../models/breakdown_request_model.dart';

class MechanicDashboardScreen extends StatefulWidget {
  const MechanicDashboardScreen({Key? key}) : super(key: key);

  @override
  State<MechanicDashboardScreen> createState() => _MechanicDashboardScreenState();
}

class _MechanicDashboardScreenState extends State<MechanicDashboardScreen>
    with SingleTickerProviderStateMixin {
  final _breakdownService = BreakdownService();
  late TabController _tabController;

  List<BreakdownRequestModel> _availableRequests = [];
  List<BreakdownRequestModel> _myRequests = [];
  bool _isLoadingAvailable = true;
  bool _isLoadingMy = true;
  String? _errorAvailable;
  String? _errorMy;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadAvailableRequests();
    _loadMyRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAvailableRequests() async {
    setState(() {
      _isLoadingAvailable = true;
      _errorAvailable = null;
    });

    try {
      final requests = await _breakdownService.getAvailableRequests();
      setState(() {
        _availableRequests = requests;
        _isLoadingAvailable = false;
      });
    } catch (e) {
      setState(() {
        _errorAvailable = e.toString();
        _isLoadingAvailable = false;
      });
    }
  }

  Future<void> _loadMyRequests() async {
    setState(() {
      _isLoadingMy = true;
      _errorMy = null;
    });

    try {
      final requests = await _breakdownService.getMechanicRequests();
      setState(() {
        _myRequests = requests;
        _isLoadingMy = false;
      });
    } catch (e) {
      setState(() {
        _errorMy = e.toString();
        _isLoadingMy = false;
      });
    }
  }

  Future<void> _assignToRequest(String requestId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Accept Request'),
        content: const Text('Do you want to accept this breakdown request?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes', style: TextStyle(color: Colors.green)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _breakdownService.assignToRequest(requestId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Request accepted successfully'),
          backgroundColor: Colors.green,
        ),
      );
      _loadAvailableRequests();
      _loadMyRequests();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'assigned':
        return Colors.blue;
      case 'in_progress':
        return Colors.purple;
      case 'resolved':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatStatus(String status) {
    return status.replaceAll('_', ' ').toUpperCase();
  }

  Widget _buildRequestCard(BreakdownRequestModel request, {bool showAcceptButton = false}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  label: Text(
                    _formatStatus(request.status),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  backgroundColor: _getStatusColor(request.status),
                ),
                Text(
                  request.createdAt != null ? _formatDate(request.createdAt!) : '',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.report_problem, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    request.issueDescription,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            if (request.vehicleInfo != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.electric_car, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    request.vehicleInfo!,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ],
            if (request.address != null) ...[
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.place, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      request.address!,
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on, size: 16, color: Colors.red),
                const SizedBox(width: 8),
                Text(
                  'Lat: ${request.lat.toStringAsFixed(4)}, Lng: ${request.lng.toStringAsFixed(4)}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
            if (showAcceptButton) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _assignToRequest(request.id),
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Accept Request'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAvailableTab() {
    if (_isLoadingAvailable) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorAvailable != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: $_errorAvailable'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadAvailableRequests,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_availableRequests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No available requests',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAvailableRequests,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _availableRequests.length,
        itemBuilder: (context, index) {
          return _buildRequestCard(
            _availableRequests[index],
            showAcceptButton: true,
          );
        },
      ),
    );
  }

  Widget _buildMyRequestsTab() {
    if (_isLoadingMy) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMy != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: $_errorMy'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMyRequests,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_myRequests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No assigned requests',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMyRequests,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _myRequests.length,
        itemBuilder: (context, index) {
          return _buildRequestCard(_myRequests[index]);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mechanic Dashboard'),
        backgroundColor: Colors.green,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          tabs: const [
            Tab(
              icon: Icon(Icons.list),
              text: 'Available',
            ),
            Tab(
              icon: Icon(Icons.assignment),
              text: 'My Requests',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAvailableTab(),
          _buildMyRequestsTab(),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
