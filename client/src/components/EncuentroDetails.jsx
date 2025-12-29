import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, DollarSign, CheckCircle, XCircle, Trash2, Calendar, BookOpen, FileText, Edit2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GuestSearchSelect from './GuestSearchSelect';
import MultiUserSelect from './MultiUserSelect';
import EncuentroClassTracker from './EncuentroClassTracker';
import BalanceReport from './BalanceReport';

const EncuentroDetails = ({ encuentro, onBack, onRefresh }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general'); // general | classes | report
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [loading, setLoading] = useState(false);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryRegistration, setSelectedHistoryRegistration] = useState(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertData, setConvertData] = useState({ email: '', password: '' });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        cost: '',
        startDate: '',
        endDate: '',
        type: '',
        liderDoceIds: []
    });

    // Registration Form State
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [discount, setDiscount] = useState(0);

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
            const response = await api.get(`/encuentros/${encuentro.id}/report/balance`);
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
            await api.post(`/encuentros/${encuentro.id}/register`, {
                guestId: selectedGuestId,
                discountPercentage: parseFloat(discount)
            });
            setShowRegisterModal(false);
            setSelectedGuestId(null);
            setDiscount(0);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error registering guest:', error);
            alert('Error creating registration: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/encuentros/registrations/${selectedRegistration.id}/payments`, {
                amount: parseFloat(paymentAmount),
                notes: paymentNotes
            });
            setShowPaymentModal(false);
            setSelectedRegistration(null);
            setPaymentAmount('');
            setPaymentNotes('');
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Error adding payment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (registrationId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            return;
        }

        try {
            await api.delete(`/encuentros/registrations/${registrationId}`);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error deleting registration:', error);
            alert('Error al eliminar');
        }
    };

    const handleConvertMember = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const guestId = selectedRegistration?.guest?.id;

            if (!guestId) {
                alert('No guest selected');
                return;
            }

            await api.post(`/guests/${guestId}/convert-to-member`, {
                email: convertData.email,
                password: convertData.password
            });
            setShowConvertModal(false);
            setConvertData({ email: '', password: '' });
            alert('Invitado convertido a Discípulo exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error converting guest:', error);
            alert('Error al convertir: ' + (error.response?.data?.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = () => {
        setEditData({
            name: encuentro.name,
            description: encuentro.description || '',
            cost: encuentro.cost,
            startDate: new Date(encuentro.startDate).toISOString().split('T')[0],
            endDate: new Date(encuentro.endDate).toISOString().split('T')[0],
            type: encuentro.type,
            liderDoceIds: encuentro.liderDoceIds || []
        });
        setShowEditModal(true);
    };

    const handleUpdateEncuentro = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/encuentros/${encuentro.id}`, editData);
            setShowEditModal(false);
            alert('Encuentro actualizado exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error updating encuentro:', error);
            alert('Error al actualizar: ' + (error.response?.data?.error || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const openHistoryModal = (registration) => {
        setSelectedHistoryRegistration(registration);
        setShowHistoryModal(true);
    };

    const openConvertModal = (registration) => {
        setSelectedRegistration(registration);
        setShowConvertModal(true);
    };

    const openPaymentModal = (registration) => {
        setSelectedRegistration(registration);
        setShowPaymentModal(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
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
                            {encuentro.name}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            {new Date(encuentro.startDate).toLocaleDateString()} - {new Date(encuentro.endDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                {(user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') && (
                    <button
                        onClick={openEditModal}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Edit2 size={20} />
                        <span>Editar Encuentro</span>
                    </button>
                )}
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Participantes</h3>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                        {encuentro.registrations ? encuentro.registrations.length : 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Recaudado</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                        {formatCurrency(encuentro.registrations?.reduce((acc, reg) => acc + (reg.totalPaid || 0), 0) || 0)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Por Cobrar</h3>
                    <p className="text-3xl font-bold text-orange-500 dark:text-orange-400 mt-2">
                        {formatCurrency(encuentro.registrations?.reduce((acc, reg) => acc + (reg.balance || 0), 0) || 0)}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'general'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Calendar size={18} className="mr-2" />
                        Pagos y Estado
                    </button>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'classes'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <BookOpen size={18} className="mr-2" />
                        Asistencia a Clases
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'report'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileText size={18} className="mr-2" />
                        Reporte Financiero
                    </button>
                </nav>
            </div>

            {/* Content Switcher */}
            {activeTab === 'general' && (
                <>
                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <UserPlus size={20} className="mr-2" />
                            Inscribir Invitado
                        </button>
                    </div>
                    {/* Payment/Status Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invitado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {encuentro.registrations?.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => openHistoryModal(reg)}
                                                    className="text-left group"
                                                >
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors underline decoration-dotted decoration-gray-400">
                                                        {reg.guest.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{reg.guest.phone}</div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'ATTENDED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatCurrency(reg.finalCost)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                                                {formatCurrency(reg.totalPaid)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 dark:text-red-400 font-medium">
                                                {formatCurrency(reg.balance)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => openPaymentModal(reg)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center"
                                                    title="Abonar"
                                                >
                                                    <DollarSign size={16} className="mr-1" />
                                                    Abonar
                                                </button>

                                                {(user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') && (
                                                    <>
                                                        <button
                                                            onClick={() => openConvertModal(reg)}
                                                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
                                                            title="Convertir a Discípulo"
                                                        >
                                                            <UserPlus size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(reg.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                                                            title="Eliminar Registro"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!encuentro.registrations || encuentro.registrations.length === 0) && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                No hay inscritos aún.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'classes' && (
                <div className="mt-4">
                    <EncuentroClassTracker
                        registrations={encuentro.registrations || []}
                        onRefresh={onRefresh}
                        onConvert={openConvertModal}
                    />
                </div>
            )}

            {activeTab === 'report' && (
                <div className="mt-6 animate-fade-in">
                    {loadingReport ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Cargando reporte financiero...</p>
                        </div>
                    ) : (
                        <BalanceReport data={reportData} title={`Reporte_${encuentro.name}`} />
                    )}
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inscribir Invitado</h3>
                            <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Buscar Invitado (Desde 'Ganar')
                                </label>
                                <GuestSearchSelect
                                    value={selectedGuestId}
                                    onChange={setSelectedGuestId}
                                    placeholder="Nombre del invitado..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descuento (%)
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
                                    disabled={loading || !selectedGuestId}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar Inscripción'}
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
                                <span className="text-gray-600 dark:text-gray-400">Invitado:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedRegistration.guest.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Saldo Pendiente:</span>
                                <span className="font-bold text-red-500 dark:text-red-400">{formatCurrency(selectedRegistration.balance)}</span>
                            </div>
                        </div>
                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Monto a Abonar
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                >
                                    Registrar Pago
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
                                Historial de Pagos - {selectedHistoryRegistration.guest.name}
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
                                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedHistoryRegistration.totalPaid)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Convert User Modal */}
            {showConvertModal && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Convertir a Discípulo</h3>
                            <button onClick={() => setShowConvertModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="px-6 pt-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Estás convirtiendo a <strong className="text-gray-900 dark:text-white">{selectedRegistration.guest.name}</strong> en un usuario Discípulo de la plataforma.
                            </p>
                        </div>
                        <form onSubmit={handleConvertMember} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={convertData.email}
                                    onChange={(e) => setConvertData({ ...convertData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={convertData.password}
                                    onChange={(e) => setConvertData({ ...convertData, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Procesando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Encuentro Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Encuentro</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEncuentro} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Costo
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editData.cost}
                                        onChange={(e) => setEditData({ ...editData, cost: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        value={editData.type}
                                        onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="MUJERES">Mujeres</option>
                                        <option value="JOVENES">Jóvenes</option>
                                        <option value="HOMBRES">Hombres</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha Inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.startDate}
                                        onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha Fin
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.endDate}
                                        onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <MultiUserSelect
                                    value={editData.liderDoceIds}
                                    onChange={(ids) => setEditData({ ...editData, liderDoceIds: ids })}
                                    label="Líderes de 12 Asignados"
                                    placeholder="Seleccionar Líderes de 12..."
                                    roleFilter="LIDER_DOCE"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EncuentroDetails;
