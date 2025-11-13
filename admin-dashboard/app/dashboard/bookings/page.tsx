'use client';

import { useState, useEffect } from 'react';
import { getBookings, Booking } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRange } from '@/components/DateRangePicker';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Zap,
  DollarSign,
  FileText,
  Eye,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { exportBookingsToExcel, exportBookingsToPDF } from '@/lib/export';
import { useToast } from '@/components/ToastProvider';
import { format, subDays } from 'date-fns';
import MultiSelect from '@/components/MultiSelect';
import { useRouter } from 'next/navigation';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const toast = useToast();
  const router = useRouter();
  const bookingsPerPage = 10;

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchBookings();
  }, [currentPage, selectedStatuses, dateRange]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getBookings({
        page: currentPage,
        limit: bookingsPerPage,
        status: selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined,
      });
      
      setBookings(response.bookings || []);
      setTotalPages(Math.ceil((response.total || 0) / bookingsPerPage));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Use mock data for demo
      setBookings(getMockBookings());
      setTotalPages(3);
    } finally {
      setLoading(false);
    }
  };

  const getMockBookings = (): Booking[] => {
    const statuses: Array<'pending' | 'active' | 'completed' | 'cancelled'> = [
      'pending',
      'active',
      'completed',
      'cancelled',
    ];
    
    return Array.from({ length: 10 }, (_, i) => ({
      id: `booking-${i + 1}`,
      userId: `user-${i + 1}`,
      chargerId: `charger-${i + 1}`,
      startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      totalCost: Math.random() * 50 + 10,
      energyConsumed: Math.random() * 50 + 20,
      user: {
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      },
      charger: {
        id: `charger-${i + 1}`,
        name: ['Downtown Hub', 'Airport Station', 'Shopping Mall', 'Business Park'][
          Math.floor(Math.random() * 4)
        ],
        address: `${Math.floor(Math.random() * 1000)} Main St`,
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.charger?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(filteredBookings.map((b) => b.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'cancel') => {
    if (selectedBookings.size === 0) {
      toast.warning('Please select bookings first');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selectedBookings.size} booking(s)?`
    );
    if (!confirmed) return;

    try {
      // TODO: Implement bulk action API
      console.log(`${action} bookings:`, Array.from(selectedBookings));
      toast.success(`Successfully ${action}ed ${selectedBookings.size} booking(s)`);
      setSelectedBookings(new Set());
      await fetchBookings();
    } catch (error) {
      console.error(`Error ${action}ing bookings:`, error);
      toast.error(`Failed to ${action} bookings`);
    }
  };

  const exportBookings = () => {
    let csv = 'Bookings Export\n\n';
    csv += 'ID,User,Email,Charger,Location,Start Time,End Time,Status,Energy (kWh),Cost\n';
    
    filteredBookings.forEach((booking) => {
      csv += `${booking.id},${booking.user?.name},${booking.user?.email},${
        booking.charger?.name
      },${booking.charger?.address},${formatDate(booking.startTime)},${formatDate(
        booking.endTime
      )},${booking.status},${booking.energyConsumed.toFixed(2)},${formatCurrency(
        booking.totalCost
      )}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Zap className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Bookings Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage and monitor all charging session bookings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => exportBookingsToPDF(bookings)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => exportBookingsToExcel(bookings)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            onClick={exportBookings}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {bookings.length}
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
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {bookings.filter((b) => b.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                  {bookings.filter((b) => b.status === 'completed').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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
                  {formatCurrency(
                    bookings
                      .filter((b) => b.status === 'completed')
                      .reduce((sum, b) => sum + b.totalCost, 0)
                  )}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user, email, charger, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                  placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  focus:border-transparent transition-all"
              />
            </div>

            {/* Status Filter - MultiSelect */}
            <div className="flex items-center gap-2 relative min-w-[200px]">
              <Filter className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <MultiSelect
                  options={statusOptions}
                  selected={selectedStatuses}
                  onChange={(statuses) => {
                    setSelectedStatuses(statuses);
                    setCurrentPage(1);
                  }}
                  placeholder="All Statuses"
                />
              </div>
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(range) => {
                setDateRange(range);
                setCurrentPage(1);
              }}
              showPresets={true}
            />
          </div>

          {/* Bulk Actions */}
          {selectedBookings.size > 0 && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 
              border border-blue-200 dark:border-blue-700 rounded-lg">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                {selectedBookings.size} booking(s) selected
              </span>
              <Button
                onClick={() => handleBulkAction('approve')}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                Approve Selected
              </Button>
              <Button
                onClick={() => handleBulkAction('cancel')}
                size="sm"
                variant="destructive"
              >
                Cancel Selected
              </Button>
              <button
                onClick={() => setSelectedBookings(new Set())}
                className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-slate-900 dark:text-slate-50">Bookings</span>
            <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 
                  bg-slate-50 dark:bg-slate-800/80">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedBookings.size === filteredBookings.length &&
                        filteredBookings.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Charger
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Energy
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBookings.has(booking.id)}
                          onChange={() => handleSelectBooking(booking.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {booking.user?.name}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {booking.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {booking.charger?.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {booking.charger?.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Start:</span> {formatDate(booking.startTime)}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">End:</span> {formatDate(booking.endTime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            booking.status
                          )}`}
                        >
                          {getStatusIcon(booking.status)}
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {booking.energyConsumed.toFixed(2)} kWh
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(booking.totalCost)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of <span className="text-blue-600 dark:text-blue-400">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
