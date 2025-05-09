import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAlerts } from '../redux/slices/alertsSlice';
import { 
  FaChartPie, 
  FaNetworkWired, 
  FaList, 
  FaBell, 
  FaAngleLeft, 
  FaAngleRight,
  FaGlobe
} from 'react-icons/fa';

const Navbar = () => {
  const location = useLocation();
  const alerts = useSelector(selectAlerts); // ✅ Correct: no { alerts }, just alerts directly
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FaChartPie /> },
    { path: '/network', label: 'Network Map', icon: <FaNetworkWired /> },
    { path: '/logs', label: 'Log Monitor', icon: <FaList /> },
    { path: '/alerts', label: 'Alerts', icon: <FaBell />, badge: alerts.length },
    { 
      path: '/geo-map', 
      label: 'Geo Map', 
      icon: <FaGlobe /> 
    }, // Assuming you have a globe icon imported
  ];

  return (
    <nav className={`bg-gray-800 text-white ${collapsed ? 'w-16' : 'w-64'} flex flex-col h-full transition-all duration-300 relative`}>
      {/* Top Bar */}
      <div className={`p-4 border-b border-gray-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h1 className="text-xl font-bold">Network Flow</h1>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="text-gray-400 hover:text-white focus:outline-none"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <FaAngleRight size={20} /> : <FaAngleLeft size={20} />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-auto">
        <ul className="py-4">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const hasBadge = item.badge && item.badge > 0;
            return (
              <li key={item.path} className="mb-2 px-2">
                <Link
                  to={item.path}
                  className={`flex items-center p-3 ${isActive ? 'bg-indigo-600' : 'hover:bg-gray-700'} rounded-lg transition-colors duration-200 relative`}
                  title={collapsed ? item.label : ''}
                >
                  <div className={`flex items-center justify-center ${collapsed ? 'w-full' : 'w-6'}`}>
                    {React.cloneElement(item.icon, { size: collapsed ? 20 : 16 })}
                  </div>
                  {!collapsed && <span className="ml-3">{item.label}</span>}

                  {hasBadge && (
                    collapsed ? (
                      <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Copyright */}
      <div className={`p-4 border-t border-gray-700 text-sm ${collapsed ? 'text-center' : ''}`}>
        {collapsed ? "©" : `© ${new Date().getFullYear()} Network Monitor`}
      </div>
    </nav>
  );
};

export default Navbar;
