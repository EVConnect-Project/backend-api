'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Battery, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getDashboardStats, 
  getRevenueData,
  DashboardStats,
  RevenueData 
} from '@/lib/api';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, revenueData] = await Promise.all([
        getDashboardStats(),
        getRevenueData(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        ),
      ]);

      setStats(statsData);
      setRevenueData(revenueData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      change: stats.userGrowth,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Total Chargers',
      value: formatNumber(stats.totalChargers),
      subtitle: `${stats.availableChargers} available`,
      icon: Battery,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Total Bookings',
      value: formatNumber(stats.totalBookings),
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: stats.revenueGrowth,
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Welcome back! Here's what's happening with EVConnect today.
        </p>
      </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map((card, index) => (
              <Card key={index} className="hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        {card.title}
                      </p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{card.value}</h3>
                      {card.subtitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {card.subtitle}
                        </p>
                      )}
                      {card.change !== undefined && (
                        <div className="flex items-center gap-1 mt-2">
                          {card.change >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              card.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatPercentage(card.change)} from last month
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`p-4 rounded-xl ${card.bgColor}`}>
                      <card.icon className={`w-7 h-7 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bookings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
  );
}
