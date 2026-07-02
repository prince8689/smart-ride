import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, Shield, Camera,
  Edit2, Check, X, Lock, Trash2, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getProfile, updateProfile, deleteAccount } from '../../api/user.api'
import { changePassword } from '../../api/auth.api'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { formatDate, getInitials } from '../../utils/helpers'

// Password strength calculator
function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 'Weak', color: 'bg-red-400', width: 'w-1/4' }
  if (score === 2) return { level: 'Fair', color: 'bg-orange-400', width: 'w-2/4' }
  if (score === 3) return { level: 'Good', color: 'bg-yellow-400', width: 'w-3/4' }
  return { level: 'Strong', color: 'bg-green-500', width: 'w-full' }
}

// Delete account modal
function DeleteAccountModal({ isOpen, onClose, onConfirm, isLoading }) {
  const [confirmText, setConfirmText] = useState('')
  const canConfirm = confirmText === 'DELETE'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Account" size="sm">
      <div className="space-y-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-sm font-semibold text-red-700 mb-1">
            ⚠️ This action cannot be undone
          </p>
          <p className="text-xs text-red-600">
            Your account, all subscriptions, and payment history will be permanently deactivated.
            Active subscriptions will be cancelled.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 font-mono"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!canConfirm}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Profile() {
  const { user: authUser, updateUser, logoutUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
  const [editLoading, setEditLoading] = useState(false)

  // Password form state
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState({
    current: false, new: false, confirm: false
  })
  const [pwErrors, setPwErrors] = useState({})

  useEffect(() => {
    getProfile()
      .then(res => {
        const data = res.data || res
        setProfile(data)
        setEditForm({
          full_name: data.full_name || '',
          phone: data.phone || ''
        })
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveProfile() {
    if (!editForm.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    
    const payload = {}
    if (editForm.full_name) payload.full_name = editForm.full_name
    if (editForm.phone) payload.phone = editForm.phone

    setEditLoading(true)
    try {
      const res = await updateProfile(payload)
      const updated = res.data || res
      setProfile(prev => ({ ...prev, ...updated }))
      updateUser(updated)
      setEditMode(false)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleChangePassword() {
    const errs = {}
    if (!pwForm.current_password) errs.current = 'Current password required'
    if (!pwForm.new_password) errs.new = 'New password required'
    if (pwForm.new_password.length < 8) errs.new = 'Min 8 characters'
    if (pwForm.new_password !== pwForm.confirm_password) {
      errs.confirm = 'Passwords do not match'
    }
    if (Object.keys(errs).length > 0) {
      setPwErrors(errs)
      return
    }

    setPwLoading(true)
    try {
      await changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setPwErrors({})
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    try {
      await deleteAccount()
      toast.success('Account deactivated')
      await logoutUser()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const strength = getPasswordStrength(pwForm.new_password)

  if (loading) {
    return (
      <div className="max-w-full mx-auto w-full space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const initials = getInitials(profile?.full_name || '')

  return (
    <div className="max-w-full mx-auto w-full space-y-6">

      {/* Profile header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-card p-6"
      >
        {/* Avatar */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{initials}</span>
              </div>
              <button
                onClick={() => toast('Photo upload coming soon', { icon: '📸' })}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white rounded-full border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Camera size={13} className="text-gray-500" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-navy-900">
                {profile?.full_name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium capitalize">
                  {profile?.role === 'user' ? 'Commuter' : profile?.role}
                </span>
                {profile?.is_verified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Shield size={10} />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Member since {formatDate(profile?.created_at)}
              </p>
            </div>
          </div>

          {!editMode ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 size={14} />}
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditMode(false)
                  setEditForm({
                    full_name: profile?.full_name || '',
                    phone: profile?.phone || ''
                  })
                }}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={15} className="text-gray-600" />
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-70"
              >
                <Check size={15} className="text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Profile fields */}
        <div className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Full Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={editForm.full_name}
                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            ) : (
              <div className="flex items-center gap-2 py-2.5">
                <User size={16} className="text-gray-400" />
                <span className="text-sm text-navy-900">{profile?.full_name}</span>
              </div>
            )}
          </div>

          {/* Email (read only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2 py-2.5">
              <Mail size={16} className="text-gray-400" />
              <span className="text-sm text-navy-900">{profile?.email}</span>
              {profile?.is_verified && (
                <span className="text-xs text-green-600 flex items-center gap-0.5">
                  <Check size={11} />
                  Verified
                </span>
              )}
            </div>
            {editMode && (
              <p className="text-xs text-gray-400 mt-0.5">
                Email cannot be changed. Contact support if needed.
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Phone Number
            </label>
            {editMode ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            ) : (
              <div className="flex items-center gap-2 py-2.5">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm text-navy-900">
                  {profile?.phone || 'Not provided'}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Change password card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-card p-6"
      >
        <h3 className="font-bold text-navy-900 mb-1 flex items-center gap-2">
          <Lock size={16} className="text-gray-500" />
          Change Password
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          Use a strong password with uppercase, lowercase, numbers and symbols
        </p>

        <div className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.current_password}
                onChange={e => {
                  setPwForm(f => ({ ...f, current_password: e.target.value }))
                  setPwErrors(e2 => ({ ...e2, current: '' }))
                }}
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  pwErrors.current
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-primary-600 focus:ring-primary-100'
                }`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.current && (
              <p className="text-red-500 text-xs mt-1">{pwErrors.current}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw.new ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={e => {
                  setPwForm(f => ({ ...f, new_password: e.target.value }))
                  setPwErrors(e2 => ({ ...e2, new: '' }))
                }}
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  pwErrors.new
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-primary-600 focus:ring-primary-100'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.new && (
              <p className="text-red-500 text-xs mt-1">{pwErrors.new}</p>
            )}

            {/* Password strength bar */}
            {pwForm.new_password && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: undefined }}
                    className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  strength.level === 'Strong' ? 'text-green-600' :
                  strength.level === 'Good' ? 'text-yellow-600' :
                  strength.level === 'Fair' ? 'text-orange-500' : 'text-red-500'
                }`}>
                  Password strength: {strength.level}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirm_password}
                onChange={e => {
                  setPwForm(f => ({ ...f, confirm_password: e.target.value }))
                  setPwErrors(e2 => ({ ...e2, confirm: '' }))
                }}
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  pwErrors.confirm
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : pwForm.confirm_password && pwForm.confirm_password === pwForm.new_password
                    ? 'border-green-400 focus:border-green-400 focus:ring-green-100'
                    : 'border-gray-200 focus:border-primary-600 focus:ring-primary-100'
                }`}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.confirm && (
              <p className="text-red-500 text-xs mt-1">{pwErrors.confirm}</p>
            )}
            {!pwErrors.confirm &&
              pwForm.confirm_password &&
              pwForm.confirm_password === pwForm.new_password && (
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <Check size={11} />
                Passwords match
              </p>
            )}
          </div>

          <Button
            variant="primary"
            isLoading={pwLoading}
            onClick={handleChangePassword}
          >
            Update Password
          </Button>
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-card p-6 border border-red-100"
      >
        <h3 className="font-bold text-red-600 mb-1 flex items-center gap-2">
          <Trash2 size={16} />
          Danger Zone
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Permanently deactivate your account. This action cannot be undone.
          All active subscriptions will be cancelled.
        </p>
        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 size={14} />}
          onClick={() => setDeleteModal(true)}
        >
          Delete My Account
        </Button>
      </motion.div>

      {/* Delete account modal */}
      <DeleteAccountModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={deleteLoading}
      />
    </div>
  )
}
