'use client';

import { useState, useEffect } from 'react';
import { 
  getMechanicApplications,
  getMechanics,
  approveMechanicApplication,
  rejectMechanicApplication,
  updateMechanic,
  deleteMechanic,
  type MechanicApplication,
  type Mechanic
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2,
  Wrench,
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  X,
  Star,
  Award,
  Clock
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

type ViewMode = 'applications' | 'mechanics';

export default function MechanicsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('applications');
  const [applications, setApplications] = useState<MechanicApplication[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availableFilter, setAvailableFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvingApplication, setApprovingApplication] = useState<MechanicApplication | null>(null);
  const [rejectingApplication, setRejectingApplication] = useState<MechanicApplication | null>(null);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const toast = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    if (viewMode === 'applications') {
      fetchApplications();
    } else {
      fetchMechanics();
    }
  }, [viewMode, currentPage, searchTerm, statusFilter, availableFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await getMechanicApplications(params);
      setApplications(data.applications || []);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    } catch (error) {
      console.error('Error fetching mechanic applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanics = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (availableFilter !== 'all') {
        params.available = availableFilter === 'available';
      }

      const data = await getMechanics(params);
      setMechanics(data.mechanics || []);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    } catch (error) {
      console.error('Error fetching mechanics:', error);
      setMechanics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (reviewNotes: string) => {
    if (!approvingApplication) return;

    setActionLoading(approvingApplication.id);
    try {
      await approveMechanicApplication(approvingApplication.id, reviewNotes);
      setApprovingApplication(null);
      await fetchApplications();
      toast.success('Mechanic application approved successfully');
    } catch (error: any) {
      console.error('Error approving application:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to approve application';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectApplication = async (reviewNotes: string) => {
    if (!rejectingApplication) return;

    setActionLoading(rejectingApplication.id);
    try {
      await rejectMechanicApplication(rejectingApplication.id, reviewNotes);
      setRejectingApplication(null);
      await fetchApplications();
      toast.success('Mechanic application rejected');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMechanic) return;

    setActionLoading(editingMechanic.id);
    try {
      await updateMechanic(editingMechanic.id, {
        available: editingMechanic.available,
        services: editingMechanic.services,
      });
      setEditingMechanic(null);
      await fetchMechanics();
      toast.success('Mechanic updated successfully');
    } catch (error) {
      console.error('Error updating mechanic:', error);
      toast.error('Failed to update mechanic');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mechanic? This will also revert the user\'s role.')) return;

    setActionLoading(id);
    try {
      await deleteMechanic(id);
      await fetchMechanics();
      toast.success('Mechanic deleted successfully');
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      toast.error('Failed to delete mechanic');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Mechanic Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage mechanic applications and active mechanics</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => {
              setViewMode('applications');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              viewMode === 'applications'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => {
              setViewMode('mechanics');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              viewMode === 'mechanics'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Active Mechanics
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={viewMode === 'applications' ? "Search by name, phone, or skills..." : "Search by specialization or name..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Status/Availability Filter */}
            <div className="relative">
              {viewMode === 'applications' ? (
                <>
                  <select
                    aria-label="Filter applications by status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Applications</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </>
              ) : (
                <>
                  <select
                    aria-label="Filter mechanics by availability"
                    value={availableFilter}
                    onChange={(e) => {
                      setAvailableFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Mechanics</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications/Mechanics Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-slate-900 dark:text-slate-50">
            {viewMode === 'applications' ? 'Mechanic Applications' : 'Active Mechanics'} 
            <span className="text-blue-600 dark:text-blue-400"> 
              ({viewMode === 'applications' ? applications.length : mechanics.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
            </div>
          ) : viewMode === 'applications' ? (
            applications.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No mechanic applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Skills & Experience
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Service Area
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {application.fullName}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {application.phoneNumber}
                            </div>
                            {application.licenseNumber && (
                              <div className="text-xs text-slate-500 dark:text-slate-500">
                                License: {application.licenseNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                              {application.skills}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              {application.yearsOfExperience} years experience
                            </div>
                            {application.certifications && (
                              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mt-1">
                                <Award className="w-3.5 h-3.5" />
                                <span className="text-xs">{application.certifications}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                          {application.serviceArea}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                              application.status
                            )}`}
                          >
                            {application.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(application.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {actionLoading === application.id ? (
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {application.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => setApprovingApplication(application)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                    title="Approve Application"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setRejectingApplication(application)}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                    title="Reject Application"
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
            )
          ) : (
            mechanics.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No mechanics found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Mechanic
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Specialization
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Services
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {mechanics.map((mechanic) => (
                      <tr key={mechanic.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {mechanic.user?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {mechanic.user?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {mechanic.specialization}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              {mechanic.yearsOfExperience} years exp.
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {mechanic.rating.toFixed(1)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {mechanic.completedJobs} jobs completed
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {mechanic.services.slice(0, 3).map((service, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              >
                                {service}
                              </span>
                            ))}
                            {mechanic.services.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                +{mechanic.services.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {mechanic.available ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                              Unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {actionLoading === mechanic.id ? (
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingMechanic(mechanic)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                                title="Edit Mechanic"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMechanic(mechanic.id)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                title="Delete Mechanic"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
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

      {/* Approve Application Modal */}
      {approvingApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Approve Application</h2>
              <button
                aria-label="Close approve application modal"
                onClick={() => setApprovingApplication(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Approve <strong className="text-slate-900 dark:text-slate-100">{approvingApplication.fullName}</strong>'s application? 
              This will create a mechanic account and upgrade their user role.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const notes = (e.target as any).notes.value;
                handleApproveApplication(notes);
              }}
            >
              <textarea
                name="notes"
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                  focus:border-transparent transition-all placeholder:text-slate-400"
                placeholder="Review notes (optional)..."
              />

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={actionLoading === approvingApplication.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  {actionLoading === approvingApplication.id ? 'Approving...' : 'Approve Application'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApprovingApplication(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Reject Application</h2>
              <button
                aria-label="Close reject application modal"
                onClick={() => setRejectingApplication(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please provide a reason for rejecting <strong className="text-slate-900 dark:text-slate-100">{rejectingApplication.fullName}</strong>'s application:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const notes = (e.target as any).notes.value;
                if (notes.trim()) {
                  handleRejectApplication(notes);
                }
              }}
            >
              <textarea
                name="notes"
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
                  disabled={actionLoading === rejectingApplication.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  {actionLoading === rejectingApplication.id ? 'Rejecting...' : 'Reject Application'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingApplication(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mechanic Modal */}
      {editingMechanic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit Mechanic</h2>
                <button
                  aria-label="Close edit mechanic modal"
                  onClick={() => setEditingMechanic(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateMechanic} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Availability
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editingMechanic.available === true}
                        onChange={() => setEditingMechanic({ ...editingMechanic, available: true })}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-slate-900 dark:text-slate-100">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editingMechanic.available === false}
                        onChange={() => setEditingMechanic({ ...editingMechanic, available: false })}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-slate-900 dark:text-slate-100">Unavailable</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Services (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingMechanic.services.join(', ')}
                    onChange={(e) =>
                      setEditingMechanic({
                        ...editingMechanic,
                        services: e.target.value.split(',').map(s => s.trim()).filter(s => s),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                      focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                      focus:border-transparent transition-all"
                    placeholder="e.g., tire change, battery jump, towing"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    type="submit"
                    disabled={actionLoading === editingMechanic.id}
                    className="flex-1"
                  >
                    {actionLoading === editingMechanic.id ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMechanic(null)}
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
    </div>
  );
}
