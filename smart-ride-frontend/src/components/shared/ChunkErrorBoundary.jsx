import React from 'react';
import Button from '../ui/Button';

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chunk failed to load", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-navy-500 mb-6 max-w-md">We couldn't load this part of the app. This is usually caused by a poor network connection or an app update.</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ChunkErrorBoundary;
