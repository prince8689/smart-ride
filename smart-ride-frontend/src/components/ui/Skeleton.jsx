import React from 'react';

// CSS for shimmer animation
// This is typically added to index.css but since Tailwind is used, 
// we can inject it or add a <style> tag if not already in tailwind config.
// Since the prompt specifies pure CSS shimmer duration 1.8s linear infinite:
const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .animate-shimmer {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 400% 100%;
    animation: shimmer 1.8s linear infinite;
  }
`;

export function SkeletonLine({ width = '100%', height = '16px', className = '' }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div 
        className={`animate-shimmer rounded ${className}`} 
        style={{ width, height }}
      />
    </>
  );
}

export function SkeletonCard({ lines = 3, showAvatar = false, showImage = false }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 w-full flex flex-col gap-4">
      {showImage && <SkeletonLine height="160px" className="rounded-lg w-full mb-2" />}
      <div className="flex items-center gap-4">
        {showAvatar && <SkeletonLine width="48px" height="48px" className="rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <SkeletonLine width="60%" height="20px" />
          {lines > 0 && <SkeletonLine width="40%" height="14px" />}
        </div>
      </div>
      {lines > 1 && (
        <div className="space-y-2 mt-2">
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <SkeletonLine key={i} width={i === lines - 2 ? "80%" : "100%"} height="14px" />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex bg-gray-50 border-b border-gray-200 px-6 py-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1">
            <SkeletonLine width="60%" height="16px" className="opacity-80" />
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex px-6 py-4 gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <SkeletonLine width={colIndex === 0 ? "80%" : "50%"} height="14px" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <SkeletonLine width="48px" height="48px" className="rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="50%" height="14px" />
            <SkeletonLine width="70%" height="24px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full">
      <SkeletonLine width="30%" height="20px" className="mb-6" />
      <SkeletonLine width="100%" height="240px" className="rounded-lg" />
    </div>
  );
}
