import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getQueries, resolveQuery } from '../../api/settings.api';
import { formatDateTime } from '../../utils/helpers';

export default function AdminQueries() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchQueries = async () => {
    try {
      const res = await getQueries();
      setQueries(res.data || []);
    } catch (err) {
      toast.error('Failed to load contact queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleResolve = async (id) => {
    const notes = window.prompt("Add admin notes for resolving this query (optional):");
    if (notes === null) return;

    setResolvingId(id);
    try {
      await resolveQuery(id, { admin_notes: notes });
      toast.success('Query marked as resolved');
      setQueries(prev => prev.map(q => q.id === id ? { ...q, status: 'resolved', admin_notes: notes } : q));
    } catch (err) {
      toast.error('Failed to resolve query');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredQueries = filter === 'all' 
    ? queries 
    : queries.filter(q => q.status === filter);

  if (loading) {
    return <div className="p-6">Loading queries...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Contact Queries</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage messages submitted from the public website.</p>
        </div>
        
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-navy-50 text-navy-900' : 'text-gray-500 hover:text-navy-900'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('open')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'open' ? 'bg-navy-50 text-navy-900' : 'text-gray-500 hover:text-navy-900'}`}
          >
            Open
          </button>
          <button 
            onClick={() => setFilter('resolved')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'resolved' ? 'bg-navy-50 text-navy-900' : 'text-gray-500 hover:text-navy-900'}`}
          >
            Resolved
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQueries.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No contact queries found.</p>
          </div>
        ) : (
          filteredQueries.map(q => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${q.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900">{q.subject || 'No Subject'}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{q.name}</span>
                      <span>•</span>
                      <a href={`mailto:${q.email}`} className="text-primary-600 hover:underline">{q.email}</a>
                      {q.phone && (
                        <>
                          <span>•</span>
                          <a href={`tel:${q.phone}`} className="text-primary-600 hover:underline">{q.phone}</a>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDateTime(q.created_at)}</span>
                    </div>
                  </div>
                </div>
                <Badge color={q.status === 'resolved' ? 'green' : 'yellow'}>
                  {q.status === 'resolved' ? 'Resolved' : 'Open'}
                </Badge>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-navy-800 border border-gray-100 mb-4 whitespace-pre-wrap">
                {q.message}
              </div>

              {q.status === 'resolved' && q.admin_notes && (
                <div className="text-sm bg-green-50 text-green-800 p-3 rounded-xl border border-green-100 mb-4">
                  <strong>Admin Notes:</strong> {q.admin_notes}
                </div>
              )}

              {q.status === 'open' && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    leftIcon={<CheckCircle size={14} />}
                    isLoading={resolvingId === q.id}
                    onClick={() => handleResolve(q.id)}
                  >
                    Mark as Resolved
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
