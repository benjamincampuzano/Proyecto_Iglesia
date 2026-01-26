import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

const useCellAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [cells, setCells] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);

    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');

    const fetchCells = useCallback(async () => {
        try {
            const response = await api.get('/enviar/cells');
            const data = response.data;
            if (Array.isArray(data)) {
                setCells(data);
                if (data.length > 0) {
                    setSelectedCell(data[0].id);
                } else {
                    setSelectedCell(null);
                }
            } else {
                setCells([]);
                setSelectedCell(null);
            }
        } catch (err) {
            setCells([]);
            setSelectedCell(null);
            setError(err.userMessage || 'Error fetching cells');
        }
    }, []);

    const fetchCellMembers = useCallback(async () => {
        if (!selectedCell) return;

        try {
            setLoading(true);
            const response = await api.get(`/enviar/cells/${selectedCell}/members`);
            const data = response.data;

            if (Array.isArray(data)) {
                setMembers(data);
            } else {
                setMembers([]);
            }
        } catch (err) {
            setError(err.userMessage || 'Error fetching cell members');
        } finally {
            setLoading(false);
        }
    }, [selectedCell]);

    const fetchCellAttendance = useCallback(async () => {
        if (!selectedCell) return;

        try {
            const response = await api.get(`/enviar/cell-attendance/${selectedCell}/${date}`);
            const data = response.data;

            const attendanceMap = {};
            if (Array.isArray(data)) {
                data.forEach(att => {
                    attendanceMap[att.userId] = att.status;
                });
            }

            setAttendances(attendanceMap);
        } catch (err) {
            setError(err.userMessage || 'Error fetching cell attendance');
        }
    }, [date, selectedCell]);

    useEffect(() => {
        fetchCells();
    }, [fetchCells]);

    useEffect(() => {
        if (selectedCell) {
            fetchCellMembers();
            fetchCellAttendance();
        }
    }, [fetchCellAttendance, fetchCellMembers, selectedCell, date]);

    const toggleAttendance = useCallback((userId, status) => {
        setAttendances(prev => {
            const currentStatus = prev[userId];
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
    }, []);

    const saveAttendance = useCallback(async () => {
        if (!selectedCell) return { success: false, message: 'Célula no seleccionada' };

        const attendanceData = Object.entries(attendances).map(([userId, status]) => ({
            userId: parseInt(userId),
            status
        }));

        if (attendanceData.length === 0) {
            return { success: false, message: 'No hay registros de asistencia para guardar' };
        }

        try {
            setSaving(true);
            await api.post('/enviar/cell-attendance', {
                date,
                cellId: selectedCell,
                attendances: attendanceData
            });
            return { success: true };
        } catch (err) {
            const message = err.userMessage || 'Error al guardar asistencia';
            setError(message);
            return { success: false, message };
        } finally {
            setSaving(false);
        }
    }, [attendances, date, selectedCell]);

    return {
        date,
        setDate,
        cells,
        selectedCell,
        setSelectedCell,
        members,
        attendances,
        toggleAttendance,
        loading,
        saving,
        error,
        setError,
        refetchCells: fetchCells,
        refetchMembers: fetchCellMembers,
        refetchAttendance: fetchCellAttendance,
        saveAttendance,
    };
};

export default useCellAttendance;
