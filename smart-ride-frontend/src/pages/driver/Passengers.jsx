import React, { useState, useEffect } from 'react';
import { Users, Phone, Navigation, MapPin, Search } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getAssignedPassengers } from '../../api/driver.api';
import { formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const Passengers = () => {
  const [passengers, setPassengers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail Modal State
  const [selectedPass, setSelectedPass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPass = async () => {
      try {
        const res = await getAssignedPassengers();
        if (res.success) {
          const normalizedData = (res.data || []).map(p => ({
            id: p.subscription_id,
            pickup_address: p.pickup_address,
            drop_address: p.drop_address,
            pickup_lat: p.pickup_lat,
            pickup_lng: p.pickup_lng,
            drop_lat: p.drop_lat,
            drop_lng: p.drop_lng,
            start_date: p.start_date,
            end_date: p.end_date,
            slots_selected: [p.morning_slot ? 'morning' : null, p.evening_slot ? 'evening' : null].filter(Boolean),
            user: {
              full_name: p.passenger_name || '',
              phone: p.passenger_phone || '',
              email: p.passenger_email || ''
            },
            route: {
               morning_pickup_time: p.morning_pickup_time,
               evening_pickup_time: p.evening_pickup_time
            },
            plan: {
               name: p.route_name || 'Standard Plan'
            }
          }));
          setPassengers(normalizedData);
        }
      } catch (err) {
        toast.error('Failed to load passengers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPass();
  }, []);

  const openNav = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const filtered = passengers.filter(p => 
    p.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.drop_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="flex h-[60vh] justify-center items-center"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-navy-900 flex items-center gap-3">
          My Passengers
          <Badge color="blue" size="sm">{passengers.length} Total</Badge>
        </h1>
        
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search name or address..."
            className="w-full pl-10 pr-4 py-2 border border-navy-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        </div>
      </div>

      {passengers.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No passengers assigned"
          description="Your admin will assign passengers to your route soon."
          className="bg-white rounded-2xl shadow-sm border border-navy-100 py-16"
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-navy-500">No passengers match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(sub => (
            <Card key={sub.id} variant="hover" className="p-0 overflow-hidden cursor-pointer flex flex-col h-full" onClick={() => { setSelectedPass(sub); setIsModalOpen(true); }}>
              <div className="p-5 flex items-start gap-4 border-b border-navy-50">
                <Avatar name={sub.user?.full_name} src={sub.user?.profile_photo} size="lg" className="border border-navy-100" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-navy-900 truncate mb-1">{sub.user?.full_name}</h3>
                  <a href={`tel:${sub.user?.phone}`} onClick={e => e.stopPropagation()} className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1 mb-2">
                    <Phone size={12} /> {sub.user?.phone}
                  </a>
                  <Badge color="green" size="sm">ACTIVE</Badge>
                </div>
              </div>

              <div className="p-5 bg-navy-50/50 flex-1 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span className="text-navy-700 line-clamp-2">{sub.pickup_address}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="text-navy-700 line-clamp-2">{sub.drop_address}</span>
                </div>
              </div>

              <div className="p-4 border-t border-navy-100 bg-white flex justify-between gap-2">
                <Button variant="outline" size="sm" fullWidth onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${sub.user?.phone}`; }}>
                  <Phone size={14} className="mr-1" /> Call
                </Button>
                <Button variant="primary" size="sm" fullWidth onClick={(e) => { e.stopPropagation(); openNav(sub.pickup_lat, sub.pickup_lng); }}>
                  <Navigation size={14} className="mr-1" /> Nav
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Passenger Details" size="lg">
        {selectedPass && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-navy-50 rounded-xl">
              <Avatar name={selectedPass.user?.full_name} src={selectedPass.user?.profile_photo} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-navy-900">{selectedPass.user?.full_name}</h2>
                <p className="text-navy-600">{selectedPass.user?.email}</p>
                <p className="text-primary-600 font-bold">{selectedPass.user?.phone}</p>
              </div>
              <Button className="ml-auto" onClick={() => window.location.href = `tel:${selectedPass.user?.phone}`}>
                <Phone size={16} className="mr-2" /> Call Now
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-navy-100 rounded-xl p-4">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Subscription Plan</p>
                <p className="font-medium text-navy-900">{selectedPass.plan?.name}</p>
              </div>
              <div className="border border-navy-100 rounded-xl p-4">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Period</p>
                <p className="font-medium text-navy-900">{formatDate(selectedPass.start_date)} - {formatDate(selectedPass.end_date)}</p>
              </div>
              <div className="border border-navy-100 rounded-xl p-4">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Time Slots</p>
                <div className="flex gap-2 mt-1">
                  {selectedPass.slots_selected?.includes('morning') && <Badge color="blue">Morning</Badge>}
                  {selectedPass.slots_selected?.includes('evening') && <Badge color="blue">Evening</Badge>}
                </div>
              </div>
              <div className="border border-navy-100 rounded-xl p-4">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Status</p>
                <Badge color="green" className="mt-1">ACTIVE</Badge>
              </div>
            </div>

            <div className="border border-navy-100 rounded-xl p-4 space-y-4">
              <h3 className="font-bold text-navy-900 border-b border-navy-50 pb-2">Route Information</h3>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><MapPin size={16} /></div>
                <div>
                  <p className="text-xs font-bold text-navy-500 uppercase">Pickup Location</p>
                  <p className="text-sm font-medium text-navy-900 mt-1">{selectedPass.pickup_address}</p>
                  <button onClick={() => openNav(selectedPass.pickup_lat, selectedPass.pickup_lng)} className="text-xs text-primary-600 font-bold mt-2 hover:underline">Navigate to Pickup →</button>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><MapPin size={16} /></div>
                <div>
                  <p className="text-xs font-bold text-navy-500 uppercase">Drop Location</p>
                  <p className="text-sm font-medium text-navy-900 mt-1">{selectedPass.drop_address}</p>
                  <button onClick={() => openNav(selectedPass.drop_lat, selectedPass.drop_lng)} className="text-xs text-primary-600 font-bold mt-2 hover:underline">Navigate to Drop →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Passengers;
