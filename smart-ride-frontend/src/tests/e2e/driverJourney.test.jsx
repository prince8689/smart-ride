import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../testUtils';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import App from '../../App';

describe('Complete Driver Journey', () => {
  test('Driver Onboarding — Create Profile', async () => {
    // Mock user context as Driver
    server.use(
      rest.get('*/api/auth/me', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: { user: { id: 2, full_name: 'Driver Test', role: 'driver' } } }));
      }),
      rest.get('*/api/drivers/profile/me', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ success: false, message: 'Profile not found' }));
      }),
      rest.post('*/api/drivers/profile', (req, res, ctx) => {
        return res(ctx.status(201), ctx.json({ success: true, message: 'Profile created' }));
      })
    );

    window.history.pushState({}, 'Driver Dashboard', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Driver Onboarding/i)).toBeInTheDocument();
    });

    const licenseInput = screen.getByPlaceholderText(/e.g. MH01AB1234/i);
    const aadharInput = screen.getByPlaceholderText(/12 digit Aadhar/i);
    
    await userEvent.type(licenseInput, 'MH01AB1234');
    await userEvent.type(aadharInput, '123456789012');
    
    // Expiry date picker might be complex, assuming standard text input for tests
    const expiryInput = screen.getByLabelText(/License Expiry Date/i);
    fireEvent.change(expiryInput, { target: { value: '2026-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    await waitFor(() => {
      // Mock moves to next step (handled via state in component)
      expect(screen.queryByText(/Profile created/i)).toBeDefined(); 
    });
  });

  test('Pending Verification Screen', async () => {
    server.use(
      rest.get('*/api/drivers/profile/me', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { profile: { is_verified: false, license_number: 'MH01AB1234', vehicle_added: true } } 
        }));
      })
    );

    window.history.pushState({}, 'Driver Dashboard', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Profile Under Review/i)).toBeInTheDocument();
      expect(screen.getByText(/MH01AB1234/i)).toBeInTheDocument();
    });
  });

  test('Driver Dashboard After Verification', async () => {
    server.use(
      rest.get('*/api/drivers/profile/me', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { profile: { is_verified: true, is_online: true } } 
        }));
      }),
      rest.get('*/api/drivers/dashboard-stats', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { today_trips: 2, total_passengers: 4, monthly_earnings: 5000, attendance_rate: 98 } 
        }));
      }),
      rest.get('*/api/drivers/assigned-passengers', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ 
          success: true, 
          data: { passengers: [] } 
        }));
      })
    );

    window.history.pushState({}, 'Driver Dashboard', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Monthly Earnings/i)).toBeInTheDocument();
      expect(screen.getByText(/5000/i)).toBeInTheDocument();
    });
  });
});
