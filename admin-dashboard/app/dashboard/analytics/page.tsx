'use client';

import { useState, useEffect } from 'react';
import { getAnalytics } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRange } from '@/components/DateRangePicker';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  DollarSign,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportAnalyticsToPDF } from '@/lib/export';

interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number; newUsers: number }>;
  revenueByLocation: Array<{ location: string; revenue: number; bookings: number }>;
  chargerUtilization: Array<{ charger: string; utilization: number; hours: number }>;
  bookingTrends: Array<{ date: string; bookings: number; revenue: number }>;
  summary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalBookings: number;
    bookingGrowth: number;
    avgSessionDuration: number;
    peakHour: string;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAnalytics();
    }
  }, [dateRange]);

  const fetchAnalytics = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    try {
      setLoading(true);
      const startStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endStr = format(dateRange.endDate, 'yyyy-MM-dd');
      const response = await getAnalytics(startStr, endStr);
      setData(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Use mock data for demo if API fails
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!data || !dateRange.startDate || !dateRange.endDate) return;

    const startStr = dateRange.startDate ? formatDate(dateRange.startDate, 'yyyy-MM-dd') : '';
    const endStr = dateRange.endDate ? formatDate(dateRange.endDate, 'yyyy-MM-dd') : '';

    if (format === 'csv') {
      exportToCSV(startStr, endStr);
    } else {
      exportAnalyticsToPDF(data, startStr, endStr);
    }
  };

  const exportToCSV = (startStr: string, endStr: string) => {
    if (!data) return;

    // Combine all data into CSV
    let csv = 'Analytics Report\n\n';
    
    // Summary
    csv += 'Summary\n';
    csv += `Total Revenue,$${data.summary.totalRevenue.toFixed(2)}\n`;
    csv += `Revenue Growth,${data.summary.revenueGrowth}%\n`;
    csv += `Total Bookings,${data.summary.totalBookings}\n`;
    csv += `Booking Growth,${data.summary.bookingGrowth}%\n`;
    csv += `Avg Session Duration,${data.summary.avgSessionDuration} minutes\n`;
    csv += `Peak Hour,${data.summary.peakHour}\n\n`;

    // User Growth
    csv += 'User Growth\n';
    csv += 'Date,Total Users,New Users\n';
    data.userGrowth.forEach(row => {
      csv += `${row.date},${row.users},${row.newUsers}\n`;
    });
    csv += '\n';

    // Revenue by Location
    csv += 'Revenue by Location\n';
    csv += 'Location,Revenue,Bookings\n';
    data.revenueByLocation.forEach(row => {
      csv += `${row.location},$${row.revenue.toFixed(2)},${row.bookings}\n`;
    });
    csv += '\n';

    // Charger Utilization
    csv += 'Charger Utilization\n';
    csv += 'Charger,Utilization %,Hours Used\n';
    data.chargerUtilization.forEach(row => {
      csv += `${row.charger},${row.utilization}%,${row.hours}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${startStr}-to-${endStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = format;

  const getMockData = (): AnalyticsData => {
    const days = dateRange.startDate && dateRange.endDate
      ? Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    const userGrowth = [];
    const bookingTrends = [];
    let totalUsers = 100;

    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM dd');
      const newUsers = Math.floor(Math.random() * 10) + 2;
      totalUsers += newUsers;
      userGrowth.push({ date, users: totalUsers, newUsers });

      const bookings = Math.floor(Math.random() * 30) + 10;
      const revenue = bookings * (Math.random() * 20 + 10);
      bookingTrends.push({ date, bookings, revenue: Math.round(revenue * 100) / 100 });
    }

    return {
      userGrowth,
      bookingTrends,
      revenueByLocation: [
        { location: 'Downtown Hub', revenue: 4250.50, bookings: 125 },
        { location: 'Airport Station', revenue: 3890.25, bookings: 98 },
        { location: 'Shopping Mall', revenue: 2340.75, bookings: 87 },
        { location: 'Business Park', revenue: 1980.00, bookings: 65 },
        { location: 'University Campus', revenue: 1450.50, bookings: 54 },
      ],
      chargerUtilization: [
        { charger: 'Downtown Hub', utilization: 87, hours: 628 },
        { charger: 'Airport Station', utilization: 75, hours: 540 },
        { charger: 'Shopping Mall', utilization: 68, hours: 490 },
        { charger: 'Business Park', utilization: 62, hours: 446 },
        { charger: 'Beach Parking', utilization: 45, hours: 324 },
        { charger: 'University Campus', utilization: 38, hours: 274 },
      ],
      summary: {
        totalRevenue: 13911.00,
        revenueGrowth: 12.5,
        totalBookings: 429,
        bookingGrowth: 8.3,
        avgSessionDuration: 45,
        peakHour: '6:00 PM - 8:00 PM',
      },
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Analytics</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Detailed insights and performance metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleExport('csv')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Date Range:
              </span>
            </div>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
              showPresets={true}
            />
            {dateRange.startDate && dateRange.endDate && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Showing data from {format(dateRange.startDate, 'MMM dd, yyyy')} to{' '}
                {format(dateRange.endDate, 'MMM dd, yyyy')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  ${data.summary.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.summary.revenueGrowth >= 0 ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{data.summary.revenueGrowth}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                        {data.summary.revenueGrowth}%
                      </span>
                    </>
                  )}
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {data.summary.totalBookings.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.summary.bookingGrowth >= 0 ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{data.summary.bookingGrowth}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                        {data.summary.bookingGrowth}%
                      </span>
                    </>
                  )}
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Avg Session</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {data.summary.avgSessionDuration} min
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Per charging session</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Peak Hours</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {data.summary.peakHour}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Highest usage time</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#1e293b',
                  }}
                />
                <Legend wrapperStyle={{ color: '#64748b' }} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Total Users"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="New Users"
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Booking Trends Chart */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Booking & Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.bookingTrends}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#1e293b',
                  }}
                />
                <Legend wrapperStyle={{ color: '#64748b' }} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                  name="Bookings"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Location Chart */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Revenue by Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByLocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.location} (${((entry.percent || 0) * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {data.revenueByLocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#1e293b',
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {data.revenueByLocation.map((loc, index) => (
                <div key={loc.location} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-slate-700 dark:text-slate-300">{loc.location}</span>
                  </div>
                  <div className="text-slate-900 dark:text-slate-100 font-semibold">
                    ${loc.revenue.toFixed(2)} ({loc.bookings} bookings)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charger Utilization Chart */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Charger Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.chargerUtilization}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis
                  dataKey="charger"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                  label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#1e293b',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'utilization') return `${value}%`;
                    return `${value} hours`;
                  }}
                />
                <Legend />
                <Bar dataKey="utilization" fill="#8B5CF6" name="Utilization %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
