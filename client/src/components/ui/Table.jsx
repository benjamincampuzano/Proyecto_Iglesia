import React from 'react';

const Table = ({
  data,
  columns,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  headerClassName = '',
  rowClassName = '',
  cellClassName = '',
  striped = true,
  hover = true,
  compact = false,
  ...props
}) => {
  const baseClasses = 'w-full border-collapse';
  const headerBaseClasses = 'bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700';
  const rowBaseClasses = 'border-b border-gray-200 dark:border-gray-700';
  const cellBaseClasses = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100';

  const sizeClasses = compact ? 'px-3 py-2' : 'px-4 py-3';

  const getRowClasses = (index) => {
    let classes = rowBaseClasses;
    
    if (striped && index % 2 === 1) {
      classes += ' bg-gray-50 dark:bg-gray-800/50';
    }
    
    if (hover) {
      classes += ' hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
    }
    
    return `${classes} ${rowClassName}`;
  };

  const getCellClasses = () => {
    return `${cellBaseClasses} ${sizeClasses} ${cellClassName}`;
  };

  const getHeaderClasses = () => {
    return `${headerBaseClasses} ${sizeClasses} font-semibold text-gray-700 dark:text-gray-300 text-left ${headerClassName}`;
  };

  if (loading) {
    return (
      <div className="w-full">
        <TableSkeleton rows={5} columns={columns.length} compact={compact} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={`${baseClasses} ${className}`} {...props}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={getHeaderClasses()}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className={getRowClasses(rowIndex)}>
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={getCellClasses()}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Table Skeleton Component for loading states
const TableSkeleton = ({ rows = 5, columns = 4, compact = false }) => {
  const sizeClasses = compact ? 'h-8' : 'h-12';
  
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {Array.from({ length: columns }).map((_, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-left ${compact ? 'px-3 py-2' : ''}`}
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-gray-200 dark:border-gray-700 ${rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${compact ? 'px-3 py-2' : ''}`}
                  >
                    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse`}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Table Actions Component for common actions
const TableActions = ({ actions, row, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {actions.map((action, index) => (
      <button
        key={index}
        onClick={() => action.onClick(row)}
        className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
          action.variant === 'primary'
            ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20'
            : action.variant === 'danger'
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        title={action.title}
      >
        {action.icon && <action.icon className="w-4 h-4" />}
      </button>
    ))}
  </div>
);

// Attach sub-components
Table.Skeleton = TableSkeleton;
Table.Actions = TableActions;

export default Table;
