import { useState, useEffect } from 'react';
import { Calendar, Check, X, Users, Map as MapIcon } from 'lucide-react';
import CellMap from './CellMap';

const CellAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cells, setCells] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);
    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);
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
            const response = await fetch('http://localhost:5000/api/enviar/cells', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setCells(data);
                if (data.length > 0) {
                    setSelectedCell(data[0].id);
                }
            } else {
                setCells([]);
            }
        } catch (error) {
            console.error('Error fetching cells:', error);
            setCells([]); // Ensure it's an array even on error
        }
    };

    const fetchCellMembers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/enviar/cells/${selectedCell}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setMembers(data);
            } else {
                setMembers([]);
                console.error('Members data is not an array:', data);
            }
        } catch (error) {
            console.error('Error fetching cell members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCellAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/enviar/cell-attendance/${selectedCell}/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            const attendanceMap = {};
            if (Array.isArray(data)) {
                data.forEach(att => {
                    attendanceMap[att.userId] = att.status;
                });
            } else {
                console.error('Attendance data is not an array:', data);
            }
            setAttendances(attendanceMap);
        } catch (error) {
            console.error('Error fetching cell attendance:', error);
        }
    };

    const handleAttendanceChange = (userId, status) => {
        setAttendances(prev => {
            const currentStatus = prev[userId];
            // Si hace click en el mismo estado, lo desmarca (vuelve a vacío)
            if (currentStatus === status) {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            }
            return {
                ...prev,
                [userId]: status
            };
        });
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            // Solo enviar registros que tengan estado definido
            const attendanceData = Object.entries(attendances).map(([userId, status]) => ({
                userId: parseInt(userId),
                status
            }));

            if (attendanceData.length === 0) {
                alert('No hay registros de asistencia para guardar');
                return;
            }

            await fetch('http://localhost:5000/api/enviar/cell-attendance', {
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
            {/* Header with Map Toggle */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <MapIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Georreferenciación</h3>
                        <p className="text-xs text-gray-500">Ubicación de células</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${showMap
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                >
                    {showMap ? 'Ocultar Mapa' : 'Ver Mapa'}
                </button>
            </div>

            {showMap && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <CellMap cells={cells} />
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-gray-100">
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
                    disabled={saving || !selectedCell || user?.role === 'MIEMBRO'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {saving ? 'Guardando...' : (user?.role === 'MIEMBRO' ? 'Solo Lectura' : 'Guardar Asistencia')}
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
                                const status = attendances[member.id]; // undefined, 'PRESENTE', 'AUSENTE'

                                return (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {member.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {member.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleAttendanceChange(member.id, 'PRESENTE')}
                                                    disabled={user?.role === 'MIEMBRO'}
                                                    className={`
                                                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors
                                                      ${status === 'PRESENTE'
                                                            ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }
                                                        ${user?.role === 'MIEMBRO' ? 'cursor-not-allowed opacity-80' : ''}
                                                    `}
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Presente
                                                </button>
                                                <button
                                                    onClick={() => handleAttendanceChange(member.id, 'AUSENTE')}
                                                    disabled={user?.role === 'MIEMBRO'}
                                                    className={`
                                                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors
                                                      ${status === 'AUSENTE'
                                                            ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }
                                                        ${user?.role === 'MIEMBRO' ? 'cursor-not-allowed opacity-80' : ''}
                                                    `}
                                                >
                                                    <X className="w-4 h-4" />
                                                    Ausente
                                                </button>
                                            </div>
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
