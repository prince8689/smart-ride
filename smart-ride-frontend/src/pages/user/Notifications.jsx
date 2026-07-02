import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CreditCard, CalendarCheck, Car,
  MapPin, CheckCheck, Check, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/user.api'
import { useSocket } from '../../hooks/useSocket'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import { timeAgo, formatDateTime } from '../../utils/helpers'

// Icon and color for each notification type
const TYPE_CONFIG = {
  payment: {
    icon: CreditCard,
    bg: 'bg-green-100',
    color: 'text-green-600',
    border: 'border-l-green-500'
  },
  subscription: {
    icon: CalendarCheck,
    bg: 'bg-blue-100',
    color: 'text-blue-600',
    border: 'border-l-blue-500'
  },
  driver_assigned: {
    icon: Car,
    bg: 'bg-orange-100',
    color: 'text-orange-600',
    border: 'border-l-orange-500'
  },
  ride: {
    icon: MapPin,
    bg: 'bg-primary-100',
    color: 'text-primary-600',
    border: 'border-l-primary-500'
  },
  general: {
    icon: Bell,
    bg: 'bg-gray-100',
    color: 'text-gray-600',
    border: 'border-l-gray-400'
  }
}

// Group notifications by date
function groupByDate(notifications) {
  const groups = {}

  notifications.forEach(n => {
    const date = new Date(n.created_at)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    let key
    if (date.toDateString() === today.toDateString()) {
      key = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday'
    } else {
      key = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })

  return groups
}

// Single notification item
function NotificationItem({ notification, onMarkRead }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.general
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      className={`flex items-start gap-3 p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-sm ${
        notification.is_read
          ? 'bg-white border-l-gray-200'
          : `bg-blue-50/50 ${config.border}`
      }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <Icon size={16} className={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          notification.is_read ? 'text-gray-700' : 'text-navy-900 font-semibold'
        }`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />
      )}
    </motion.div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const { socket } = useSocket()

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await getNotifications({ page: pageNum, limit: 15 })
      const data = res.data?.notifications || res.data || []
      const total = res.data?.total || data.length

      if (append) {
        setNotifications(prev => [...prev, ...data])
      } else {
        setNotifications(data)
      }

      setHasMore(pageNum * 15 < total)
    } catch (err) {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(1)
  }, [fetchNotifications])

  // Real-time: new notification via socket
  useEffect(() => {
    if (!socket) return

    const handler = (notification) => {
      setNotifications(prev => [notification, ...prev])
    }

    socket.on('notification:new', handler)
    return () => socket.off('notification:new', handler)
  }, [socket])

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch {
      // Silently fail — not critical
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    await fetchNotifications(nextPage, true)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const grouped = groupByDate(notifications)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
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
          <h1 className="text-2xl font-bold text-navy-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-primary-600 mt-0.5 font-medium">
              {unreadCount} unread
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            isLoading={markingAll}
            leftIcon={<CheckCheck size={15} />}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications grouped by date */}
      {notifications.length === 0 ? (
        <EmptyState variant="no-notifications" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {date}
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {items.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            size="sm"
            isLoading={loadingMore}
            leftIcon={<ChevronDown size={15} />}
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
