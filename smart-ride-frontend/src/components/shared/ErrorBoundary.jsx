// ========== FILE: src/components/shared/ErrorBoundary.jsx ==========
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Send to /api/errors if we want to
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack })
    }).catch(e => console.error('Failed to log error', e));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border-2 border-red-200 bg-red-50 text-red-700 rounded-xl flex items-center justify-center w-full h-full min-h-[200px]">
          Something went wrong loading this component.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
// ========== END ==========
