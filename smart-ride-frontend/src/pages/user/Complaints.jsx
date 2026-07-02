import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Plus, ChevronDown,
  ChevronUp, Clock, CheckCircle,
  AlertCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getComplaints, submitComplaint } from '../../api/user.api'
import { getMySubscriptions } from '../../api/subscription.api'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { formatDateTime, timeAgo } from '../../utils/helpers'

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  closed: {
    label: 'Closed',
    icon: XCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  }
}

// New complaint modal
function NewComplaintModal({ isOpen, onClose, onSubmit, subscriptions }) {
  const [form, setForm] = useState({
    subject: '',
    description: '',
    subscription_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!form.subject.trim()) errs.subject = 'Subject is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (form.description.trim().length < 20) {
      errs.description = 'Please provide more detail (min 20 characters)'
    }
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        subject: form.subject.trim(),
        description: form.description.trim(),
        subscription_id: form.subscription_id || undefined
      })
      setForm({ subject: '', description: '', subscription_id: '' })
      setErrors({})
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({ subject: '', description: '', subscription_id: '' })
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit a Complaint" size="md">
      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Brief summary of your issue"
            maxLength={200}
            value={form.subject}
            onChange={e => {
              setForm(f => ({ ...f, subject: e.target.value }))
              setErrors(e2 => ({ ...e2, subject: '' }))
            }}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.subject
                ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                : 'border-gray-200 focus:border-primary-600 focus:ring-primary-100'
            }`}
          />
          {errors.subject && (
            <p className="text-red-500 text-xs mt-1">{errors.subject}</p>
          )}
        </div>

        {/* Related subscription (optional) */}
        {subscriptions.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1">
              Related Subscription <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={form.subscription_id}
              onChange={e => setForm(f => ({ ...f, subscription_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 bg-white"
            >
              <option value="">Not related to a specific subscription</option>
              {subscriptions
                .filter(s => s.status === 'active')
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.plan_name} — {s.route_name || s.pickup_address?.slice(0, 30)}
                  </option>
                ))
              }
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Please describe the issue in detail. Include dates, times, and any relevant information that will help us resolve this quickly."
            maxLength={1000}
            value={form.description}
            onChange={e => {
              setForm(f => ({ ...f, description: e.target.value }))
              setErrors(e2 => ({ ...e2, description: '' }))
            }}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors resize-none ${
              errors.description
                ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                : 'border-gray-200 focus:border-primary-600 focus:ring-primary-100'
            }`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.description ? (
              <p className="text-red-500 text-xs">{errors.description}</p>
            ) : <span />}
            <p className="text-xs text-gray-400">{form.description.length}/1000</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            isLoading={loading}
            onClick={handleSubmit}
          >
            Submit Complaint
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Single complaint card
function ComplaintCard({ complaint }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.open
  const StatusIcon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border ${config.border} overflow-hidden`}
    >
      {/* Header */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                <StatusIcon size={11} />
                {config.label}
              </span>
              <span className="text-xs text-gray-400">
                {timeAgo(complaint.created_at)}
              </span>
            </div>
            <h3 className="font-semibold text-navy-900 text-sm leading-snug">
              {complaint.subject}
            </h3>
          </div>
          <button className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Your Complaint
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {complaint.description}
                </p>
              </div>

              {/* Submitted info */}
              <div className="text-xs text-gray-400">
                Submitted: {formatDateTime(complaint.created_at)}
                {complaint.updated_at !== complaint.created_at && (
                  <span> · Updated: {formatDateTime(complaint.updated_at)}</span>
                )}
              </div>

              {/* Admin response */}
              {complaint.admin_response && (
                <div className="bg-primary-50 rounded-xl p-4 border-l-4 border-primary-400">
                  <p className="text-xs font-semibold text-primary-600 mb-1 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Smart Ride Support Response
                  </p>
                  <p className="text-sm text-navy-900 leading-relaxed">
                    {complaint.admin_response}
                  </p>
                </div>
              )}

              {/* Awaiting response */}
              {!complaint.admin_response && complaint.status === 'open' && (
                <div className="bg-yellow-50 rounded-xl p-3 flex items-center gap-2">
                  <Clock size={14} className="text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Our team will respond within 24 hours
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchAll = useCallback(async () => {
    try {
      const [compRes, subRes] = await Promise.all([
        getComplaints(),
        getMySubscriptions()
      ])
      setComplaints(compRes.data?.complaints || compRes.data?.data || compRes.data || [])
      setSubscriptions(subRes.data?.subscriptions || subRes.data?.data || subRes.data || [])
    } catch {
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleSubmit(data) {
    try {
      await submitComplaint(data)
      toast.success('Complaint submitted successfully. We will respond within 24 hours.')
      setModalOpen(false)
      fetchAll()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit complaint')
    }
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' }
  ]

  const filtered = activeFilter === 'all'
    ? complaints
    : complaints.filter(c => c.status === activeFilter)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Complaints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} submitted
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
        >
          New Complaint
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className={`ml-1.5 text-xs ${activeFilter === f.key ? 'opacity-70' : 'text-gray-400'}`}>
                {complaints.filter(c => c.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      {filtered.length === 0 ? (
        <EmptyState
          variant={activeFilter === 'all' ? 'no-complaints' : 'no-results'}
          action={
            activeFilter === 'all'
              ? { label: 'Submit a Complaint', onClick: () => setModalOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(complaint => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}

      {/* New complaint modal */}
      <NewComplaintModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        subscriptions={subscriptions}
      />
    </div>
  )
}
