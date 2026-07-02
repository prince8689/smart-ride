import React, { useState } from 'react';
import { Megaphone, Send, Bell } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { useAdminSocket } from '../../hooks/useAdminSocket';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { timeAgo } from '../../utils/helpers';

const Broadcast = () => {
  const { sendBroadcast, isConnected } = useAdminSocket();
  const [target, setTarget] = useState('all'); // all | drivers | commuters
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    
    if (!isConnected) {
      toast.error('Socket disconnected. Cannot send broadcast currently.');
      return;
    }

    setIsSending(true);
    try {
      sendBroadcast({ title, body: message }, target);
      
      setHistory(prev => [{
        id: Date.now(),
        target,
        title,
        message,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
      
      toast.success('Broadcast sent successfully!');
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error('Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-12">
      <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2 mb-6">
        <Megaphone size={24} className="text-primary-600" /> Send Broadcast
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-navy-900 mb-6">Compose Message</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-navy-700 block mb-2">Target Audience</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'drivers', label: 'Online Drivers' },
                  { id: 'commuters', label: 'Commuters' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTarget(t.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      target === t.id 
                        ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                        : 'border-navy-200 text-navy-600 hover:bg-navy-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-navy-700 block mb-1">Message Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                className="w-full border border-navy-200 rounded-xl p-3 outline-none focus:border-primary-500"
                placeholder="e.g. Service Update: Heavy Rain Expected"
              />
              <p className="text-right text-xs text-navy-400 mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="text-sm font-bold text-navy-700 block mb-1">Message Body</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                className="w-full border border-navy-200 rounded-xl p-3 outline-none focus:border-primary-500 min-h-[120px]"
                placeholder="Type your broadcast message here..."
              />
              <p className="text-right text-xs text-navy-400 mt-1">{message.length}/500</p>
            </div>

            <Button 
              fullWidth 
              size="lg" 
              leftIcon={<Send size={18} />} 
              onClick={handleSend} 
              isLoading={isSending}
              disabled={!title.trim() || !message.trim()}
            >
              Send Broadcast
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 bg-navy-50 border-navy-100">
            <h3 className="font-bold text-navy-900 mb-4">User Preview</h3>
            
            <div className="bg-white rounded-2xl shadow-lg border border-navy-100 overflow-hidden relative">
              {/* Fake Phone UI Top */}
              <div className="bg-navy-900 h-6 w-full px-4 flex justify-between items-center text-[10px] text-white/80">
                <span>9:41</span>
                <div className="flex gap-1"><span>LTE</span><span>🔋</span></div>
              </div>
              
              <div className="p-4 bg-gray-100 h-48 relative">
                {/* Notification Bubble Preview */}
                {(title || message) ? (
                  <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 animate-fade-in absolute top-4 left-4 right-4">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-white">
                          <span className="text-[10px] font-black font-mono">SR</span>
                        </div>
                        <span className="text-xs font-bold text-navy-900 uppercase">Smart Ride</span>
                      </div>
                      <span className="text-[10px] text-navy-400">now</span>
                    </div>
                    <p className="font-bold text-navy-900 text-sm mt-1">{title}</p>
                    <p className="text-xs text-navy-600 line-clamp-2 leading-relaxed mt-0.5">{message}</p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-navy-300 text-sm">
                    Start typing to see preview
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-navy-100 bg-navy-50">
              <h3 className="font-bold text-navy-900 text-sm">Recent Broadcasts (Session)</h3>
            </div>
            
            <div className="divide-y divide-navy-50">
              {history.length === 0 ? (
                <div className="p-6 text-center text-navy-400 text-sm">No broadcasts sent in this session</div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <Badge color="blue" size="sm" className="capitalize">Target: {item.target}</Badge>
                      <span className="text-xs text-navy-400">{timeAgo(item.timestamp)}</span>
                    </div>
                    <p className="font-bold text-navy-900 text-sm">{item.title}</p>
                    <p className="text-xs text-navy-600 line-clamp-1">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Broadcast;
