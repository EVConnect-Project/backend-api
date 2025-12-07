'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Power, 
  Ban, 
  CheckCircle, 
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Activity
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Charger {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  status: string;
  powerKw: number;
  pricePerKwh: number;
  verified: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export default function AdminChargerControlPage() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadChargers();
  }, []);

  const loadChargers = async () => {
    try {
      const response = await fetch('/api/admin/chargers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setChargers(data.chargers || []);
    } catch (error) {
      toast.error('Failed to load chargers');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendCharger = async (chargerId: string, suspend: boolean) => {
    try {
      const response = await fetch(`/api/admin/chargers/${chargerId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          suspend,
          reason: suspend ? 'Suspended by admin' : 'Resumed by admin',
        }),
      });

      if (response.ok) {
        toast.success(suspend ? 'Charger suspended' : 'Charger resumed');
        loadChargers();
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleChangeStatus = async (chargerId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/chargers/${chargerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status, reason: 'Admin override' }),
      });

      if (response.ok) {
        toast.success(`Status changed to ${status}`);
        loadChargers();
      }
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleContactOwner = async (chargerId: string) => {
    try {
      const response = await fetch(`/api/admin/chargers/${chargerId}/contact-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: 'Hello, I need to discuss your charger.',
        }),
      });

      if (response.ok) {
        toast.success('Chat initiated with owner');
        // Redirect to chat
        window.location.href = '/dashboard/admin-chat';
      }
    } catch (error) {
      toast.error('Failed to initiate chat');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Charger Control Center</h1>
        <Button onClick={loadChargers}>Refresh</Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-6">
          {chargers.map((charger) => (
            <Card key={charger.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{charger.name || 'Unnamed Charger'}</span>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        charger.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : charger.status === 'in-use'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {charger.status}
                    </span>
                    {charger.verified && (
                      <CheckCircle className="text-green-500" size={24} />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Charger Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Charger Details</h3>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span className="text-sm">{charger.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity size={16} />
                      <span className="text-sm">{charger.powerKw} kW</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} />
                      <span className="text-sm">${charger.pricePerKwh}/kWh</span>
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Owner Information</h3>
                    <div className="text-sm">
                      <p className="font-medium">{charger.owner?.name}</p>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} />
                        <span>{charger.owner?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} />
                        <span>{charger.owner?.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleContactOwner(charger.id)}
                    variant="outline"
                    size="sm"
                  >
                    <MessageSquare size={16} className="mr-2" />
                    Contact Owner
                  </Button>

                  <select
                    onChange={(e) => handleChangeStatus(charger.id, e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                    defaultValue={charger.status}
                  >
                    <option value="available">Available</option>
                    <option value="in-use">In Use</option>
                    <option value="offline">Offline</option>
                  </select>

                  <Button
                    onClick={() => handleSuspendCharger(charger.id, charger.status === 'offline')}
                    variant={charger.status === 'offline' ? 'default' : 'destructive'}
                    size="sm"
                  >
                    {charger.status === 'offline' ? (
                      <>
                        <Power size={16} className="mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Ban size={16} className="mr-2" />
                        Suspend
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
