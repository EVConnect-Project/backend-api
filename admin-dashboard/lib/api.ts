import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized, but avoid redirect loops
      localStorage.removeItem('admin_token');
      
      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API Functions

export interface DashboardStats {
  totalUsers: number;
  totalChargers: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  availableChargers: number;
  revenueGrowth: number;
  userGrowth: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
  status: 'active' | 'banned';
}

export interface Charger {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: 'available' | 'in-use' | 'offline' | 'maintenance';
  powerKw: number;
  pricePerKwh: number;
  verified: boolean;
  description?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  chargerId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalCost: number;
  energyConsumed: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  charger?: {
    id: string;
    name: string;
    address: string;
  };
  createdAt: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

// Dashboard APIs
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getRevenueData = async (
  startDate: string,
  endDate: string
): Promise<RevenueData[]> => {
  const response = await api.get('/admin/analytics/revenue', {
    params: { startDate, endDate },
  });
  return response.data;
};

// User Management APIs
export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<{ users: User[]; total: number }> => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const banUser = async (id: string): Promise<void> => {
  await api.post(`/admin/users/${id}/ban`);
};

export const unbanUser = async (id: string): Promise<void> => {
  await api.post(`/admin/users/${id}/unban`);
};

export const updateUserRole = async (
  id: string,
  role: string
): Promise<void> => {
  await api.patch(`/admin/users/${id}/role`, { role });
};

// Charger Management APIs
export const getChargers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{ chargers: Charger[]; total: number }> => {
  const response = await api.get('/admin/chargers', { params });
  return response.data;
};

export const getChargerById = async (id: string): Promise<Charger> => {
  const response = await api.get(`/admin/chargers/${id}`);
  return response.data;
};

export const approveCharger = async (id: string): Promise<void> => {
  await api.post(`/admin/chargers/${id}/approve`);
};

export const rejectCharger = async (id: string, reason: string): Promise<void> => {
  await api.post(`/admin/chargers/${id}/reject`, { reason });
};

export const updateCharger = async (
  id: string,
  data: Partial<Charger>
): Promise<void> => {
  await api.patch(`/admin/chargers/${id}`, data);
};

export const deleteCharger = async (id: string): Promise<void> => {
  await api.delete(`/admin/chargers/${id}`);
};

// Booking APIs
export const getBookings = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ bookings: Booking[]; total: number }> => {
  const response = await api.get('/admin/bookings', { params });
  return response.data;
};

// Analytics APIs
export const getUserGrowthData = async (
  period: 'week' | 'month' | 'year'
): Promise<Array<{ date: string; count: number }>> => {
  const response = await api.get('/admin/analytics/user-growth', {
    params: { period },
  });
  return response.data;
};

export const getBookingStats = async (): Promise<{
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeBookings: number;
}> => {
  const response = await api.get('/admin/analytics/bookings');
  return response.data;
};

export interface AnalyticsData {
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

export const getAnalytics = async (
  startDate: string,
  endDate: string
): Promise<AnalyticsData> => {
  const response = await api.get('/admin/analytics', {
    params: { startDate, endDate },
  });
  return response.data;
};

// Auth APIs
export const adminLogin = async (
  email: string,
  password: string
): Promise<{ token: string; user: User }> => {
  const response = await api.post('/auth/admin/login', { email, password });
  // Backend returns access_token, map it to token
  return {
    token: response.data.access_token,
    user: response.data.user,
  };
};

export const verifyAdminToken = async (): Promise<User> => {
  const response = await api.get('/auth/admin/verify');
  return response.data;
};
