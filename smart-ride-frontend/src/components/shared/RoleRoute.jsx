import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';

const roleDashboards = {
  [ROLES.USER]: '/dashboard',
  [ROLES.DRIVER]: '/driver',
  [ROLES.ADMIN]: '/admin',
};

export default function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    const redirectTo = roleDashboards[user.role] || '/login';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
