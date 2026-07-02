export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
    open: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export function calculateDaysLeft(endDate) {
  if (!endDate) return 0
  const end = new Date(endDate)
  const today = new Date()
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return diff
}

export function getSlotLabel(morningSlot, eveningSlot) {
  if (morningSlot && eveningSlot) return 'Morning & Evening'
  if (morningSlot) return 'Morning only'
  if (eveningSlot) return 'Evening only'
  return 'No slot'
}

export const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

export const getMapScriptUrl = (provider, key, clientId = '') => {
  if (provider === 'google') {
    return `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
  } else if (provider === 'mappls') {
    return `https://apis.mappls.com/advancedmaps/api/${key}/map_sdk?layer=vector&v=3.0`;
  }
  return '';
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0,5)} ${cleaned.slice(5,10)}`;
  }
  return phone;
};

export const generateAvatarColor = (name) => {
  if (!name) return '#2563EB';
  const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const haversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return 0;
  const toRad = (x) => (x * Math.PI) / 180;
  const lat1 = coords1.lat ?? coords1[1];
  const lon1 = coords1.lng ?? coords1[0];
  const lat2 = coords2.lat ?? coords2[1];
  const lon2 = coords2.lng ?? coords2[0];
  
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
