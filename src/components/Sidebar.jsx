import React from 'react';
import { LayoutDashboard, Settings, Shield, Key, Lock, LogOut, Sun, Moon, Sliders } from 'lucide-react';

export default function Sidebar({ 
  activeTab, setActiveTab, teams, members, currentUser, currentUserRole, isGlobalAdmin, isSysAdmin, handleLogout, toggleDarkMode 
}) {
  return (
    <div className="w-72 bg-white border-r border-gray-100 flex flex-col z-10 shadow-sm relative">
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
          <LayoutDashboard size={24} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-gray-800">CommUnity</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Main Menu</p>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('teams-setup')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'teams-setup' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Settings size={20} /> <span>Manage Teams</span>
          </button>
          <button onClick={() => setActiveTab('roles')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'roles' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Shield size={20} /> <span>Role Hierarchy</span>
          </button>
          {isGlobalAdmin && (
            <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'requests' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Key size={20} /> <span>Access Requests</span>
              {members.filter(m => m.status === 'pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {members.filter(m => m.status === 'pending').length}
                </span>
              )}
            </button>
          )}
          {isSysAdmin && (
            <button onClick={() => setActiveTab('permissions')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all mt-2 border border-transparent ${activeTab === 'permissions' ? 'bg-red-50 text-red-700 border-red-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Sliders size={20} className={activeTab === 'permissions' ? 'text-red-500' : ''} /> <span>Permissions</span>
            </button>
          )}
        </div>

        <div className="px-4 mt-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2 flex justify-between items-center">
            <span>Your Teams</span>
          </p>
          <div className="space-y-1">
            {teams.map(team => (
              <button key={team.id} onClick={() => setActiveTab(team.id)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-all group`} style={activeTab === team.id ? { backgroundColor: `${team.color}15`, color: team.color } : { color: '#4b5563' }}>
                <div className={`w-2.5 h-2.5 rounded-full transition-transform ${activeTab === team.id ? 'scale-125' : 'group-hover:scale-125'}`} style={{ backgroundColor: team.color }}></div>
                <span className="truncate flex-1 text-left">{team.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex flex-col truncate pr-2">
          <span className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</span>
          <span className="text-xs text-gray-500 font-medium truncate">{currentUserRole?.name || 'No Role'}</span>
        </div>
        <div className="flex space-x-1">
          <button onClick={toggleDarkMode} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            {currentUser.darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}