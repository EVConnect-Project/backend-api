'use client';

import { useState, useEffect } from 'react';
import { 
  getChargers, 
  approveCharger, 
  rejectCharger, 
  updateCharger 
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Edit, 
  MapPin,
  Zap,
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  X,
  Download,
  FileText,
  Eye
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { exportChargersToExcel, exportChargersToPDF } from '@/lib/export';
import { useToast } from '@/components/ToastProvider';
import MultiSelect from '@/components/MultiSelect';
import { useRouter } from 'next/navigation';

interface Charger {
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
}

export default function ChargersPage() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingCharger, setEditingCharger] = useState<Charger | null>(null);
  const [rejectingCharger, setRejectingCharger] = useState<Charger | null>(null);
  const toast = useToast();
  const router = useRouter();

  const chargersPerPage = 10;

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in-use', label: 'In Use' },
    { value: 'offline', label: 'Offline' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  useEffect(() => {
    fetchChargers();
  }, [currentPage, selectedStatuses, verifiedFilter, searchTerm]);

  const fetchChargers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: chargersPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      // Send multiple statuses as comma-separated
      if (selectedStatuses.length > 0) {
        params.status = selectedStatuses.join(',');
      }

      if (verifiedFilter !== 'all') {
        params.verified = verifiedFilter === 'verified';
      }

      const data = await getChargers(params);
      setChargers(data.chargers || []);
      setTotalPages(Math.ceil(data.total / chargersPerPage));
    } catch (error) {
      console.error('Error fetching chargers:', error);
      setChargers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCharger = async (chargerId: string) => {
    if (!confirm('Are you sure you want to approve this charger?')) return;

    setActionLoading(chargerId);
    try {
      await approveCharger(chargerId);
      await fetchChargers();
      toast.success('Charger approved successfully');
    } catch (error) {
      console.error('Error approving charger:', error);
      toast.error('Failed to approve charger');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCharger = async (reason: string) => {
    if (!rejectingCharger) return;

    setActionLoading(rejectingCharger.id);
    try {
      await rejectCharger(rejectingCharger.id, reason);
      setRejectingCharger(null);
      await fetchChargers();
      toast.success('Charger rejected');
    } catch (error) {
      console.error('Error rejecting charger:', error);
      toast.error('Failed to reject charger');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCharger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCharger) return;

    setActionLoading(editingCharger.id);
    try {
      await updateCharger(editingCharger.id, {
        name: editingCharger.name,
        address: editingCharger.address,
        status: editingCharger.status as 'available' | 'in-use' | 'offline' | 'maintenance',
        pricePerKwh: editingCharger.pricePerKwh,
      });
      setEditingCharger(null);
      await fetchChargers();
      toast.success('Charger updated successfully');
    } catch (error) {
      console.error('Error updating charger:', error);
      toast.error('Failed to update charger');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
      case 'in-use':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      case 'offline':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
      case 'maintenance':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Charger Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage EV charging stations</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => exportChargersToPDF(chargers)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => exportChargersToExcel(chargers)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or address..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Status Filter - MultiSelect */}
            <div>
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

            {/* Verified Filter */}
            <div className="relative">
              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setVerifiedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Chargers</option>
                <option value="verified" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Verified</option>
                <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chargers Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-slate-900 dark:text-slate-50">
            Chargers <span className="text-blue-600 dark:text-blue-400">({chargers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading chargers...</p>
            </div>
          ) : chargers.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No chargers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Charger
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Verified
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {chargers.map((charger) => (
                    <tr key={charger.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {charger.name}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {charger.address}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {charger.owner?.name || 'N/A'}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">{charger.owner?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            charger.status
                          )}`}
                        >
                          {charger.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold">{charger.powerKw}kW</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">{formatCurrency(charger.pricePerKwh)}/kWh</div>
                      </td>
                      <td className="px-6 py-4">
                        {charger.verified ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoading === charger.id ? (
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => router.push(`/dashboard/chargers/${charger.id}`)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Details
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingCharger(charger)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                              title="Edit Charger"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1.5" />
                              Edit
                            </button>

                            {/* Approve/Reject Buttons for Pending Chargers */}
                            {!charger.verified && (
                              <>
                                <button
                                  onClick={() => handleApproveCharger(charger.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                  title="Approve Charger"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingCharger(charger)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                  title="Reject Charger"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of <span className="text-blue-600 dark:text-blue-400">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingCharger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit Charger</h2>
                <button
                  onClick={() => setEditingCharger(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateCharger} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Charger Name
                  </label>
                  <input
                    type="text"
                    value={editingCharger.name}
                    onChange={(e) =>
                      setEditingCharger({ ...editingCharger, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                      focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editingCharger.address}
                    onChange={(e) =>
                      setEditingCharger({ ...editingCharger, address: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                      focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={editingCharger.status}
                      onChange={(e) =>
                        setEditingCharger({ ...editingCharger, status: e.target.value })
                      }
                      className="w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg 
                        bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                        focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="available" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Available</option>
                      <option value="in-use" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">In Use</option>
                      <option value="offline" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Offline</option>
                      <option value="maintenance" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Maintenance</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price per kWh ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCharger.pricePerKwh}
                    onChange={(e) =>
                      setEditingCharger({
                        ...editingCharger,
                        pricePerKwh: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                      focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    type="submit"
                    disabled={actionLoading === editingCharger.id}
                    className="flex-1"
                  >
                    {actionLoading === editingCharger.id ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCharger(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingCharger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Reject Charger</h2>
              <button
                onClick={() => setRejectingCharger(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please provide a reason for rejecting <strong className="text-slate-900 dark:text-slate-100">{rejectingCharger.name}</strong>:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const reason = (e.target as any).reason.value;
                if (reason.trim()) {
                  handleRejectCharger(reason);
                }
              }}
            >
              <textarea
                name="reason"
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  focus:border-transparent transition-all placeholder:text-slate-400"
                placeholder="Enter rejection reason..."
                required
              />

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={actionLoading === rejectingCharger.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  {actionLoading === rejectingCharger.id ? 'Rejecting...' : 'Reject Charger'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingCharger(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
