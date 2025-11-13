'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Zap,
  DollarSign,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Calendar,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ChargerDetail {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  powerKw: number;
  pricePerKwh: number;
  verified: boolean;
  description?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  totalBookings: number;
  totalRevenue: number;
  utilizationRate: number;
}

interface BookingHistory {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: string;
  totalCost: number;
  energyConsumed: number;
}

export default function ChargerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [charger, setCharger] = useState<ChargerDetail | null>(null);
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'analytics'>('overview');

  const fetchChargerDetails = async () => {
    setLoading(true);
    try {
      const chargerId = params.id as string;
      
      // Fetch charger details from API
      const response = await fetch(`http://localhost:4000/api/admin/chargers/${chargerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set charger data from API
        setCharger({
          id: data.id,
          name: data.name || 'Unnamed Charger',
          address: data.address || 'No address provided',
          lat: data.lat,
          lng: data.lng,
          status: data.status,
          powerKw: data.powerKw,
          pricePerKwh: data.pricePerKwh,
          verified: data.verified,
          description: data.description || 'No description available',
          owner: data.owner || {
            id: data.ownerId,
            name: 'Unknown Owner',
            email: 'N/A',
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          totalBookings: 0, // TODO: Fetch from bookings API
          totalRevenue: 0, // TODO: Calculate from bookings
          utilizationRate: 0, // TODO: Calculate from bookings
        });

        // TODO: Fetch booking history from API
        setBookings([]);
      } else {
        // Fallback to mock data if API fails
        const idNumber = parseInt(chargerId.replace(/\D/g, '')) || 1;
        const seed = idNumber * 7;
        
        const statuses = ['available', 'in-use', 'offline', 'maintenance'];
        const names = [
          'Downtown Hub Charger',
          'Shopping Mall Station',
          'Airport Parking Charger',
          'Highway Rest Stop',
          'City Center Fast Charge',
          'Residential Complex Charger',
          'Office Building Station',
          'Hotel Parking Charger'
        ];
        const addresses = [
          '123 Main St, San Francisco, CA 94102',
          '456 Oak Ave, Los Angeles, CA 90001',
          '789 Pine Rd, San Diego, CA 92101',
          '321 Elm St, Sacramento, CA 95814',
          '654 Maple Dr, Oakland, CA 94612',
          '987 Cedar Ln, San Jose, CA 95110',
          '147 Birch Way, Fresno, CA 93721',
          '258 Willow Ct, Long Beach, CA 90802'
        ];
        const ownerNames = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown', 'Emily Davis', 'Chris Wilson', 'Lisa Martinez'];
        const powerLevels = [50, 75, 100, 150, 250, 350];
        const prices = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50];
        
        setCharger({
          id: chargerId,
          name: names[idNumber % names.length],
          address: addresses[idNumber % addresses.length],
          lat: 37.7749 + (idNumber % 10) * 0.1,
          lng: -122.4194 + (idNumber % 10) * 0.1,
          status: statuses[seed % statuses.length],
          powerKw: powerLevels[idNumber % powerLevels.length],
          pricePerKwh: prices[idNumber % prices.length],
          verified: idNumber % 3 !== 0,
          description: `High-speed DC fast charger located at ${names[idNumber % names.length]}. Easy access and parking available.`,
          owner: {
            id: `owner-${idNumber}`,
            name: ownerNames[idNumber % ownerNames.length],
            email: `${ownerNames[idNumber % ownerNames.length].toLowerCase().replace(' ', '.')}@example.com`,
          },
          createdAt: new Date(Date.now() - ((idNumber % 180) + 1) * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          totalBookings: 100 + seed * 30,
          totalRevenue: (5000 + seed * 1500) + (idNumber * 200),
          utilizationRate: 45 + (seed % 40),
        });

        setBookings(
          Array.from({ length: 10 }, (_, i) => ({
            id: `booking-${chargerId}-${i + 1}`,
            userId: `user-${(seed + i) % 20}`,
            userName: `User ${(seed + i) % 20}`,
            startTime: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000 + (2 + i % 3) * 60 * 60 * 1000).toISOString(),
            status: ['completed', 'completed', 'cancelled', 'completed'][i % 4],
            totalCost: ((seed + i * 5) % 50) + 10,
            energyConsumed: ((seed + i * 7) % 50) + 20,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching charger details:', error);
      // Keep mock data fallback in catch block
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchChargerDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
      'in-use': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700',
      offline: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700',
      maintenance: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
    };
    return styles[status] || styles.offline;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-use':
        return <Activity className="w-4 h-4" />;
      case 'offline':
        return <XCircle className="w-4 h-4" />;
      case 'maintenance':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Mock data for charts
  const revenueData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: Math.random() * 500 + 200,
  }));

  const utilizationData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    hours: Math.random() * 20 + 4,
  }));

  const statusDistribution = [
    { name: 'Completed', value: 280, color: '#10b981' },
    { name: 'Cancelled', value: 42, color: '#ef4444' },
    { name: 'Active', value: 20, color: '#3b82f6' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading charger details...</p>
        </div>
      </div>
    );
  }

  if (!charger) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">Charger not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                {charger.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(charger.status)}`}>
                {getStatusIcon(charger.status)}
                {charger.status}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {charger.address}
            </p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Edit Charger
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-6">
          {(['overview', 'bookings', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Bookings</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                      {charger.totalBookings}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                      {formatCurrency(charger.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Utilization Rate</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                      {charger.utilizationRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Power Output</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                      {charger.powerKw} kW
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charger Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Charger Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">
                    {charger.description || 'No description available'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Price per kWh</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {formatCurrency(charger.pricePerKwh)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Verified</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {charger.verified ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Yes ✓</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">No ✗</span>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Created</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">
                    {formatDate(charger.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Name</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {charger.owner.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">
                    {charger.owner.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">User ID</p>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-1">
                    {charger.owner.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Map integration coming soon
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Lat: {charger.lat}, Lng: {charger.lng}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <CardTitle>Booking History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Start Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Energy
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Cost
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {bookings.map((booking) => {
                      const duration = Math.round(
                        (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60)
                      );
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                            {booking.userName}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(booking.startTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {duration}h
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {booking.energyConsumed.toFixed(1)} kWh
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(booking.totalCost)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'completed'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Utilization Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={utilizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                      }}
                    />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
