import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Bell, BellOff } from 'lucide-react';
import api from '../../api/axios';
import toast from '../../utils/toastConfig';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
};

export default function PushSetup() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID key from backend
      const { data: { publicKey } } = await api.get('/push/vapid-public-key');
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send to backend
      await api.post('/push/subscribe', subscription);
      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error) {
      if (Notification.permission === 'denied') {
        toast.error('You blocked notifications. Please enable them in browser settings.');
      } else {
        toast.error('Failed to enable push notifications');
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isSubscribed ? 'bg-primary-50 text-primary-600' : 'bg-navy-50 text-navy-400'}`}>
          {isSubscribed ? <Bell size={24} /> : <BellOff size={24} />}
        </div>
        <div>
          <h3 className="font-bold text-navy-900">Push Notifications</h3>
          <p className="text-sm text-navy-500">
            {isSubscribed 
              ? 'You will receive real-time alerts for your rides.' 
              : 'Enable notifications to stay updated on your rides.'}
          </p>
        </div>
      </div>
      <Button
        variant={isSubscribed ? 'outline' : 'primary'}
        onClick={isSubscribed ? unsubscribe : subscribe}
        isLoading={isLoading}
      >
        {isSubscribed ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}
