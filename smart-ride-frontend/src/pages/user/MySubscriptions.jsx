import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck, MapPin, Clock, Car, User,
  Star, AlertCircle, CheckCircle, XCircle,
  RefreshCw, ChevronDown, ChevronUp, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getMySubscriptions, cancelSubscription, renewSubscription } from '../../api/subscription.api'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency, formatDate, calculateDaysLeft, getSlotLabel } from '../../utils/helpers'

// Status config for badges and colors
const STATUS_CONFIG = {
  active: { label: 'Active', color: 'green', icon: CheckCircle },
  pending: { label: 'Pending Payment', color: 'yellow', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
  expired: { label: 'Expired', color: 'gray', icon: AlertCircle },
  paused: { label: 'Paused', color: 'blue', icon: AlertCircle }
}

// Single subscription card component
function SubscriptionCard({ subscription, onCancel, onRenew }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const status = STATUS_CONFIG[subscription.status] || STATUS_CONFIG.pending
  const StatusIcon = status.icon
  const daysLeft = calculateDaysLeft(subscription.end_date)
  const progressPercent = Math.max(0, Math.min(100,
    (daysLeft / subscription.duration_days) * 100
  ))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
    >
      {/* Left accent border based on status */}
      <div className={`h-1 w-full ${
        subscription.status === 'active' ? 'bg-green-500' :
        subscription.status === 'pending' ? 'bg-yellow-400' :
        subscription.status === 'expired' ? 'bg-gray-300' :
        subscription.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-400'
      }`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-navy-900 text-lg">
                {subscription.plan_name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                subscription.plan_type === 'monthly' ? 'bg-blue-100 text-blue-700' :
                subscription.plan_type === 'quarterly' ? 'bg-purple-100 text-purple-700' :
                'bg-green-100 text-green-700'
              }`}>
                {subscription.plan_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIcon size={14} className={
                subscription.status === 'active' ? 'text-green-500' :
                subscription.status === 'pending' ? 'text-yellow-500' :
                subscription.status === 'expired' ? 'text-gray-400' :
                'text-red-400'
              } />
              <span className={`text-sm font-medium ${
                subscription.status === 'active' ? 'text-green-600' :
                subscription.status === 'pending' ? 'text-yellow-600' :
                subscription.status === 'expired' ? 'text-gray-500' :
                'text-red-500'
              }`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-primary-600">
              {formatCurrency(subscription.amount_paid || subscription.price)}
            </p>
            <p className="text-xs text-gray-400">
              {formatDate(subscription.start_date)} – {formatDate(subscription.end_date)}
            </p>
          </div>
        </div>

        {/* Route info */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <p className="text-sm text-gray-700 leading-tight">
              {subscription.pickup_address}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <p className="text-sm text-gray-700 leading-tight">
              {subscription.drop_address}
            </p>
          </div>
        </div>

        {/* Slot badges */}
        <div className="flex items-center gap-2 mb-4">
          {subscription.morning_slot && (
            <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">
              ☀️ Morning
              {subscription.morning_pickup_time && ` ${subscription.morning_pickup_time}`}
            </span>
          )}
          {subscription.evening_slot && (
            <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
              🌙 Evening
              {subscription.evening_pickup_time && ` ${subscription.evening_pickup_time}`}
            </span>
          )}
        </div>

        {/* Days remaining progress (only for active) */}
        {subscription.status === 'active' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{daysLeft} days remaining</span>
              <span>{subscription.duration_days} days total</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  progressPercent > 30 ? 'bg-primary-600' :
                  progressPercent > 10 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
              />
            </div>
            {daysLeft <= 7 && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                ⚠️ Expiring soon — renew to avoid interruption
              </p>
            )}
          </div>
        )}

        {/* Driver info */}
        {subscription.driver_name ? (
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-sm">
                {subscription.driver_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy-900 text-sm">{subscription.driver_name}</p>
              <div className="flex items-center gap-2">
                {subscription.driver_rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-600">{subscription.driver_rating}</span>
                  </div>
                )}
                {subscription.vehicle_number && (
                  <span className="text-xs text-gray-500 font-mono">
                    {subscription.vehicle_number}
                  </span>
                )}
              </div>
            </div>
            {subscription.driver_phone && (
              <a
                href={`tel:${subscription.driver_phone}`}
                className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
              >
                <Phone size={15} className="text-green-600" />
              </a>
            )}
          </div>
        ) : subscription.status === 'active' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl mb-4">
            <Clock size={16} className="text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              Driver being assigned — you'll be notified soon
            </p>
          </div>
        )}

        {/* Vehicle info (expandable) */}
        {subscription.vehicle_brand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <Car size={12} />
            {subscription.vehicle_brand} {subscription.vehicle_model}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Brand</p>
                  <p className="text-sm font-medium text-navy-900">{subscription.vehicle_brand}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Model</p>
                  <p className="text-sm font-medium text-navy-900">{subscription.vehicle_model}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Color</p>
                  <p className="text-sm font-medium text-navy-900">{subscription.vehicle_color}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {subscription.status === 'active' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(subscription)}
              >
                Cancel
              </Button>
            </>
          )}

          {subscription.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard/book')}
            >
              Complete Payment
            </Button>
          )}

          {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => onRenew(subscription)}
            >
              Renew Subscription
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Cancel modal
function CancelModal({ subscription, isOpen, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Subscription" size="sm">
      <div className="space-y-4">
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium mb-1">⚠️ Are you sure?</p>
          <p className="text-xs text-red-600">
            Your subscription will be cancelled immediately.
            Remaining days will not be refunded unless within refund window.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">
            Reason (optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tell us why you're cancelling..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-600 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Keep Subscription
          </Button>
          <Button
            variant="danger"
            fullWidth
            isLoading={isLoading}
            onClick={() => onConfirm(subscription.id, reason)}
          >
            Yes, Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// MAIN PAGE
export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('active')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const navigate = useNavigate()

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await getMySubscriptions()
      setSubscriptions(res.data || [])
    } catch (err) {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'expired', label: 'Expired' },
    { key: 'cancelled', label: 'Cancelled' }
  ]

  const filtered = activeFilter === 'all'
    ? subscriptions
    : subscriptions.filter(s => s.status === activeFilter)

  const counts = filters.reduce((acc, f) => {
    acc[f.key] = f.key === 'all'
      ? subscriptions.length
      : subscriptions.filter(s => s.status === f.key).length
    return acc
  }, {})

  async function handleCancel(subscriptionId, reason) {
    setCancelLoading(true)
    try {
      await cancelSubscription(subscriptionId, { reason })
      toast.success('Subscription cancelled successfully')
      setCancelTarget(null)
      fetchSubscriptions()
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel subscription')
    } finally {
      setCancelLoading(false)
    }
  }

  async function handleRenew(subscription) {
    try {
      await renewSubscription(subscription.id)
      toast.success('Subscription renewed! Complete payment to activate.')
      fetchSubscriptions()
      navigate('/dashboard/book')
    } catch (err) {
      toast.error(err?.message || 'Failed to renew subscription')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-card animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
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
          <h1 className="text-2xl font-bold text-navy-900">My Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/dashboard/book')}
        >
          + New Subscription
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === f.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subscription cards */}
      {filtered.length === 0 ? (
        <EmptyState
          variant="no-subscription"
          action={
            activeFilter === 'all'
              ? { label: 'Browse Plans', onClick: () => navigate('/dashboard/book') }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(sub => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onCancel={setCancelTarget}
              onRenew={handleRenew}
            />
          ))}
        </div>
      )}

      {/* Cancel modal */}
      <CancelModal
        subscription={cancelTarget}
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        isLoading={cancelLoading}
      />
    </div>
  )
}
