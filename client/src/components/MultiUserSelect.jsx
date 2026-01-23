import { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import api from '../utils/api';

const MultiUserSelect = ({ value = [], onChange, label, placeholder = "Seleccionar usuarios...", roleFilter }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen, searchTerm, roleFilter]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Load selected users details when value changes
    useEffect(() => {
        if (value && value.length > 0) {
            fetchSelectedUsers(value);
        } else {
            setSelectedUsers([]);
        }
    }, [value]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (roleFilter) {
                params.append('role', roleFilter);
            }

            const url = `/users${params.toString() ? '?' + params.toString() : ''}`;
            const res = await api.get(url);

            let filteredUsers = res.data;
            if (searchTerm) {
                filteredUsers = filteredUsers.filter(user =>
                    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Filter out already selected users
            filteredUsers = filteredUsers.filter(user => !value.includes(user.id));

            setUsers(filteredUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSelectedUsers = async (userIds) => {
        try {
            const res = await api.get('/users');

            const selected = res.data.filter(user => userIds.includes(user.id));
            setSelectedUsers(selected);
        } catch (error) {
            console.error('Error fetching selected users:', error);
        }
    };

    const handleSelect = (user) => {
        const newValue = [...value, user.id];
        onChange(newValue);
        setSearchTerm('');
    };

    const handleRemove = (userId) => {
        const newValue = value.filter(id => id !== userId);
        onChange(newValue);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map(user => (
                        <div
                            key={user.id}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
                        >
                            <span>{user.fullName}</span>
                            <button
                                onClick={() => handleRemove(user.id)}
                                className="hover:bg-blue-700 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input/Dropdown Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
            >
                <span className="text-gray-400">{placeholder}</span>
                <UserPlus size={20} className="text-gray-400" />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-400">Cargando...</div>
                        ) : users.length === 0 ? (
                            <div className="p-4 text-center text-gray-400">No se encontraron usuarios</div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelect(user)}
                                    className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                                >
                                    <p className="text-sm font-medium text-white">{user.fullName}</p>
                                    <p className="text-xs text-gray-400">{user.email}</p>
                                    <p className="text-xs text-blue-400 mt-1">
                                        {Array.isArray(user.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiUserSelect;
