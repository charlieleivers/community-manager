import React from 'react';
import { LayoutDashboard, Users, Shield, UserCheck, Key, LogOut, Sun, Moon } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, teams, members, currentUser, currentUserRole, isGlobalAdmin, isSysAdmin, handleLogout, toggleDarkMode }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teams-setup', label: 'Manage Teams', icon: Users, adminOnly: true },
    { id: 'roles', label: 'Role Hierarchy', icon: Shield, adminOnly: true },
    { id: 'requests', label: 'Access Requests', icon: UserCheck, adminOnly: true },
    { id: 'permissions', label: 'Permissions', icon: Key, adminOnly: true },
  ];

  return (
    <div className="w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-colors z-10">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg dark:shadow-none">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">CommUnity</h1>
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => {
            if (item.adminOnly && !isSysAdmin && !isGlobalAdmin) return null;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-8">
          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-2 block">My Teams</label>
          <div className="space-y-1">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setActiveTab(team.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === team.id 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-blue-400 opacity-80" />
                <span className="truncate">{team.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <button 
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
        >
          <span className="text-sm font-bold">{currentUser.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          {currentUser.darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="flex items-center space-x-3 px-4 py-2">
          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-gray-900 dark:text-white">
            {currentUser.name?.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{currentUser.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono truncate">{currentUser.discordId}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}