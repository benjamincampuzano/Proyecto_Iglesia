import { useState, useEffect } from 'react';
import { Target, Plus, Clock, CheckCircle2, XCircle, Edit2, Trash2, FileText } from 'lucide-react';
import api from '../utils/api';
import GoalForm from '../components/GoalForm';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';

const Metas = () => {
    const { hasAnyRole } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    const isEditor = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_GOALS);

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta meta?')) {
            try {
                await api.delete(`/metas/${id}`);
                await fetchGoals();
            } catch (error) {
                console.error('Error deleting goal:', error);
                alert('Error al eliminar la meta');
            }
        }
    };

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/metas');
            setGoals(response.data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const getGoalStatus = (goal, percent) => {
        const isMet = percent >= 100;
        let deadline = null;

        if (goal.encuentro) {
            deadline = new Date(goal.encuentro.startDate);
        } else if (goal.convention) {
            deadline = new Date(goal.convention.startDate);
        } else if (goal.month && goal.year) {
            // Last day of the month
            deadline = new Date(goal.year, goal.month, 0);
        }

        const isPastDeadline = deadline && new Date() > deadline;

        if (isMet) return { label: 'CUMPLIÓ', color: 'green', icon: CheckCircle2 };
        if (isPastDeadline) return { label: 'NO CUMPLIÓ', color: 'red', icon: XCircle };
        return { label: 'EN PROGRESO', color: 'blue', icon: Clock };
    };

    const getDeadlineText = (goal) => {
        if (goal.encuentro) return new Date(goal.encuentro.startDate).toLocaleDateString();
        if (goal.convention) return new Date(goal.convention.startDate).toLocaleDateString();
        if (goal.month && goal.year) return `${goal.month}/${goal.year}`;
        return 'N/A';
    };

    const GoalRow = ({ goal }) => {
        const percent = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
        const status = getGoalStatus(goal, percent);
        const StatusIcon = status.icon;

        let goalName = '';
        if (goal.type.includes('CELL')) goalName = goal.type === 'CELL_COUNT' ? 'Meta Células' : 'Asistencia Células';
        else if (goal.encuentro) goalName = `Encuentro: ${goal.encuentro.name}`;
        else if (goal.convention) goalName = `Convención: ${goal.convention.theme}`;

        return (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td className="p-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                            {goal.user?.profile?.fullName || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400">Líder 12</span>
                    </div>
                </td>
                <td className="p-4">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{goalName}</span>
                        <span className="text-xs text-gray-500 capitalize">{goal.type.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                </td>
                <td className="p-4 text-center">
                    <span className="font-black text-gray-900 dark:text-white px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        {goal.targetValue}
                    </span>
                </td>
                <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{goal.currentValue}</span>
                        {goal.extraData?.totalPaid !== undefined && (
                            <span className="text-[10px] text-green-600 font-medium">
                                Abonado: ${goal.extraData.totalPaid.toLocaleString()}
                            </span>
                        )}
                    </div>
                </td>
                <td className="p-4">
                    <div className="w-full max-w-[140px] mx-auto">
                        <div className="flex justify-between mb-1">
                            <span className={`text-xs font-bold text-${status.color}-500`}>{percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-${status.color}-500 transition-all duration-500`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                </td>
                <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {getDeadlineText(goal)}
                </td>
                <td className="p-4">
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-${status.color}-50 dark:bg-${status.color}-900/20 text-${status.color}-600 dark:text-${status.color}-400 text-xs font-bold border border-${status.color}-100 dark:border-${status.color}-800/50 w-fit mx-auto`}>
                        <StatusIcon size={14} />
                        {status.label}
                    </div>
                </td>
                {isEditor && (
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => { setEditingGoal(goal); setShowGoalForm(true); }}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(goal.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Target className="text-blue-600" size={32} />
                        Tablero de Metas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Seguimiento detallado de objetivos y cumplimiento por líder
                    </p>
                </div>
                {isEditor && (
                    <button
                        onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={20} />
                        Nueva Meta
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Líder Doce</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Meta / KPI</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Objetivo</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Actual</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center w-40">Cumplimiento</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Fecha Límite</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                {isEditor && <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-sm font-medium">Cargando metas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : goals.length === 0 ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-16 text-center">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin metas registradas</h3>
                                        <p className="text-gray-500 text-sm mt-1">No hay datos para mostrar en este momento.</p>
                                    </td>
                                </tr>
                            ) : (
                                goals.map(goal => <GoalRow key={goal.id} goal={goal} />)
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showGoalForm && (
                <GoalForm
                    isOpen={showGoalForm}
                    onClose={() => setShowGoalForm(false)}
                    onSuccess={() => { fetchGoals(); setShowGoalForm(false); }}
                    initialData={editingGoal}
                />
            )}
        </div>
    );
};

export default Metas;
