import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, X } from 'lucide-react'
import { getInvoiceHTML } from '../api/payment.api'
import Spinner from '../components/ui/Spinner'

export default function InvoicePrint() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getInvoiceHTML(paymentId)
      .then(res => {
        const invoiceHtml = typeof res === 'string' ? res : res.data
        setHtml(invoiceHtml || '')
      })
      .catch(err => setError(err?.message || 'Invoice not found'))
      .finally(() => setLoading(false))
  }, [paymentId])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-500 mt-3 text-sm">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            {error || 'This invoice is not available or may have been removed.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/payments')}
            className="text-primary-600 font-medium text-sm hover:underline"
          >
            ← Back to Payments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controls bar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-navy-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 hidden sm:block">
            Tip: Select "Save as PDF" in print dialog to download
          </p>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice content */}
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div
          className="bg-white rounded-2xl shadow-card overflow-hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .max-w-3xl { max-width: 100% !important; padding: 0 !important; }
          .bg-white.rounded-2xl { border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
