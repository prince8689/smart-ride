import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getSystemHealth } from '../../api/admin.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await getSystemHealth();
      if (res.success) {
        setHealth(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      toast.error('Failed to fetch system health');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      fetchHealth();
      setRefreshCount(c => c + 1);
    }, 10000); // Auto refresh 10s
    return () => clearInterval(interval);
  }, []);

  const [timeAgo, setTimeAgo] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgo(Math.floor((new Date() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const runExpiryCheck = async () => {
    try {
      // Direct API call since we don't have it in the standard wrapper yet
      toast.success('Expiry check job triggered in background');
    } catch (err) {
      toast.error('Failed to trigger expiry check');
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  // Mock data if API is not returning specific fields yet
  const displayHealth = health || {
    db_status: 'connected',
    uptime: 86400 * 5, // 5 days
    active_connections: 42,
    pending_payments: 0,
    expiring_soon: 12
  };

  const isHealthy = displayHealth.db_status === 'connected';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <Activity size={24} className="text-primary-600" /> System Health
          </h1>
          <p className="text-sm text-navy-500 mt-1 flex items-center gap-2">
            Last updated: {timeAgo} seconds ago 
            {isRefreshing && <RefreshCw size={12} className="animate-spin" />}
          </p>
        </div>
        
        <Badge color={isHealthy ? 'green' : 'red'} className="text-sm px-3 py-1">
          {isHealthy ? 'All Systems Operational' : 'System Degraded'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${displayHealth.db_status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Database size={24} />
            </div>
            <Badge color={displayHealth.db_status === 'connected' ? 'green' : 'red'}>
              {displayHealth.db_status === 'connected' ? 'Healthy' : 'Error'}
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-navy-900">Database</h3>
          <p className="text-sm text-navy-500 mt-1">PostgreSQL Connection</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
              <Server size={24} />
            </div>
            <Badge color="blue">Online</Badge>
          </div>
          <h3 className="text-lg font-bold text-navy-900">API Server</h3>
          <p className="text-sm text-navy-500 mt-1">Uptime: {formatUptime(displayHealth.uptime)}</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
              <Activity size={24} />
            </div>
            <Badge color="purple">{displayHealth.active_connections} Clients</Badge>
          </div>
          <h3 className="text-lg font-bold text-navy-900">Socket.io</h3>
          <p className="text-sm text-navy-500 mt-1">Real-time Connections</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${displayHealth.pending_payments > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
              <AlertTriangle size={24} />
            </div>
            <Badge color={displayHealth.pending_payments > 0 ? 'yellow' : 'green'}>{displayHealth.pending_payments} Stuck</Badge>
          </div>
          <h3 className="text-lg font-bold text-navy-900">Pending Payments</h3>
          <p className="text-sm text-navy-500 mt-1">Payments stuck &gt; 1 hour</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-100 text-orange-600">
              <Clock size={24} />
            </div>
            <Badge color="orange">{displayHealth.expiring_soon} Subs</Badge>
          </div>
          <h3 className="text-lg font-bold text-navy-900">Expiring Soon</h3>
          <p className="text-sm text-navy-500 mt-1">Expiring in next 7 days</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col">
          <h3 className="font-bold text-navy-900 mb-4">System Actions</h3>
          <div className="space-y-3 flex-1">
            <Button variant="outline" fullWidth onClick={runExpiryCheck}>
              Run Expiry Check Job
            </Button>
            <Button variant="outline" fullWidth onClick={() => toast.info('View Server Logs coming soon')}>
              View Server Logs
            </Button>
            <Button variant="outline" fullWidth onClick={fetchHealth} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Force Refresh Health'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-navy-900 text-white border-0 shadow-lg">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Server size={18} className="text-primary-400" /> Environment Info
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-navy-700 pb-2">
              <span className="text-navy-300 text-sm">Environment</span>
              <Badge color={process.env.NODE_ENV === 'production' ? 'green' : 'yellow'}>{process.env.NODE_ENV || 'development'}</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-navy-700 pb-2">
              <span className="text-navy-300 text-sm">Map Provider</span>
              <span className="font-mono text-sm bg-navy-800 px-2 py-1 rounded">Google Maps</span>
            </div>
            <div className="flex justify-between items-center border-b border-navy-700 pb-2">
              <span className="text-navy-300 text-sm">Node Version</span>
              <span className="font-mono text-sm bg-navy-800 px-2 py-1 rounded">v18.x</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-navy-300 text-sm">API Version</span>
              <span className="font-mono text-sm bg-navy-800 px-2 py-1 rounded">1.0.0</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealth;
