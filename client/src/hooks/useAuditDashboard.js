import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const useAuditDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, pages: 1 });
    const [filters, setFilters] = useState({
        page: 1,
        action: '',
        entityType: '',
        startDate: '',
        endDate: ''
    });

    const queryString = useMemo(() => {
        const params = new URLSearchParams(filters);
        return params.toString();
    }, [filters]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/audit/logs?${queryString}`);
            const data = response.data;
            if (data.logs) {
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }, [queryString]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/audit/stats?days=30');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    }, []);

    const memoizedStats = useMemo(() => {
        if (!stats) return null;
        return {
            ...stats,
            loginsPerDay: stats.loginsPerDay || [],
            actionDistribution: stats.actionDistribution || []
        };
    }, [stats]);

    return {
        logs,
        stats: memoizedStats,
        loading,
        pagination,
        filters,
        setFilters,
        handleFilterChange,
    };
};

export default useAuditDashboard;
