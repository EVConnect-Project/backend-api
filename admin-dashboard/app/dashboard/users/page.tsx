'use client';

import { useState, useEffect } from 'react';
import { 
  getUsers, 
  banUser, 
  unbanUser, 
  updateUserRole,
  deleteUser
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  Trash2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { exportUsersToExcel, exportUsersToPDF } from '@/lib/export';
import { useToast } from '@/components/ToastProvider';
import MultiSelect from '@/components/MultiSelect';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const usersPerPage = 10;

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
  ];

  useEffect(() => {
    fetchUsers();
  }, [currentPage, selectedRoles, statusFilter, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: usersPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      // Send multiple roles as comma-separated or array
      if (selectedRoles.length > 0) {
        params.role = selectedRoles.join(',');
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await getUsers(params);
      setUsers(data.users);
      setTotalPages(Math.ceil(data.total / usersPerPage));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;

    setActionLoading(userId);
    try {
      await banUser(userId);
      await fetchUsers();
      toast.success('User banned successfully');
    } catch (error: any) {
      console.error('Error banning user:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to ban user';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await unbanUser(userId);
      await fetchUsers();
      toast.success('User unbanned successfully');
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unban user';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = prompt(
      `Change role for this user (current: ${currentRole}).\nEnter: user, admin, or owner`,
      currentRole
    );

    if (!newRole || !['user', 'admin', 'owner'].includes(newRole)) {
      if (newRole) toast.warning('Invalid role. Must be: user, admin, or owner');
      return;
    }

    setActionLoading(userId);
    try {
      await updateUserRole(userId, newRole);
      await fetchUsers();
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update role';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
    if (userRole === 'admin') {
      toast.error('Cannot delete admin users');
      return;
    }

    const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nYou are about to PERMANENTLY DELETE:\n\nUser: ${userName}\n\nThis action will:\n✗ Delete the user account\n✗ Delete all associated data\n✗ Cannot be undone\n\nType "DELETE" to confirm:`;
    
    const confirmation = prompt(confirmMessage);

    if (confirmation !== 'DELETE') {
      if (confirmation) toast.warning('Deletion cancelled - confirmation text did not match');
      return;
    }

    setActionLoading(userId);
    try {
      await deleteUser(userId);
      await fetchUsers();
      toast.success('User permanently deleted');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700';
      case 'owner':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
    }
  };

  const getStatusBadgeColor = (isBanned: boolean) => {
    return isBanned
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">User Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage platform users and permissions</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => exportUsersToPDF(users)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => exportUsersToExcel(users)}
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
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Role Filter - MultiSelect */}
            <div>
              <MultiSelect
                options={roleOptions}
                selected={selectedRoles}
                onChange={(roles) => {
                  setSelectedRoles(roles);
                  setCurrentPage(1);
                }}
                placeholder="All Roles"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Status</option>
                <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Active</option>
                <option value="banned" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Banned</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-slate-900 dark:text-slate-50">
            Users <span className="text-blue-600 dark:text-blue-400">({users.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {user.name || 'N/A'}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            user.isBanned
                          )}`}
                        >
                          {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {actionLoading === user.id ? (
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Loading...</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {/* Change Role Button */}
                            <button
                              onClick={() => handleChangeRole(user.id, user.role)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                              title="Change Role"
                            >
                              <Shield className="w-3.5 h-3.5 mr-1.5" />
                              Role
                            </button>

                            {/* Ban/Unban Button */}
                            {user.isBanned ? (
                              <button
                                onClick={() => handleUnbanUser(user.id)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                title="Unban User"
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUser(user.id)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                title="Ban User"
                              >
                                <UserX className="w-3.5 h-3.5 mr-1.5" />
                                Ban
                              </button>
                            )}

                            {/* Delete Button */}
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name || user.email, user.role)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Delete
                              </button>
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
    </div>
  );
}
