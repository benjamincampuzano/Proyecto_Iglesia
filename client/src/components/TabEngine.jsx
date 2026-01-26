import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TabEngine = ({
    tabs = [],
    initialTabId,
    activeTab,
    onActiveTabChange,
}) => {
    const { hasAnyRole, hasRole } = useAuth();

    const allowedTabs = useMemo(() => {
        return (tabs || []).filter(tab => {
            if (typeof hasRole === 'function' && hasRole('ADMIN')) return true;
            if (!tab.roles || tab.roles.length === 0) return true;
            if (typeof hasAnyRole === 'function') return hasAnyRole(tab.roles);
            if (typeof hasRole === 'function') return tab.roles.some(role => hasRole(role));
            return false;
        });
    }, [tabs, hasAnyRole, hasRole]);

    const isControlled = activeTab !== undefined;

    const [internalActiveTab, setInternalActiveTab] = useState(() => {
        if (isControlled) return undefined;
        return initialTabId;
    });

    const currentTab = isControlled ? activeTab : internalActiveTab;

    const setActive = useCallback((tabId) => {
        if (isControlled) {
            onActiveTabChange?.(tabId);
        } else {
            setInternalActiveTab(tabId);
            onActiveTabChange?.(tabId);
        }
    }, [isControlled, onActiveTabChange]);

    const fallbackTabId = useMemo(() => {
        if (allowedTabs.length === 0) return undefined;
        if (initialTabId && allowedTabs.some(t => t.id === initialTabId)) return initialTabId;
        return allowedTabs[0].id;
    }, [allowedTabs, initialTabId]);

    const resolvedTabId = useMemo(() => {
        if (!fallbackTabId) return undefined;
        if (currentTab && allowedTabs.some(t => t.id === currentTab)) return currentTab;
        return fallbackTabId;
    }, [allowedTabs, currentTab, fallbackTabId]);

    useEffect(() => {
        if (!resolvedTabId) return;
        if (currentTab !== resolvedTabId) {
            setActive(resolvedTabId);
        }
    }, [currentTab, resolvedTabId, setActive]);

    const ActiveComponent = useMemo(() => {
        return allowedTabs.find(t => t.id === resolvedTabId)?.component;
    }, [allowedTabs, resolvedTabId]);

    if (allowedTabs.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {allowedTabs.map((tab) => {
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActive(tab.id)}
                                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${resolvedTabId === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                {Icon && (
                                    <Icon
                                        size={18}
                                        className={`mr-2 ${resolvedTabId === tab.id
                                            ? 'text-blue-500 dark:text-blue-400'
                                            : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                                            }`}
                                    />
                                )}
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-6">
                {ActiveComponent && <ActiveComponent />}
            </div>
        </div>
    );
};

export default TabEngine;
