import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Search, Users, Car, MapPin, Tag, Sparkles } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getUnassignedSubscriptions, getDrivers, assignDriver, bulkAssignDrivers, getAllDriverRoutes } from '../../api/admin.api';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/admin/ConfirmModal';

const DriverAssignment = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(true);
  
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchSub, setSearchSub] = useState('');
  
  // Smart Match State
  const [isMatching, setIsMatching] = useState(false);
  const [smartMatchResults, setSmartMatchResults] = useState(null);

  // Modals
  const [isAssignLoading, setIsAssignLoading] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    setIsLoadingSubs(true);
    try {
      const res = await getUnassignedSubscriptions();
      if (res.success) setSubscriptions(res.data);
    } catch (err) {
      toast.error('Failed to load unassigned subscriptions');
    } finally {
      setIsLoadingSubs(false);
    }
  };



  const handleAssign = async (driver) => {
    if (!selectedSub) return;
    
    // Simplification for UI - in real world we'd select a vehicle if multiple exist
    const vehicleId = driver.vehicles?.[0]?.id;
    if (!vehicleId) {
      toast.error(`${driver.full_name} has no vehicles registered.`);
      return;
    }

    const overrideReason = window.prompt(`Please provide a reason for assigning ${driver.full_name}:`, 'Admin manual assignment');
    if (overrideReason === null) return; // User cancelled

    setIsAssignLoading(true);
    try {
      const res = await assignDriver({
        subscription_id: selectedSub.id,
        driver_id: driver.id,
        vehicle_id: vehicleId,
        overrideReason: overrideReason
      });
      
      if (res.success) {
        toast.success(`Assigned ${driver.full_name} successfully!`);
        setSubscriptions(prev => prev.filter(s => s.id !== selectedSub.id));
        setSelectedSub(null);
      }
    } catch (err) {
      if (err.message?.includes('conflict') || err.error === 'DRIVER_SLOT_CONFLICT') {
        toast.error('Slot Conflict: Driver is busy during these route times.');
      } else {
        toast.error(err.message || 'Assignment failed');
      }
    } finally {
      setIsAssignLoading(false);
    }
  };

  const handleSmartMatch = async (subId) => {
    if (!subId) return;
    setIsMatching(true);
    setSmartMatchResults(null);
    try {
      const res = await api.get(`/admin/smart-match/${subId}`);
      if (res.data.success && res.data.data.recommended_drivers && res.data.data.recommended_drivers.length > 0) {
        setSmartMatchResults(res.data.data.recommended_drivers);
        toast.success('Smart match calculated successfully!');
      } else {
        // Fallback: Show all online available drivers with empty seats
        const [driversRes, routesRes] = await Promise.all([
          getDrivers({ is_available: true, is_verified: true, limit: 100 }),
          getAllDriverRoutes({ limit: 100 })
        ]);
        
        if (driversRes.data.success && routesRes.data.success) {
          const driversList = driversRes.data.data.drivers;
          const routesList = routesRes.data.data.routes;
          
          const fallbackMatches = [];
          
          driversList.forEach(driver => {
            // Find active route for this driver
            const activeRoute = routesList.find(r => r.driver_id === driver.user_id && r.status === 'active');
            if (activeRoute && activeRoute.available_seats > 0) {
              fallbackMatches.push({
                driver_profile_id: driver.id,
                user_id: driver.user_id,
                full_name: driver.full_name,
                phone: driver.phone,
                vehicle: driver.vehicles?.[0] || {},
                driver_route_id: activeRoute.id,
                available_seats: activeRoute.available_seats,
                morning_time: activeRoute.morning_time,
                evening_time: activeRoute.evening_time,
                shift_type: activeRoute.route_type || 'forward',
                score: 'N/A (All Available)',
                score_breakdown: {
                  proximity: 0,
                  workload: 0,
                  rating: 0,
                  attendance: 0,
                  experience: 0
                }
              });
            }
          });
          
          setSmartMatchResults(fallbackMatches);
          if (fallbackMatches.length > 0) {
             toast.success(`Found ${fallbackMatches.length} available drivers with empty seats!`);
          } else {
             toast.error('No drivers found with empty seats.');
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to calculate matches');
    } finally {
      setIsMatching(false);
    }
  };

  const handleBulkAssign = async () => {
    setIsAssignLoading(true);
    try {
      const res = await bulkAssignDrivers();
      if (res.success) {
        toast.success(`Auto-assigned ${res.data.successful} subscriptions`);
        if (res.data.failed > 0) {
          toast.error(`${res.data.failed} could not be assigned due to conflicts`);
        }
        setIsBulkModalOpen(false);
        fetchSubs();
      }
    } catch (err) {
      toast.error('Bulk assignment failed');
    } finally {
      setIsAssignLoading(false);
    }
  };

  const filteredSubs = subscriptions.filter(s => 
    s.user?.full_name?.toLowerCase().includes(searchSub.toLowerCase()) ||
    s.route?.pickup_city?.toLowerCase().includes(searchSub.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* LEFT PANEL: Subscriptions */}
      <Card className="flex-[4] flex flex-col p-0 overflow-hidden h-full">
        <div className="p-4 border-b border-navy-100 bg-navy-50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-navy-900 flex items-center gap-2">
              Unassigned <Badge color="red">{subscriptions.length}</Badge>
            </h2>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search passenger or city..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-navy-200 rounded-xl outline-none focus:border-primary-500"
              value={searchSub}
              onChange={(e) => setSearchSub(e.target.value)}
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {isLoadingSubs ? (
            <div className="py-12 flex justify-center"><Spinner /></div>
          ) : filteredSubs.length === 0 ? (
            <div className="py-12 text-center text-navy-400 text-sm">
              {searchSub ? 'No matches found.' : 'All active subscriptions are assigned.'}
            </div>
          ) : (
            filteredSubs.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => {
                  setSelectedSub(sub);
                  handleSmartMatch(sub.id);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedSub?.id === sub.id 
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm' 
                    : 'border-navy-100 bg-white hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={sub.user?.full_name} src={sub.user?.profile_photo} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy-900 text-sm truncate">{sub.user?.full_name}</p>
                    <p className="text-xs text-navy-500">{sub.user?.phone}</p>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded p-2 mb-2 text-xs text-navy-700 space-y-1">
                  <p className="truncate flex items-center gap-1"><MapPin size={12} className="text-green-500 shrink-0"/> {sub.route?.pickup_city}</p>
                  <p className="truncate flex items-center gap-1"><MapPin size={12} className="text-red-500 shrink-0"/> {sub.route?.drop_city}</p>
                </div>
                
                <div className="flex gap-1 flex-wrap">
                  {sub.slots_selected?.includes('morning') && <Badge color="blue" size="sm">Mor</Badge>}
                  {sub.slots_selected?.includes('evening') && <Badge color="blue" size="sm">Eve</Badge>}
                  <Badge color="gray" size="sm">{sub.plan?.name}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* RIGHT PANEL: Driver Assignment */}
      <Card className="flex-[6] flex flex-col p-0 overflow-hidden h-full border-primary-100 bg-primary-50/20">
        {!selectedSub ? (
          <div className="flex-1 flex flex-col items-center justify-center text-navy-400 p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Car size={32} className="text-navy-300" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-1">Select a Subscription</h3>
            <p className="text-sm">Choose a passenger from the left list to assign a driver.</p>
          </div>
        ) : (
          <>
            {/* Selected Sub Summary */}
            <div className="p-4 border-b border-primary-100 bg-white shadow-sm z-10 shrink-0">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-navy-900">Assigning Driver for:</h3>
                <button onClick={() => setSelectedSub(null)} className="text-xs text-navy-400 hover:text-navy-700 font-bold">Cancel</button>
              </div>
              <div className="flex items-center gap-4 bg-primary-50 border border-primary-100 p-3 rounded-xl">
                <Avatar name={selectedSub.user?.full_name} src={selectedSub.user?.profile_photo} size="lg" />
                <div className="flex-1">
                  <p className="font-bold text-navy-900">{selectedSub.user?.full_name}</p>
                  <p className="text-sm text-navy-600">{selectedSub.route?.pickup_city} → {selectedSub.route?.drop_city}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                      Req Slots: {selectedSub.slots_selected?.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-navy-100 bg-white/50 shrink-0 flex justify-between items-center">
              <h3 className="font-bold text-navy-900 flex items-center gap-2">
                Route Matches <Badge color="green">{smartMatchResults ? smartMatchResults.length : 0}</Badge>
              </h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleSmartMatch(selectedSub.id)} 
                isLoading={isMatching}
                className="border-primary-500 text-primary-600 hover:bg-primary-50 flex items-center gap-2"
              >
                <Sparkles size={16} className="text-yellow-500" /> Refresh Matches
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {isMatching ? (
                <div className="py-12 flex justify-center"><Spinner /></div>
              ) : smartMatchResults ? (
                smartMatchResults.length === 0 ? (
                  <div className="py-12 text-center text-navy-400 text-sm bg-white rounded-xl">
                    No matching drivers found for this route.
                  </div>
                ) : (
                  smartMatchResults.map((driver, idx) => (
                    <div key={driver.driver_profile_id} className={`bg-white p-4 rounded-xl border ${idx === 0 ? 'border-yellow-400 bg-yellow-50/30 shadow-md' : 'border-navy-100 shadow-sm'} flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden`}>
                      {idx === 0 && <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">BEST MATCH</div>}
                      {idx > 0 && idx < 3 && <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">GOOD MATCH</div>}
                      
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-navy-900 truncate">{driver.full_name}</h4>
                            <p className="text-xs text-navy-600 mb-1">Vehicle: {driver.vehicle?.brand} {driver.vehicle?.model} ({driver.vehicle?.plate_number})</p>
                            <div className="flex gap-2 flex-wrap">
                              <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded border border-primary-100">
                                Remaining Seats: {driver.available_seats || 0}
                              </span>
                              {driver.shift_type === 'forward' && (
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                                  Morning: {driver.morning_time}
                                </span>
                              )}
                              {driver.shift_type === 'return' && (
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                                  Evening: {driver.evening_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-primary-600">{driver.score}</span>
                            <span className="text-xs text-navy-500 block">Score</span>
                          </div>
                        </div>

                        {/* Score Bars */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-[10px] font-bold text-navy-500">
                          <div>
                            <div className="flex justify-between mb-0.5"><span>Proximity</span><span>{driver.score_breakdown.proximity}/30</span></div>
                            <div className="h-1.5 bg-navy-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{width: `${(driver.score_breakdown.proximity/30)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5"><span>Workload</span><span>{driver.score_breakdown.workload}/25</span></div>
                            <div className="h-1.5 bg-navy-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{width: `${(driver.score_breakdown.workload/25)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5"><span>Rating</span><span>{driver.score_breakdown.rating}/20</span></div>
                            <div className="h-1.5 bg-navy-100 rounded-full"><div className="h-full bg-yellow-400 rounded-full" style={{width: `${(driver.score_breakdown.rating/20)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5"><span>Attendance</span><span>{driver.score_breakdown.attendance}/15</span></div>
                            <div className="h-1.5 bg-navy-100 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{width: `${(driver.score_breakdown.attendance/15)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5"><span>Experience</span><span>{driver.score_breakdown.experience}/10</span></div>
                            <div className="h-1.5 bg-navy-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{width: `${(driver.score_breakdown.experience/10)*100}%`}}></div></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-navy-100 pt-3 md:pt-0 md:pl-4 mt-2 md:mt-0">
                        <Button size="sm" fullWidth onClick={() => handleAssign({ id: driver.driver_profile_id, full_name: driver.full_name, vehicles: [{id: driver.vehicle?.id}] })} isLoading={isAssignLoading}>
                          Assign Driver
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : null}
            </div>
          </>
        )}
      </Card>

      <ConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleBulkAssign}
        isLoading={isAssignLoading}
        title="Auto-Assign Drivers"
        message="This will automatically assign available drivers to unassigned subscriptions based on route proximity and slot availability. Are you sure you want to proceed?"
        confirmLabel="Run Auto-Assign"
      />
    </div>
  );
};

export default DriverAssignment;
