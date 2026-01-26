import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const useGuestManagement = ({ refreshTrigger } = {}) => {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [invitedByFilter, setInvitedByFilter] = useState(null);
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);

    const [currentUser, setCurrentUser] = useState(null);

    const searchDebounceTimeoutRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    const fetchGuests = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();

            if (statusFilter) params.append('status', statusFilter);
            if (invitedByFilter) params.append('invitedById', invitedByFilter);
            if (liderDoceFilter) params.append('liderDoceId', liderDoceFilter);
            if (searchTerm) params.append('search', searchTerm);

            const res = await api.get('/guests', {
                params: Object.fromEntries(params)
            });

            setGuests(res.data.guests || []);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || 'Error al cargar invitados');
            setGuests([]);
        } finally {
            setLoading(false);
        }
    }, [invitedByFilter, liderDoceFilter, searchTerm, statusFilter]);

    useEffect(() => {
        fetchGuests();
    }, [fetchGuests, refreshTrigger, statusFilter, invitedByFilter, liderDoceFilter]);

    useEffect(() => {
        if (searchDebounceTimeoutRef.current) {
            clearTimeout(searchDebounceTimeoutRef.current);
        }

        searchDebounceTimeoutRef.current = setTimeout(() => {
            fetchGuests();
        }, 500);

        return () => {
            if (searchDebounceTimeoutRef.current) {
                clearTimeout(searchDebounceTimeoutRef.current);
            }
        };
    }, [fetchGuests, searchTerm]);

    const updateGuest = useCallback(async (guestId, updates) => {
        try {
            await api.put(`/guests/${guestId}`, updates);
            await fetchGuests();
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al actualizar invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const deleteGuest = useCallback(async (guestId) => {
        try {
            await api.delete(`/guests/${guestId}`);
            await fetchGuests();
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al eliminar invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const convertGuestToMember = useCallback(async (guestId, { email, password }) => {
        try {
            await api.post(`/guests/${guestId}/convert-to-member`, { email, password });
            await fetchGuests();
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al convertir invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    return {
        guests,
        loading,
        error,
        setError,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        invitedByFilter,
        setInvitedByFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        currentUser,
        fetchGuests,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
    };
};

export default useGuestManagement;
