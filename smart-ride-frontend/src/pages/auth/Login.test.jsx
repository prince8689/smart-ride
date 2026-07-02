import React from 'react';
import { render, screen, fireEvent, waitFor } from '../testUtils';
import Login from './Login';
import userEvent from '@testing-library/user-event';

describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login />);
    expect(screen.getByText(/Welcome Back to Smart Ride/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
  });

  test('shows validation errors on empty submit', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    render(<Login />);
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    
    // The MSW handler will return success, we just wait to ensure it's processing
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Signing In/i })).toBeInTheDocument();
    });
  });
});
