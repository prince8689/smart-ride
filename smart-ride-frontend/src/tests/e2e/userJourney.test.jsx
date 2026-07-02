import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../testUtils';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import App from '../../App'; // Assuming App handles routing

// Mock window.matchMedia and Razorpay
beforeAll(() => {
  window.Razorpay = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    open: jest.fn()
  }));
});

describe('Complete User Journey', () => {
  test('User Registration Flow', async () => {
    // 1. We would ideally render <App /> and navigate to /register
    // Since routing can be complex in tests, we'll assume App renders the Router
    // and we simulate the path using window.history
    window.history.pushState({}, 'Register', '/register');
    render(<App />);

    // Wait for the component to load (lazy loading, etc.)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter your full name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Enter your full name/i);
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const phoneInput = screen.getByPlaceholderText(/Enter your 10-digit phone number/i);
    const passwordInput = screen.getByPlaceholderText(/Create a password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Confirm your password/i);

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'testuser@example.com');
    await userEvent.type(phoneInput, '9876543210');
    
    // Select role: user (Commuter) is default in the UI usually, but if there's a select:
    // await userEvent.selectOptions(screen.getByRole('combobox'), 'user');

    await userEvent.type(passwordInput, 'Test@1234');
    await userEvent.type(confirmPasswordInput, 'Test@1234');
    
    // Check terms
    const termsCheck = screen.getByRole('checkbox', { name: /I agree to the Terms & Conditions/i });
    if (termsCheck) {
      await userEvent.click(termsCheck);
    }

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    // Assert API call success (mocked) and navigation
    await waitFor(() => {
      expect(sessionStorage.getItem('sr_pending_email')).toBe('testuser@example.com');
    });
  });

  test('OTP Verification Flow', async () => {
    // Setup Mock for OTP Verify
    server.use(
      rest.post('*/api/auth/verify-otp', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            data: {
              token: 'fake-token-123',
              user: { id: 1, full_name: 'Test User', role: 'user' }
            }
          })
        );
      })
    );

    window.history.pushState({}, 'Verify OTP', '/verify-otp');
    render(<App />);

    await waitFor(() => {
      // Find OTP inputs
      const otpInputs = screen.getAllByRole('textbox');
      expect(otpInputs).toHaveLength(6);
    });

    const otpInputs = screen.getAllByRole('textbox');
    for (let i = 0; i < 6; i++) {
      fireEvent.change(otpInputs[i], { target: { value: (i + 1).toString() } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify OTP/i });
    expect(verifyBtn).toBeEnabled();
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(localStorage.getItem('sr_token')).toBe('fake-token-123');
    });
  });

  test('Dashboard Loads Correctly', async () => {
    // Mock user context would normally be handled by AuthProvider reading the token
    server.use(
      rest.get('*/api/auth/me', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: { user: { id: 1, full_name: 'Test User', role: 'user' } } }));
      }),
      rest.get('*/api/subscriptions/my-subscriptions', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: { subscriptions: [] } }));
      }),
      rest.get('*/api/payments/my-payments', (req, res, ctx) => {
        return res(ctx.json({ success: true, data: { payments: [] } }));
      })
    );

    window.history.pushState({}, 'Dashboard', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Good/i)).toBeInTheDocument(); // Good morning/afternoon/evening
      expect(screen.getByText(/Test!/i)).toBeInTheDocument(); // Name
    });

    // Check stats cards
    expect(screen.getByText(/Active Subscriptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Next Pickup/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
    
    // Check empty state
    expect(screen.getByText(/No active subscription/i)).toBeInTheDocument();
    
    // Check Quick actions
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });

  test('Browse Plans and Select', async () => {
    server.use(
      rest.get('*/api/subscriptions/plans', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          data: {
            plans: [
              { id: 1, name: 'Monthly Basic', price: 2000, plan_type: 'monthly', duration_days: 30, features: '[]' },
              { id: 2, name: 'Monthly Premium', price: 3500, plan_type: 'monthly', duration_days: 30, features: '[]' }
            ]
          }
        }));
      })
    );

    window.history.pushState({}, 'Book', '/dashboard/book');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Choose your subscription plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Monthly Premium/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Next: Select Route/i });
    expect(nextBtn).toBeDisabled();

    fireEvent.click(screen.getByText(/Monthly Premium/i));
    
    await waitFor(() => {
      expect(nextBtn).toBeEnabled();
    });
    
    fireEvent.click(nextBtn);
    // Proceeded to step 2 implicitly
  });
});
