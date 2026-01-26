import { useState } from 'react';
import { X, AlertTriangle, Loader2, UserMinus } from 'lucide-react';
import api from '../utils/api';

/**
 * Confirmation dialog for removing users from a network
 * Shows warning and requires confirmation before removal
 */
const RemoveUserDialog = ({ isOpen, onClose, user, onUserRemoved }) => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleRemoveUser = async () => {
        try {
            setSubmitting(true);
            setError(null);
            const response = await api.delete(`/network/remove/${user.id}`);
            const data = response.data;

            // Show success notification
            alert(`✓ ${data.message}`);

            // Notify parent component
            if (onUserRemoved) {
                onUserRemoved();
            }

            // Close dialog
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        Confirmar Eliminación
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={submitting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-gray-700 mb-4">
                            ¿Estás seguro de que deseas remover a este usuario de la red?
                        </p>

                        {/* User Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-800">{user.fullName}</h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <span className={`
                                inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full
                                ${user.roles?.includes('ADMIN') ? 'bg-red-100 text-red-800' :
                                    user.roles?.includes('PASTOR') ? 'bg-green-100 text-green-800' :
                                        user.roles?.includes('LIDER_DOCE') ? 'bg-purple-100 text-purple-800' :
                                            user.roles?.includes('LIDER_CELULA') ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}
                            `}>
                                {Array.isArray(user.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                            </span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-800">
                                <p className="font-semibold mb-1">Importante:</p>
                                <p>
                                    El usuario será removido de esta red. Si el usuario tiene discípulos,
                                    estos permanecerán bajo su liderazgo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRemoveUser}
                            disabled={submitting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Removiendo...
                                </>
                            ) : (
                                <>
                                    <UserMinus className="w-4 h-4" />
                                    Remover Usuario
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemoveUserDialog;
