import { useState, useEffect } from 'react';
import { Calendar, Check, X, Users } from 'lucide-react';

const CellAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cells, setCells] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);
    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCells();
    }, []);

    useEffect(() => {
        if (selectedCell) {
            fetchCellMembers();
            fetchCellAttendance();
        }
    }, [selectedCell, date]);

    const fetchCells = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/consolidar/cells', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setCells(data);
            if (data.length > 0) {
                setSelectedCell(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching cells:', error);
        }
    };

    const fetchCellMembers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/consolidar/cells/${selectedCell}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setMembers(data);
        } catch (error) {
            console.error('Error fetching cell members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCellAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/consolidar/cell-attendance/${selectedCell}/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            const attendanceMap = {};
            data.forEach(att => {
                attendanceMap[att.userId] = att.status;
            });
            setAttendances(attendanceMap);
        } catch (error) {
            console.error('Error fetching cell attendance:', error);
        }
    };

    const toggleAttendance = (userId) => {
        setAttendances(prev => ({
            ...prev,
            [userId]: prev[userId] === 'PRESENTE' ? 'AUSENTE' : 'PRESENTE'
        }));
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const attendanceData = Object.entries(attendances).map(([userId, status]) => ({
                userId: parseInt(userId),
                status
            }));

            await fetch('http://localhost:5000/api/consolidar/cell-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date,
                    cellId: selectedCell,
                    attendances: attendanceData
                })
            });

            alert('Asistencia de célula guardada exitosamente');
        } catch (error) {
            console.error('Error saving cell attendance:', error);
            alert('Error al guardar asistencia');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <Users className="w-6 h-6 text-blue-600" />
                    <select
                        value={selectedCell || ''}
                        onChange={(e) => setSelectedCell(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {cells.map(cell => (
                            <option key={cell.id} value={cell.id}>
                                {cell.name} - {cell.leader.fullName}
                            </option>
                        ))}
                    </select>
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving || !selectedCell}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {saving ? 'Guardando...' : 'Guardar Asistencia'}
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Cargando miembros...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Asistencia
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {members.map((member) => {
                                const status = attendances[member.id] || 'AUSENTE';
                                const isPresent = status === 'PRESENTE';

                                return (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {member.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {member.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => toggleAttendance(member.id)}
                                                className={`
                          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                          ${isPresent
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }
                        `}
                                            >
                                                {isPresent ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        Presente
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-4 h-4" />
                                                        Ausente
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CellAttendance;
