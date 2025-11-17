import React, { useState, useEffect } from 'react';
import './MarketplaceAdminDashboard.css';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  CircularProgress,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Carousel from 'react-material-ui-carousel';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Types
interface Listing {
  id: string;
  title: string;
  description: string;
  images: string[];
  seller: {
    name: string;
    email?: string;
    contact?: string;
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const MarketplaceAdminDashboard: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectField, setShowRejectField] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });
  const navigate = useNavigate();

  // Route protection (replace with your admin auth logic)
  useEffect(() => {
    const isAdmin = true; // TODO: Replace with real admin check
    if (!isAdmin) navigate('/login');
  }, [navigate]);

  // Fetch listings
  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/marketplace/listings?status=pending');
      setListings(res.data);
      setFilteredListings(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to fetch listings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Search filter
  useEffect(() => {
    const lower = search.toLowerCase();
    setFilteredListings(
      listings.filter(
        l =>
          l.title.toLowerCase().includes(lower) ||
          l.seller.name.toLowerCase().includes(lower)
      )
    );
  }, [search, listings]);

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'thumbnail',
      headerName: 'Thumbnail',
      width: 100,
      renderCell: params => (
        <img src={params.row.images[0]} alt="thumbnail" className="thumbnail-image" />
      ),
      sortable: false,
      filterable: false,
    },
    { field: 'title', headerName: 'Title', width: 200 },
    { field: 'seller', headerName: 'Seller', width: 150, valueGetter: params => params.row.seller.name },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      valueFormatter: params => new Date(params.value).toISOString().slice(0, 10),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: params => (
        <Chip
          label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
          color={
            params.value === 'pending'
              ? 'warning'
              : params.value === 'approved'
              ? 'success'
              : 'error'
          }
        />
      ),
    },
  ];

  // Row click handler
  const handleRowClick = (params: any) => {
    setSelectedListing(params.row);
    setDialogOpen(true);
    setShowRejectField(false);
    setRejectReason('');
  };

  // Approve listing
  const handleApprove = async () => {
    if (!selectedListing) return;
    setLoading(true);
    try {
      await axios.patch(`/admin/marketplace/listings/${selectedListing.id}/approve`);
      setSnackbar({ open: true, message: 'Listing approved', type: 'success' });
      setDialogOpen(false);
      fetchListings();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve listing', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Reject listing
  const handleReject = async () => {
    if (!selectedListing || !rejectReason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a rejection reason', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await axios.patch(`/admin/marketplace/listings/${selectedListing.id}/reject`, { reason: rejectReason });
      setSnackbar({ open: true, message: 'Listing rejected', type: 'success' });
      setDialogOpen(false);
      fetchListings();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to reject listing', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Marketplace Admin Dashboard</Typography>
      <TextField
        label="Search by title or seller"
        variant="outlined"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 300 }}
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={filteredListings}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          getRowId={row => row.id}
          onRowClick={handleRowClick}
        />
      )}
      {/* Dialog for listing details */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Listing Details</DialogTitle>
        <DialogContent>
          {selectedListing && (
            <Box>
              <Carousel autoPlay={false} navButtonsAlwaysVisible>
                {selectedListing.images.map((img, idx) => (
                  <img key={idx} src={img} alt={`listing-img-${idx}`} className="listing-detail-image" />
                ))}
              </Carousel>
              <Typography variant="h6" sx={{ mt: 2 }}>{selectedListing.title}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedListing.description}</Typography>
              <Typography variant="subtitle1">Seller: {selectedListing.seller.name}</Typography>
              {selectedListing.seller.email && <Typography variant="body2">Email: {selectedListing.seller.email}</Typography>}
              {selectedListing.seller.contact && <Typography variant="body2">Contact: {selectedListing.seller.contact}</Typography>}
              <Typography variant="body2" sx={{ mt: 1 }}>Created: {new Date(selectedListing.createdAt).toISOString().slice(0, 10)}</Typography>
              <Chip
                label={selectedListing.status.charAt(0).toUpperCase() + selectedListing.status.slice(1)}
                color={
                  selectedListing.status === 'pending'
                    ? 'warning'
                    : selectedListing.status === 'approved'
                    ? 'success'
                    : 'error'
                }
                sx={{ mt: 1 }}
              />
              {showRejectField && (
                <TextField
                  label="Rejection Reason"
                  variant="outlined"
                  fullWidth
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!showRejectField ? (
            <>
              <Button onClick={handleApprove} color="success" variant="contained" disabled={loading}>Approve</Button>
              <Button onClick={() => setShowRejectField(true)} color="error" variant="outlined" disabled={loading}>Reject</Button>
            </>
          ) : (
            <>
              <Button onClick={handleReject} color="error" variant="contained" disabled={loading}>Confirm Reject</Button>
              <Button onClick={() => setShowRejectField(false)} variant="text" disabled={loading}>Cancel</Button>
            </>
          )}
          <Button onClick={() => setDialogOpen(false)} variant="text" disabled={loading}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{ sx: { background: snackbar.type === 'success' ? 'green' : 'red' } }}
      />
    </Box>
  );
};

export default MarketplaceAdminDashboard;
