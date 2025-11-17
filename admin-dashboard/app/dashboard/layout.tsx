'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Users, 
  Battery, 
  Calendar, 
  TrendingUp,
  LogOut,
  Menu,
  LayoutDashboard,
  Wrench,
  ShoppingBag
} from 'lucide-react';
import { verifyAdminToken } from '@/lib/api';
import { ToastProvider } from '@/components/ToastProvider';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ConnectionStatus } from '@/components/ConnectionStatus';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, active, collapsed, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
          : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400'
      } ${collapsed && 'justify-center px-2'}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}

function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await verifyAdminToken();
        setLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } z-10`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          {sidebarOpen && (
            <h2 className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              EVConnect Admin
            </h2>
          )}
          <button
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === '/dashboard'}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard')}
          />
          <NavItem
            icon={Users}
            label="Users"
            active={pathname === '/dashboard/users'}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/users')}
          />
          <NavItem
            icon={Battery}
            label="Chargers"
            active={pathname === '/dashboard/chargers'}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/chargers')}
          />
          <NavItem
            icon={Wrench}
            label="Mechanics"
            active={pathname?.startsWith('/dashboard/mechanics')}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/mechanics')}
          />
          <NavItem
            icon={ShoppingBag}
            label="Marketplace"
            active={pathname?.startsWith('/dashboard/marketplace')}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/marketplace')}
          />
          <NavItem
            icon={Calendar}
            label="Bookings"
            active={pathname === '/dashboard/bookings'}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/bookings')}
          />
          <NavItem
            icon={TrendingUp}
            label="Analytics"
            active={pathname === '/dashboard/analytics'}
            collapsed={!sidebarOpen}
            onClick={() => router.push('/dashboard/analytics')}
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Bar with Connection Status */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <ConnectionStatus />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <WebSocketProvider>
        <DashboardContent>{children}</DashboardContent>
      </WebSocketProvider>
    </ToastProvider>
  );
}
