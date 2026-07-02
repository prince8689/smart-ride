import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../testUtils';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import App from '../../App';

describe('Complete Admin Journey', () => {
  beforeEach(() => {
    // Setup Admin user
    server.use(
      rest.get('*/api/auth/me', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: { user: { id: 3, full_name: 'Admin Test', role: 'admin' } } }));
      })
    );
  });

  test('Admin Dashboard Loads', async () => {
    server.use(
      rest.get('*/api/admin/dashboard-stats', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { stats: { total_users: 100, active_subscriptions: 50, today_revenue: 10000, pending_drivers: 5 } } 
        }));
      }),
      rest.get('*/api/admin/analytics/revenue', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { data: [{ name: 'Jan', value: 5000 }] } 
        }));
      })
    );

    window.history.pushState({}, 'Admin Dashboard', '/admin/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/Active Subscriptions/i)).toBeInTheDocument();
    });
  });

  test('Verify a Driver', async () => {
    server.use(
      rest.get('*/api/admin/drivers/unverified', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { drivers: [{ id: 10, full_name: 'Pending Driver', driver_profile: { license_number: 'DL123' }, vehicle: { plate_number: 'UP14AB' } }] } 
        }));
      }),
      rest.post('*/api/admin/drivers/10/verify', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Driver verified' }));
      })
    );

    window.history.pushState({}, 'Verify Drivers', '/admin/drivers/unverified');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Pending Driver/i)).toBeInTheDocument();
    });

    const verifyBtn = screen.getByRole('button', { name: /Verify Driver/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirm Verification/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Verify/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Assuming a toast shows, the unverified driver might be removed from DOM
      expect(screen.queryByText(/Pending Driver/i)).not.toBeInTheDocument();
    });
  });

  test('Assign Driver to Subscription - Smart Match', async () => {
    server.use(
      rest.get('*/api/admin/subscriptions/unassigned', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { subscriptions: [{ id: 5, pickup_address: 'A', drop_address: 'B', user: { full_name: 'Rider 1' } }] } 
        }));
      }),
      rest.get('*/api/admin/smart-match/5', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { recommendations: [{ driver_id: 1, driver_name: 'Smart Driver', match_score: 85 }] } 
        }));
      }),
      rest.post('*/api/admin/subscriptions/5/assign-driver', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Driver assigned' }));
      })
    );

    window.history.pushState({}, 'Assign', '/admin/assignments');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Rider 1/i)).toBeInTheDocument();
    });

    // Click sub
    fireEvent.click(screen.getByText(/Rider 1/i));

    // Wait for driver assignment panel
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Smart Match ✨/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Smart Match ✨/i }));

    await waitFor(() => {
      expect(screen.getByText(/Smart Driver/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Assign This Driver/i }));
  });
});
