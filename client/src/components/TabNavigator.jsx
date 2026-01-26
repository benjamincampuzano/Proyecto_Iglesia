import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * TabNavigator - Unified tab system for module pages
 * Replaces manual tab logic in Ganar, Consolidar, Discipular, Enviar
 */
const TabNavigator = ({ tabs, initialTabId = null, className = '', onTabChange = null }) => {
  const { hasAnyRole } = useAuth();
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  // Filter tabs based on user roles
  const allowedTabs = tabs.filter(tab => {
    if (!tab.roles || tab.roles.length === 0) return true;
    return hasAnyRole(tab.roles);
  });

  // Set initial tab if not provided or if current tab is not allowed
  useEffect(() => {
    if (!activeTabId || !allowedTabs.find(tab => tab.id === activeTabId)) {
      setActiveTabId(allowedTabs[0]?.id || null);
    }
  }, [activeTabId, allowedTabs]);

  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const activeTab = allowedTabs.find(tab => tab.id === activeTabId);
  const ActiveComponent = activeTab?.component;

  if (!ActiveComponent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No tienes acceso a ninguna pestaña en este módulo.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {allowedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTabId === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
              aria-current={activeTabId === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default TabNavigator;
