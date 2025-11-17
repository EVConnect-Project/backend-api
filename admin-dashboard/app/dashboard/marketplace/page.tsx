'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  X,
  Download,
  FileText,
  ShoppingBag,
  Eye,
  DollarSign
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import MultiSelect from '@/components/MultiSelect';

// Types
interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  images: Array<{ id: string; imageUrl: string }>;
  seller: {
    id: string;
    name: string;
    email?: string;
    contact?: string;
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
}

export default function MarketplaceAdminDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectingListing, setRejectingListing] = useState<Listing | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toast = useToast();

  const listingsPerPage = 10;

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    fetchListings();
  }, [currentPage, selectedStatuses, searchTerm]);

  // Fetch listings
  const fetchListings = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: listingsPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      // Send multiple statuses as comma-separated
      if (selectedStatuses.length > 0) {
        params.status = selectedStatuses.join(',');
      }

      const response = await api.get('/admin/marketplace/listings', { params });
      setListings(response.data.listings || response.data);
      setTotalPages(Math.ceil((response.data.total || response.data.length) / listingsPerPage));
    } catch (err: any) {
      console.error('Failed to fetch listings:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve listing
  const handleApprove = async (listingId: string) => {
    if (!confirm('Are you sure you want to approve this listing?')) return;

    setActionLoading(listingId);
    try {
      await api.patch(`/admin/marketplace/listings/${listingId}/approve`);
      toast.success('Listing approved successfully');
      await fetchListings();
    } catch (err: any) {
      console.error('Failed to approve listing:', err);
      toast.error(err.response?.data?.message || 'Failed to approve listing');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject listing
  const handleReject = async () => {
    if (!rejectingListing || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(rejectingListing.id);
    try {
      await api.patch(`/admin/marketplace/listings/${rejectingListing.id}/reject`, { reason: rejectReason });
      toast.success('Listing rejected successfully');
      setRejectingListing(null);
      setRejectReason('');
      await fetchListings();
    } catch (err: any) {
      console.error('Failed to reject listing:', err);
      toast.error(err.response?.data?.message || 'Failed to reject listing');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNextImage = () => {
    if (selectedListing && selectedListing.images) {
      setCurrentImageIndex((prev) => 
        prev < selectedListing.images.length - 1 ? prev + 1 : 0
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedListing && selectedListing.images) {
      setCurrentImageIndex((prev) => 
        prev > 0 ? prev - 1 : selectedListing.images.length - 1
      );
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
      case 'approved':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Marketplace Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Review and manage marketplace listings</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {/* TODO: Export to PDF */}}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => {/* TODO: Export to Excel */}}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title or seller..."
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
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-slate-900 dark:text-slate-50">
            Listings <span className="text-blue-600 dark:text-blue-400">({listings.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No listings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={listing.images?.[0]?.imageUrl || '/placeholder-image.png'} 
                            alt={listing.title}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {listing.title}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                              {listing.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {listing.seller?.name || 'Unknown'}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">{listing.seller?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(listing.price)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            listing.status
                          )}`}
                        >
                          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(listing.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoading === listing.id ? (
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setDetailsOpen(true);
                                setCurrentImageIndex(0);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Details
                            </button>

                            {/* Approve/Reject Buttons for Pending Listings */}
                            {listing.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(listing.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                  title="Approve Listing"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingListing(listing);
                                    setRejectReason('');
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                  title="Reject Listing"
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

      {/* Details Modal */}
      {detailsOpen && selectedListing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Listing Details</h2>
                <button
                  aria-label="Close listing details"
                  onClick={() => setDetailsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Image Carousel */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="relative mb-6 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden">
                  <img 
                    src={selectedListing.images[currentImageIndex]?.imageUrl || '/placeholder-image.png'} 
                    alt={`listing-img-${currentImageIndex}`} 
                    className="w-full h-80 object-contain"
                  />
                  {selectedListing.images.length > 1 && (
                    <>
                      <button
                        aria-label="Previous image"
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        aria-label="Next image"
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                        {currentImageIndex + 1} / {selectedListing.images.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {selectedListing.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedListing.price)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedListing.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Seller</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedListing.seller?.name || 'Unknown'}
                    </p>
                  </div>
                  {selectedListing.seller?.email && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedListing.seller.email}
                      </p>
                    </div>
                  )}
                  {selectedListing.seller?.contact && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Contact</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedListing.seller.contact}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Created</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(selectedListing.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Status</p>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                        selectedListing.status
                      )}`}
                    >
                      {selectedListing.status.charAt(0).toUpperCase() + selectedListing.status.slice(1)}
                    </span>
                  </div>
                </div>

                {selectedListing.status === 'rejected' && selectedListing.adminNotes && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{selectedListing.adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => setDetailsOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingListing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Reject Listing</h2>
              <button
                aria-label="Close reject listing modal"
                onClick={() => setRejectingListing(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please provide a reason for rejecting <strong className="text-slate-900 dark:text-slate-100">{rejectingListing.title}</strong>:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReject();
              }}
            >
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
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
                  disabled={actionLoading === rejectingListing.id || !rejectReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  {actionLoading === rejectingListing.id ? 'Rejecting...' : 'Reject Listing'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingListing(null)}
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
