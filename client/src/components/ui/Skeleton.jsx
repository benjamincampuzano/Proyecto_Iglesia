import React from 'react';

// Skeleton Card Component
const SkeletonCard = ({ className = '', lines = 3, showAvatar = false }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
    {showAvatar && (
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    )}
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  </div>
);

// Skeleton List Component
const SkeletonList = ({ items = 5, className = '', showAvatar = false }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <SkeletonCard key={index} lines={2} showAvatar={showAvatar} />
    ))}
  </div>
);

// Skeleton Form Component
const SkeletonForm = ({ fields = 4, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 animate-pulse"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    ))}
  </div>
);

// Skeleton Table Component
const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`w-full ${className}`}>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-4 py-3 text-left">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-gray-200 dark:border-gray-700 ${
                rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''
              }`}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Skeleton Stats Cards Component
const SkeletonStats = ({ cards = 4, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: cards }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Skeleton Modal Component
const SkeletonModal = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden ${className}`}>
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 animate-pulse"></div>
    </div>
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 animate-pulse"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 animate-pulse"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 animate-pulse"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    </div>
    <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="flex space-x-3">
        <div className="flex-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
        <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Main Skeleton Component with variants
const Skeleton = ({ variant = 'card', className = '', ...props }) => {
  const variants = {
    card: SkeletonCard,
    list: SkeletonList,
    form: SkeletonForm,
    table: SkeletonTable,
    stats: SkeletonStats,
    modal: SkeletonModal
  };

  const Component = variants[variant];
  if (!Component) {
    console.warn(`Skeleton variant "${variant}" not found. Using card variant.`);
    return <SkeletonCard className={className} {...props} />;
  }

  return <Component className={className} {...props} />;
};

// Export individual components and main component
export {
  SkeletonCard,
  SkeletonList,
  SkeletonForm,
  SkeletonTable,
  SkeletonStats,
  SkeletonModal
};

export default Skeleton;
