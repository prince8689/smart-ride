import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Download, Eye, CheckCircle,
  XCircle, Clock, RefreshCw, IndianRupee
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyPayments, getInvoiceHTML } from '../../api/payment.api'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency, formatDateTime } from '../../utils/helpers'

const PAYMENT_STATUS = {
  success: { label: 'Paid', color: 'text-green-600 bg-green-50', icon: CheckCircle, iconColor: 'text-green-500' },
  pending: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50', icon: Clock, iconColor: 'text-yellow-500' },
  failed: { label: 'Failed', color: 'text-red-600 bg-red-50', icon: XCircle, iconColor: 'text-red-500' },
  refunded: { label: 'Refunded', color: 'text-purple-600 bg-purple-50', icon: RefreshCw, iconColor: 'text-purple-500' }
}

function PaymentRow({ payment, onViewInvoice }) {
  const status = PAYMENT_STATUS[payment.status] || PAYMENT_STATUS.pending
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-card transition-shadow"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <CreditCard size={18} className="text-primary-600" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy-900 text-sm truncate">
          {payment.plan_name || 'Subscription Payment'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {payment.invoice_number || payment.razorpay_payment_id || payment.id.slice(0, 8)}
        </p>
        <p className="text-xs text-gray-400">
          {formatDateTime(payment.created_at)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-navy-900">{formatCurrency(payment.amount)}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Actions */}
      {payment.status === 'success' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onViewInvoice(payment.id)}
            className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-primary-50 flex items-center justify-center transition-colors group"
            title="View Invoice"
          >
            <Eye size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>
          <button
            onClick={() => onViewInvoice(payment.id)}
            className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-primary-50 flex items-center justify-center transition-colors group"
            title="Download Invoice"
          >
            <Download size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [invoiceLoading, setInvoiceLoading] = useState(null)

  useEffect(() => {
    getMyPayments()
      .then(res => setPayments(res.data?.payments || res.data || []))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [])

  async function handleViewInvoice(paymentId) {
    setInvoiceLoading(paymentId)
    try {
      const res = await getInvoiceHTML(paymentId)
      // Open invoice HTML in new tab
      const html = typeof res === 'string' ? res : res.data
      if (html) {
        const tab = window.open()
        tab.document.write(html)
        tab.document.close()
      } else {
        // Fallback: navigate to invoice page
        window.open(`/invoice/${paymentId}`, '_blank')
      }
    } catch (err) {
      toast.error('Invoice not available')
    } finally {
      setInvoiceLoading(null)
    }
  }

  // Summary stats
  const totalSpent = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const successCount = payments.filter(p => p.status === 'success').length
  const pendingCount = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Payment History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All your transactions</p>
      </div>

      {/* Stats cards */}
      {payments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-primary-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee size={16} className="text-primary-200" />
              <p className="text-primary-200 text-sm">Total Spent</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalSpent)}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-gray-500 text-sm">Successful</p>
            </div>
            <p className="text-3xl font-bold text-navy-900">{successCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-500" />
              <p className="text-gray-500 text-sm">Pending</p>
            </div>
            <p className="text-3xl font-bold text-navy-900">{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Payments list */}
      {payments.length === 0 ? (
        <EmptyState variant="no-payments" />
      ) : (
        <div className="space-y-3">
          {payments.map(payment => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              onViewInvoice={handleViewInvoice}
            />
          ))}
        </div>
      )}
    </div>
  )
}
