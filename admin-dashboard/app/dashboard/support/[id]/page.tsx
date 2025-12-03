'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Hash, Clock, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

interface SupportReport {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  adminResponse: string | null;
  userId: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export default function ReportDetailPage() {
  const [report, setReport] = useState<SupportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const toast = useToast();

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:3000/api/support/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setStatus(data.status);
        setResponse(data.adminResponse || '');
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:3000/api/support/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          adminResponse: response,
        }),
      });

      if (res.ok) {
        toast.success('Report updated successfully!');
        await fetchReport();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Report Not Found
            </h2>
            <Button
              onClick={() => router.push('/dashboard/support')}
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push('/dashboard/support')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Report Details
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review and respond to support request
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Information</CardTitle>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    report.status
                  )}`}
                >
                  {formatStatus(report.status)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Category
                </label>
                <p className="mt-1 text-slate-900 dark:text-slate-100">{report.category}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Title
                </label>
                <p className="mt-1 text-slate-900 dark:text-slate-100">
                  {report.title || 'No title provided'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Description
                </label>
                <p className="mt-1 text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                  {report.description || 'No description provided'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Created At
                  </label>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {formatDate(report.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Updated At
                  </label>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {formatDate(report.updatedAt)}
                  </p>
                </div>
              </div>

              {report.resolvedAt && (
                <div className="pt-2">
                  <label className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolved At
                  </label>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {formatDate(report.resolvedAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Response Form */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Response</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Response Message
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={6}
                    placeholder="Enter your response to the user..."
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Updating...' : 'Update Report'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* User Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              {report.user ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Name
                    </label>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {report.user.firstName} {report.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 break-all">
                      {report.user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      User ID
                    </label>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 font-mono text-xs break-all">
                      {report.user.id}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No user information available<br />
                  <span className="text-sm">(Anonymous report)</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
