import { ChevronLeft, ChevronRight } from 'lucide-react';

const DataTable = ({
    columns = [],
    data = [],
    rowKey = 'id',
    loading = false,
    skeletonRowCount = 5,
    emptyMessage = 'No hay datos para mostrar.',
    containerClassName = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden',
    tableClassName = 'w-full text-left',
    theadClassName = 'bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700',
    tbodyClassName = 'divide-y divide-gray-100 dark:divide-gray-700',
    rowClassName,
    onRowClick,
    pagination,
}) => {
    const getRowKey = (row, index) => {
        if (typeof rowKey === 'function') return rowKey(row);
        return row?.[rowKey] ?? index;
    };

    const colCount = columns.length;

    return (
        <div className={containerClassName}>
            <div className="overflow-x-auto">
                <table className={tableClassName}>
                    <thead className={theadClassName}>
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={col.key || idx}
                                    className={col.headerClassName || 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider'}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={tbodyClassName}>
                        {loading ? (
                            Array(skeletonRowCount).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={colCount} className="px-6 py-4 h-12 bg-gray-50/50 dark:bg-gray-800/50"></td>
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={colCount} className="px-6 py-12 text-center text-gray-500">{emptyMessage}</td>
                            </tr>
                        ) : (
                            data.map((row, index) => (
                                <tr
                                    key={getRowKey(row, index)}
                                    className={typeof rowClassName === 'function'
                                        ? rowClassName(row)
                                        : (rowClassName || 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors')
                                    }
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    role={onRowClick ? 'button' : undefined}
                                >
                                    {columns.map((col, idx) => (
                                        <td key={col.key || idx} className={col.cellClassName || 'px-6 py-4'}>
                                            {typeof col.render === 'function'
                                                ? col.render(row)
                                                : (col.accessor ? row?.[col.accessor] : null)
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Mostrando página <span className="font-medium">{pagination.page}</span> de <span className="font-medium">{pagination.pages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={pagination.onPrev}
                            disabled={pagination.page <= 1}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={pagination.onNext}
                            disabled={pagination.page >= pagination.pages}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
