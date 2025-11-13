'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  User,
  Zap,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  Battery,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BookingDetail {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  charger: {
    id: string;
    name: string;
    address: string;
    powerKw: number;
    pricePerKwh: number;
  };
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalCost: number;
  energyConsumed: number;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
}

interface TimelineEvent {
  time: string;
  event: string;
  status: 'completed' | 'active' | 'pending';
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const bookingId = params.id as string;
      
      // Generate unique data based on booking ID
      const idNumber = parseInt(bookingId.replace(/\D/g, '')) || 1;
      const seed = idNumber * 11; // Use ID as seed for consistent but different data
      
      const statuses: Array<'pending' | 'active' | 'completed' | 'cancelled'> = ['pending', 'active', 'completed', 'cancelled'];
      const userNames = ['Jane Cooper', 'John Doe', 'Alice Johnson', 'Bob Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'Chris Martinez'];
      const chargerNames = [
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
      const paymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay', 'Google Pay'];
      const powerLevels = [50, 75, 100, 150, 250, 350];
      const prices = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50];
      
      const hoursAgo = 3 + (idNumber % 48); // Between 3 and 51 hours ago
      const durationHours = 2 + (idNumber % 4); // 2-5 hours
      const energyConsumed = 80 + (seed % 70); // 80-150 kWh
      const pricePerKwh = prices[idNumber % prices.length];
      
      // Mock data with variation based on ID
      setBooking({
        id: bookingId,
        user: {
          id: `user-${idNumber}`,
          name: userNames[idNumber % userNames.length],
          email: `${userNames[idNumber % userNames.length].toLowerCase().replace(' ', '.')}@example.com`,
        },
        charger: {
          id: `charger-${(idNumber % 8) + 1}`,
          name: chargerNames[idNumber % chargerNames.length],
          address: addresses[idNumber % addresses.length],
          powerKw: powerLevels[idNumber % powerLevels.length],
          pricePerKwh: pricePerKwh,
        },
        startTime: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - (hoursAgo - durationHours) * 60 * 60 * 1000).toISOString(),
        status: statuses[seed % statuses.length],
        totalCost: energyConsumed * pricePerKwh + 5.50, // energy cost + fees
        energyConsumed: energyConsumed,
        paymentMethod: paymentMethods[idNumber % paymentMethods.length],
        transactionId: `TXN-2024-${String(100000 + idNumber).padStart(6, '0')}`,
        createdAt: new Date(Date.now() - (hoursAgo + 1) * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
      active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700',
    };
    return styles[status] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Activity className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Mock timeline events
  const timeline: TimelineEvent[] = [
    { time: booking?.createdAt || '', event: 'Booking created', status: 'completed' },
    { time: booking?.startTime || '', event: 'Charging started', status: 'completed' },
    { 
      time: booking?.startTime 
        ? new Date(new Date(booking.startTime).getTime() + 60 * 60 * 1000).toISOString() 
        : '', 
      event: '50% charged', 
      status: 'completed' 
    },
    { time: booking?.endTime || '', event: 'Charging completed', status: booking?.status === 'completed' ? 'completed' : 'pending' },
  ];

  // Mock energy consumption data
  const energyData = Array.from({ length: 20 }, (_, i) => ({
    time: `${i * 10}m`,
    power: Math.random() * 150 + 50,
    energy: (i + 1) * 6.5,
  }));

  // Cost breakdown
  const costBreakdown = booking ? [
    { label: 'Energy Cost', amount: booking.energyConsumed * booking.charger.pricePerKwh },
    { label: 'Service Fee', amount: 2.50 },
    { label: 'Tax', amount: 3.00 },
  ] : [];

  const totalCost = costBreakdown.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">Booking not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const duration = Math.round(
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60 * 60)
  ) * 60;

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
                Booking #{booking.id.slice(0, 8).toUpperCase()}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(booking.status)}`}>
                {getStatusIcon(booking.status)}
                {booking.status}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Created {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cost</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {formatCurrency(booking.totalCost)}
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
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Energy Consumed</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {booking.energyConsumed} kWh
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Battery className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Duration</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {duration}m
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Power</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {booking.charger.powerKw} kW
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Name</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {booking.user.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">
                    {booking.user.email}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">User ID</p>
                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-1">
                  {booking.user.id}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Charger Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Charger Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Name</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {booking.charger.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Location</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 shrink-0" />
                  {booking.charger.address}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Power</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {booking.charger.powerKw} kW
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Price/kWh</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(booking.charger.pricePerKwh)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : event.status === 'active'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {event.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : event.status === 'active' ? (
                          <Activity className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {event.event}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {formatDate(event.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Energy Consumption Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={energyData}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorEnergy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {costBreakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment Method</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">
                  {booking.paymentMethod || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Transaction ID</p>
                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-1">
                  {booking.transactionId || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment Status</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 mt-2">
                  <CheckCircle className="w-3 h-3" />
                  Paid
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Booking ID</p>
                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-1">
                  {booking.id}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Start Time</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">
                  {formatDate(booking.startTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">End Time</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">
                  {formatDate(booking.endTime)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
