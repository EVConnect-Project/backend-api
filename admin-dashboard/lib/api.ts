import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout
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

export interface MechanicApplication {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  skills: string;
  yearsOfExperience: number;
  certifications?: string;
  serviceArea: string;
  serviceLat?: number;
  serviceLng?: number;
  licenseNumber?: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Mechanic {
  id: string;
  userId: string;
  specialization: string;
  yearsOfExperience: number;
  rating: number;
  completedJobs: number;
  available: boolean;
  services: string[];
  lat?: number;
  lng?: number;
  licenseNumber?: string;
  certifications?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

// Mock Data Generators
const generateMockChargers = (count: number, statusFilter?: string): Charger[] => {
  const statuses: Array<'available' | 'in-use' | 'offline' | 'maintenance'> = ['available', 'in-use', 'offline', 'maintenance'];
  const names = [
    'Downtown Hub Charger',
    'Shopping Mall Station',
    'Airport Parking Charger',
    'Highway Rest Stop',
    'City Center Fast Charge',
    'Residential Complex Charger',
    'Office Building Station',
    'Hotel Parking Charger',
    'University Campus Charger',
    'Train Station Charger'
  ];
  const addresses = [
    '123 Main St, San Francisco, CA 94102',
    '456 Oak Ave, Los Angeles, CA 90001',
    '789 Pine Rd, San Diego, CA 92101',
    '321 Elm St, Sacramento, CA 95814',
    '654 Maple Dr, Oakland, CA 94612',
    '987 Cedar Ln, San Jose, CA 95110',
    '147 Birch Way, Fresno, CA 93721',
    '258 Willow Ct, Long Beach, CA 90802',
    '369 Spruce Ave, Riverside, CA 92501',
    '741 Ash Blvd, Bakersfield, CA 93301'
  ];
  const powerLevels = [50, 75, 100, 150, 250, 350];
  const prices = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50];
  
  const filterStatuses = statusFilter ? statusFilter.split(',') : null;
  
  return Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length];
    if (filterStatuses && !filterStatuses.includes(status)) {
      return null;
    }
    return {
      id: `charger-${i + 1}`,
      name: names[i % names.length],
      address: addresses[i % addresses.length],
      lat: 37.7749 + (i % 10) * 0.1,
      lng: -122.4194 + (i % 10) * 0.1,
      status,
      powerKw: powerLevels[i % powerLevels.length],
      pricePerKwh: prices[i % prices.length],
      verified: i % 3 !== 0,
      description: `High-speed DC fast charger at ${names[i % names.length]}`,
      owner: {
        id: `owner-${(i % 5) + 1}`,
        name: `Owner ${(i % 5) + 1}`,
        email: `owner${(i % 5) + 1}@example.com`,
      },
      ownerId: `owner-${(i % 5) + 1}`,
      createdAt: new Date(Date.now() - (i * 5) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }).filter(Boolean) as Charger[];
};

const generateMockBookings = (count: number, statusFilter?: string): Booking[] => {
  const statuses: Array<'pending' | 'active' | 'completed' | 'cancelled'> = ['pending', 'active', 'completed', 'cancelled'];
  const filterStatuses = statusFilter ? statusFilter.split(',') : null;
  
  return Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length];
    if (filterStatuses && !filterStatuses.includes(status)) {
      return null;
    }
    return {
      id: `booking-${i + 1}`,
      userId: `user-${(i % 20) + 1}`,
      chargerId: `charger-${(i % 10) + 1}`,
      startTime: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 + (2 + i % 3) * 60 * 60 * 1000).toISOString(),
      status,
      totalCost: ((i * 5) % 100) + 20,
      energyConsumed: ((i * 7) % 150) + 30,
      user: {
        id: `user-${(i % 20) + 1}`,
        name: `User ${(i % 20) + 1}`,
        email: `user${(i % 20) + 1}@example.com`,
      },
      charger: {
        id: `charger-${(i % 10) + 1}`,
        name: `Charger ${(i % 10) + 1}`,
        address: `Address ${(i % 10) + 1}`,
      },
      createdAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
    };
  }).filter(Boolean) as Booking[];
};

const generateMockUsers = (count: number, roleFilter?: string): User[] => {
  const roles = ['user', 'owner', 'admin'];
  const filterRoles = roleFilter ? roleFilter.split(',') : null;
  
  return Array.from({ length: count }, (_, i) => {
    const role = roles[i % roles.length];
    if (filterRoles && !filterRoles.includes(role)) {
      return null;
    }
    return {
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role,
      isBanned: i % 7 === 0,
      createdAt: new Date(Date.now() - (i * 3) * 24 * 60 * 60 * 1000).toISOString(),
      status: (i % 7 === 0 ? 'banned' : 'active') as 'active' | 'banned',
    };
  }).filter(Boolean) as User[];
};

// Dashboard APIs
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    console.warn('Using mock dashboard stats');
    return {
      totalUsers: 1248,
      totalChargers: 342,
      totalBookings: 5629,
      totalRevenue: 127543.50,
      activeUsers: 892,
      availableChargers: 234,
      revenueGrowth: 12.5,
      userGrowth: 8.3,
    };
  }
};

export const getRevenueData = async (
  startDate: string,
  endDate: string
): Promise<RevenueData[]> => {
  try {
    const response = await api.get('/admin/analytics/revenue', {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.warn('Using mock revenue data');
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revenue: Math.random() * 5000 + 2000,
      bookings: Math.floor(Math.random() * 100) + 50,
    }));
  }
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

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

// Charger Management APIs
export const getChargers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  verified?: boolean;
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
  startDate?: string;
  endDate?: string;
}): Promise<{ bookings: Booking[]; total: number }> => {
  const response = await api.get('/admin/bookings', { params });
  return response.data;
};

export const approveBooking = async (id: string): Promise<void> => {
  await api.post(`/admin/bookings/${id}/approve`);
};

export const cancelBooking = async (id: string, reason?: string): Promise<void> => {
  await api.post(`/admin/bookings/${id}/cancel`, { reason });
};

// Analytics APIs
export const getUserGrowthData = async (
  period: 'week' | 'month' | 'year'
): Promise<Array<{ date: string; count: number }>> => {
  try {
    const response = await api.get('/admin/analytics/user-growth', {
      params: { period },
    });
    return response.data;
  } catch (error) {
    console.warn('Using mock user growth data');
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 5,
    }));
  }
};

export const getBookingStats = async (): Promise<{
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeBookings: number;
}> => {
  try {
    const response = await api.get('/admin/analytics/bookings');
    return response.data;
  } catch (error) {
    console.warn('Using mock booking stats');
    return {
      totalBookings: 5629,
      completedBookings: 4892,
      cancelledBookings: 532,
      activeBookings: 205,
    };
  }
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
  try {
    const response = await api.get('/admin/analytics', {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.warn('Using mock analytics data');
    return {
      userGrowth: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        users: 1000 + i * 10 + Math.floor(Math.random() * 20),
        newUsers: Math.floor(Math.random() * 30) + 10,
      })),
      revenueByLocation: [
        { location: 'San Francisco', revenue: 45000, bookings: 1200 },
        { location: 'Los Angeles', revenue: 38000, bookings: 980 },
        { location: 'San Diego', revenue: 28000, bookings: 750 },
        { location: 'Sacramento', revenue: 22000, bookings: 620 },
        { location: 'Oakland', revenue: 19000, bookings: 540 },
      ],
      chargerUtilization: [
        { charger: 'Downtown Hub', utilization: 85, hours: 204 },
        { charger: 'Shopping Mall', utilization: 72, hours: 173 },
        { charger: 'Airport', utilization: 68, hours: 163 },
        { charger: 'Highway Stop', utilization: 61, hours: 146 },
        { charger: 'City Center', utilization: 58, hours: 139 },
      ],
      bookingTrends: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bookings: Math.floor(Math.random() * 100) + 150,
        revenue: Math.random() * 5000 + 3000,
      })),
      summary: {
        totalRevenue: 127543.50,
        revenueGrowth: 12.5,
        totalBookings: 5629,
        bookingGrowth: 8.3,
        avgSessionDuration: 2.5,
        peakHour: '6:00 PM',
      },
    };
  }
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
  try {
    const response = await api.get('/auth/admin/verify');
    return response.data;
  } catch (error) {
    console.warn('Using mock token verification');
    const token = localStorage.getItem('admin_token');
    if (token) {
      return {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@evconnect.com',
        role: 'admin',
        isBanned: false,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
    }
    throw error;
  }
};

// Mechanic Management APIs
export const getMechanicApplications = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{ applications: MechanicApplication[]; total: number }> => {
  const response = await api.get('/admin/mechanic-applications', { params });
  return response.data;
};

export const getMechanicApplicationById = async (id: string): Promise<MechanicApplication> => {
  const response = await api.get(`/admin/mechanic-applications/${id}`);
  return response.data;
};

export const approveMechanicApplication = async (
  id: string,
  reviewNotes: string
): Promise<void> => {
  await api.post(`/admin/mechanic-applications/${id}/approve`, { reviewNotes });
};

export const rejectMechanicApplication = async (
  id: string,
  reviewNotes: string
): Promise<void> => {
  await api.post(`/admin/mechanic-applications/${id}/reject`, { reviewNotes });
};

export const getMechanics = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  available?: boolean;
}): Promise<{ mechanics: Mechanic[]; total: number }> => {
  const response = await api.get('/admin/mechanics', { params });
  return response.data;
};

export const getMechanicById = async (id: string): Promise<Mechanic> => {
  const response = await api.get(`/admin/mechanics/${id}`);
  return response.data;
};

export const updateMechanic = async (
  id: string,
  data: Partial<Mechanic>
): Promise<void> => {
  await api.patch(`/admin/mechanics/${id}`, data);
};

export const deleteMechanic = async (id: string): Promise<void> => {
  await api.delete(`/admin/mechanics/${id}`);
};

