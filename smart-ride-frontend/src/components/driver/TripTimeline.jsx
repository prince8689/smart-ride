import React from 'react';
import { MapPin, Navigation, Clock, CheckCircle2, MoreVertical } from 'lucide-react';

const TripTimeline = ({ trip, userRole = 'passenger' }) => {
  if (!trip) return null;

  const isDriver = userRole === 'driver';
  
  // Status mapping to timeline steps
  const steps = [
    { id: 'scheduled', label: 'Trip Scheduled', time: trip.scheduled_pickup_time, icon: <Clock className="w-4 h-4" /> },
    { id: 'in_progress', label: isDriver ? 'Started Trip' : 'Driver Arrived', time: trip.actual_pickup_time, icon: <Navigation className="w-4 h-4" /> },
    { id: 'completed', label: 'Trip Completed', time: trip.actual_dropoff_time, icon: <CheckCircle2 className="w-4 h-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === trip.status);
  const activeStep = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100" id="trip-timeline">
      <h3 className="font-bold text-gray-800 mb-6">Trip Timeline</h3>
      
      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100 z-0"></div>
        
        <div className="space-y-8 relative z-10">
          {steps.map((step, idx) => {
            const isCompleted = trip.status === 'completed' || idx <= activeStep;
            const isCurrent = trip.status !== 'completed' && idx === activeStep;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <div key={step.id} className="flex gap-4">
                {/* Icon Marker */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0 transition-colors ${
                  isCompleted ? 'bg-emerald-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white shadow-blue-200' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step.icon}
                </div>
                
                {/* Content */}
                <div className={`pt-2 flex-1 ${isFuture ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-800'}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(step.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TripTimeline;
