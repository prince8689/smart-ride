import React from 'react'
import { motion } from 'framer-motion'
import Button from './Button'

const VARIANTS = {
  'no-subscription': {
    emoji: '🚗',
    title: 'No subscriptions yet',
    description: 'Subscribe to Smart Ride and get the same trusted driver at your door every morning.'
  },
  'no-payments': {
    emoji: '💳',
    title: 'No payment history',
    description: 'Your payment records will appear here after your first subscription.'
  },
  'no-notifications': {
    emoji: '🔔',
    title: "You're all caught up!",
    description: "No new notifications. We'll let you know when something needs attention."
  },
  'no-complaints': {
    emoji: '😊',
    title: 'No complaints filed',
    description: 'Everything seems to be running smoothly!'
  },
  'no-data': {
    emoji: '📭',
    title: 'No data found',
    description: 'Nothing to show here yet.'
  },
  'no-results': {
    emoji: '🔍',
    title: 'No results found',
    description: 'Try adjusting your search or filters.'
  },
  'error': {
    emoji: '⚠️',
    title: 'Something went wrong',
    description: 'We hit an unexpected error. Please try refreshing the page.'
  }
}

export default function EmptyState({
  variant = 'no-data',
  title,
  description,
  action,
  size = 'md'
}) {
  const config = VARIANTS[variant] || VARIANTS['no-data']
  const finalTitle = title || config.title
  const finalDesc = description || config.description

  const emojiSize = size === 'sm' ? 'text-4xl' : size === 'lg' ? 'text-7xl' : 'text-5xl'
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={`${emojiSize} mb-4 select-none`}
      >
        {config.emoji}
      </motion.div>

      <h3 className={`font-bold text-navy-900 mb-2 ${titleSize}`}>
        {finalTitle}
      </h3>

      <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-6">
        {finalDesc}
      </p>

      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
