import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        fullName: '',
        birthDate: '',
        email: '',
        password: '',
        role: 'DISCIPULO',
        sex: 'HOMBRE',
        phone: '',
        address: '',
        city: '',
        pastorId: '',
        liderDoceId: '',
        liderCelulaId: ''
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = useCallback(async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData };

            if (payload.pastorId) payload.pastorId = parseInt(payload.pastorId);
            else delete payload.pastorId;

            if (payload.liderDoceId) payload.liderDoceId = parseInt(payload.liderDoceId);
            else delete payload.liderDoceId;

            if (payload.liderCelulaId) payload.liderCelulaId = parseInt(payload.liderCelulaId);
            else delete payload.liderCelulaId;

            Object.keys(payload).forEach(key => payload[key] === '' && delete payload[key]);

            await api.post('/users', payload);
            setSuccess('Usuario creado exitosamente');
            setShowCreateForm(false);
            setFormData({
                fullName: '', email: '', password: '', role: 'DISCIPULO',
                sex: 'HOMBRE', phone: '', address: '', city: '',
                pastorId: '', liderDoceId: '', liderCelulaId: ''
            });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear usuario');
        } finally {
            setSubmitting(false);
        }
    }, [fetchUsers, formData]);

    const handleUpdateUser = useCallback(async (userId) => {
        if (!editingUser) return;
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                fullName: editingUser.fullName,
                email: editingUser.email,
                role: editingUser.role,
                sex: editingUser.sex,
                phone: editingUser.phone,
                address: editingUser.address,
                city: editingUser.city,
                pastorId: editingUser.pastorId ? parseInt(editingUser.pastorId) : null,
                liderDoceId: editingUser.liderDoceId ? parseInt(editingUser.liderDoceId) : null,
                liderCelulaId: editingUser.liderCelulaId ? parseInt(editingUser.liderCelulaId) : null
            };
            await api.put(`/users/${userId}`, payload);
            setSuccess('Usuario actualizado');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar');
        } finally {
            setSubmitting(false);
        }
    }, [editingUser, fetchUsers]);

    const handleDeleteUser = useCallback(async (userId) => {
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await api.delete(`/users/${userId}`);
            setSuccess('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar');
        }
    }, [fetchUsers]);

    const pastores = useMemo(() => users.filter(u => u.roles?.includes('PASTOR')), [users]);
    const lideresDoce = useMemo(() => users.filter(u => u.roles?.includes('LIDER_DOCE')), [users]);
    const lideresCelula = useMemo(() => users.filter(u => u.roles?.includes('LIDER_CELULA')), [users]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === '' || u.roles?.includes(roleFilter);
            const matchesSex = sexFilter === '' || u.sex === sexFilter;
            const matchesLiderDoce = liderDoceFilter === '' || u.liderDoceId === parseInt(liderDoceFilter);
            return matchesSearch && matchesRole && matchesSex && matchesLiderDoce;
        });
    }, [liderDoceFilter, roleFilter, searchTerm, sexFilter, users]);

    const getAssignableRoles = useCallback(() => {
        if (!currentUser || !currentUser.roles) return [];
        if (currentUser.roles.includes('ADMIN')) return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'ADMIN'];
        if (currentUser.roles.includes('PASTOR')) return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'];
        return ['DISCIPULO', 'LIDER_CELULA'];
    }, [currentUser]);

    return {
        users,
        loading,
        error,
        success,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        sexFilter,
        setSexFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        editingUser,
        setEditingUser,
        showCreateForm,
        setShowCreateForm,
        submitting,
        currentUser,
        formData,
        setFormData,
        pastores,
        lideresDoce,
        lideresCelula,
        filteredUsers,
        fetchUsers,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        getAssignableRoles,
    };
};

export default useUserManagement;
