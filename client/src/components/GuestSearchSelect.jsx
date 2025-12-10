import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import axios from 'axios';

const GuestSearchSelect = ({ value, onChange, label, placeholder = "Buscar invitado..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchGuests();
        }
    }, [isOpen, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const fetchGuests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/guests', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Client-side filtering for simplicity, or backend search if available
            let filtered = res.data.guests || [];
            if (searchTerm) {
                filtered = filtered.filter(g =>
                    g.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            setGuests(filtered);
        } catch (error) {
            console.error('Error fetching guests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (guest) => {
        setSelectedGuest(guest);
        onChange(guest.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = () => {
        setSelectedGuest(null);
        onChange(null);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
            >
                {selectedGuest ? (
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <p className="text-sm font-medium">{selectedGuest.name}</p>
                            <p className="text-xs text-gray-400">{selectedGuest.phone}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="text-gray-400 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

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
                        ) : guests.length === 0 ? (
                            <div className="p-4 text-center text-gray-400">No se encontraron invitados</div>
                        ) : (
                            guests.map((guest) => (
                                <div
                                    key={guest.id}
                                    onClick={() => handleSelect(guest)}
                                    className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                                >
                                    <p className="text-sm font-medium text-white">{guest.name}</p>
                                    <p className="text-xs text-gray-400">{guest.status}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestSearchSelect;
