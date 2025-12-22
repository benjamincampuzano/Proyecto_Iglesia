import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, DollarSign, XCircle, Trash2, FileText, Users, Edit2, Download } from 'lucide-react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import UserSearchSelect from './UserSearchSelect';
import MultiUserSelect from './MultiUserSelect';
import BalanceReport from './BalanceReport';

const ConventionDetails = ({ convention, onBack, onRefresh }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendees'); // attendees, report
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [loading, setLoading] = useState(false);

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryRegistration, setSelectedHistoryRegistration] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        type: '',
        year: '',
        theme: '',
        cost: '',
        startDate: '',
        endDate: '',
        liderDoceIds: []
    });

    // Registration Form State
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [needsTransport, setNeedsTransport] = useState(false);
    const [needsAccommodation, setNeedsAccommodation] = useState(false);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        if (activeTab === 'report') {
            fetchReport();
        }
    }, [activeTab]);

    const fetchReport = async () => {
        setLoadingReport(true);
        try {
            const response = await api.get(`/convenciones/${convention.id}/report/balance`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            alert('Error cargando el reporte financiero');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/convenciones/${convention.id}/register`, {
                userId: selectedUserId,
                discountPercentage: parseFloat(discount),
                needsTransport,
                needsAccommodation
            });
            setShowRegisterModal(false);
            setSelectedUserId(null);
            setDiscount(0);
            setNeedsTransport(false);
            setNeedsAccommodation(false);
            onRefresh();
            // Refresh report if active
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error registering user:', error);
            alert('Error creating registration: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = () => {
        setEditData({
            type: convention.type,
            year: convention.year,
            theme: convention.theme || '',
            cost: convention.cost,
            startDate: new Date(convention.startDate).toISOString().split('T')[0],
            endDate: new Date(convention.endDate).toISOString().split('T')[0],
            liderDoceIds: convention.liderDoceIds || []
        });
        setShowEditModal(true);
    };

    const handleUpdateConvention = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/convenciones/${convention.id}`, editData);
            setShowEditModal(false);
            alert('Convención actualizada exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error updating convention:', error);
            alert('Error al actualizar: ' + (error.response?.data?.error || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        if (!convention.registrations || convention.registrations.length === 0) {
            alert('No hay registros para exportar');
            return;
        }

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Prepare data
        const exportData = convention.registrations.map((reg, index) => ({
            '#': index + 1,
            'Nombre': reg.user.fullName,
            'Email': reg.user.email,
            'Rol': reg.user.role,
            'Costo Base': convention.cost,
            'Descuento %': reg.discountPercentage,
            'Total a Pagar': reg.finalCost,
            'Abonado': reg.totalPaid,
            'Saldo': reg.balance,
            'Transporte': reg.needsTransport ? 'Sí' : 'No',
            'Alojamiento': reg.needsAccommodation ? 'Sí' : 'No',
            'Estado': reg.status
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Registros');

        // Generate filename
        const fileName = `${convention.type}_${convention.year}_registros.xlsx`;

        // Save file
        XLSX.writeFile(wb, fileName);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/convenciones/registrations/${selectedRegistration.id}/payments`, {
                amount: parseFloat(paymentAmount),
                notes: paymentNotes
            });
            setShowPaymentModal(false);
            setSelectedRegistration(null);
            setPaymentAmount('');
            setPaymentNotes('');
            onRefresh();
            // Refresh report if active
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Error adding payment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (registrationId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción también eliminará todos los abonos asociados.')) {
            return;
        }

        try {
            await api.delete(`/convenciones/registrations/${registrationId}`);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error deleting registration:', error);
            alert('Error al eliminar el registro: ' + (error.response?.data?.error || error.message));
        }
    };

    const openPaymentModal = (registration) => {
        setSelectedRegistration(registration);
        setShowPaymentModal(true);
    };

    const openHistoryModal = (registration) => {
        setSelectedHistoryRegistration(registration);
        setShowHistoryModal(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold dark:text-white">
                            {convention.type} {convention.year}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            {new Date(convention.startDate).toLocaleDateString()} - {new Date(convention.endDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('attendees')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'attendees'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Users size={16} className="mr-2" />
                        Asistentes
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'report'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <FileText size={16} className="mr-2" />
                        Reporte Financiero
                    </button>
                </div>
            </div>

            {/* General Stats - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Inscritos</h3>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                        {convention.registrations ? convention.registrations.length : 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Recaudado</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {formatCurrency(convention.registrations?.reduce((acc, reg) => acc + (reg.totalPaid || 0), 0) || 0)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pendiente por Cobrar</h3>
                    <p className="text-3xl font-bold text-orange-500 mt-2">
                        {formatCurrency(convention.registrations?.reduce((acc, reg) => acc + (reg.balance || 0), 0) || 0)}
                    </p>
                </div>
            </div>

            {/* Content for Tabs */}
            {activeTab === 'attendees' ? (
                <>
                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        {['SUPER_ADMIN', 'LIDER_DOCE'].includes(user?.role) && (
                            <button
                                onClick={handleExportToExcel}
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                                <Download size={20} className="mr-2" />
                                Exportar Excel
                            </button>
                        )}
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <UserPlus size={20} className="mr-2" />
                            Registrar Asistente
                        </button>
                    </div>

                    {/* Registrations List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asistente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descuento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total a Pagar</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Abonado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {convention.registrations?.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => openHistoryModal(reg)}
                                                    className="text-left group"
                                                >
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors underline decoration-dotted decoration-gray-400">
                                                        {reg.user.fullName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{reg.user.email}</div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatCurrency(convention.cost)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.discountPercentage}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(reg.finalCost)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                {formatCurrency(reg.totalPaid)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">
                                                {formatCurrency(reg.balance)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => openPaymentModal(reg)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center"
                                                    title="Agregar Abono"
                                                >
                                                    <DollarSign size={16} className="mr-1" />
                                                    Abonar
                                                </button>
                                                {(user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') && (
                                                    <button
                                                        onClick={() => handleDelete(reg.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                                                        title="Eliminar Registro"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!convention.registrations || convention.registrations.length === 0) && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No hay inscritos aún.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="animate-fade-in">
                    {loadingReport ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Cargando reporte financiero...</p>
                        </div>
                    ) : (
                        <BalanceReport data={reportData} title={`Reporte_${convention.type}`} />
                    )}
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrar Asistente</h3>
                            <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Usuario
                                </label>
                                <UserSearchSelect
                                    value={selectedUserId}
                                    onChange={setSelectedUserId}
                                    placeholder="Buscar por nombre..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Porcentaje de Descuento (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || !selectedUserId}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Registrando...' : 'Confirmar Inscripción'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrar Abono</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 mx-6 mt-6 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Usuario:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedRegistration.user.fullName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Saldo Pendiente:</span>
                                <span className="font-bold text-red-500">{formatCurrency(selectedRegistration.balance)}</span>
                            </div>
                        </div>
                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Monto a Abonar
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notas (Opcional)
                                </label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                ></textarea>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Registrar Pago'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && selectedHistoryRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Historial de Pagos - {selectedHistoryRegistration.user.fullName}
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {selectedHistoryRegistration.payments && selectedHistoryRegistration.payments.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedHistoryRegistration.payments.map((payment) => (
                                        <div key={payment.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(payment.amount)}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(payment.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {payment.notes && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                                    "{payment.notes}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No hay abonos registrados.
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Total Abonado:</span>
                                <span className="font-bold text-green-600">{formatCurrency(selectedHistoryRegistration.totalPaid)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConventionDetails;
