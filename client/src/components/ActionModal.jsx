import { X } from 'lucide-react';

const ActionModal = ({
    isOpen,
    title,
    onClose,
    children,
    containerClassName = '',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full overflow-hidden ${containerClassName}`}
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default ActionModal;
