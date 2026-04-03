import React, { useState } from 'react';
import { Key, Shield, User, Check } from 'lucide-react';

export default function PermissionsManager({ roles, members, isSysAdmin, togglePermission, availablePermissions }) {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  // Switch between managing Roles or specific Members
  const listItems = activeTab === 'roles' ? roles : members.filter(m => m.status === 'active');
  const selectedTarget = listItems.find(item => item.id === selectedTargetId) || listItems[0];

  if (!isSysAdmin) {
    return (
      <div className="p-12 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
        <h3 className="text-xl font-bold text-red-600 dark:text-red-400">System Admin Access Required</h3>
        <p className="text-red-500/80 mt-2">You do not have clearance to modify core system permissions.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Permissions</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Control system access levels and overrides.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Selection List */}
        <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="flex border-b border-gray-100 dark:border-slate-800">
            <button 
              onClick={() => { setActiveTab('roles'); setSelectedTargetId(null); }}
              className={`flex-1 flex items-center justify-center space-x-2 p-4 font-bold transition-colors ${activeTab === 'roles' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <Shield size={18} /> <span>Roles</span>
            </button>
            <button 
              onClick={() => { setActiveTab('members'); setSelectedTargetId(null); }}
              className={`flex-1 flex items-center justify-center space-x-2 p-4 font-bold transition-colors ${activeTab === 'members' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <User size={18} /> <span>Overrides</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {listItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedTargetId(item.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedTarget?.id === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700'}`}
              >
                <span className="font-bold truncate">{item.name}</span>
                {item.customPerms?.length > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-md font-bold ${selectedTarget?.id === item.id ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                    {item.customPerms.length}
                  </span>
                )}
              </button>
            ))}
            {listItems.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-8">No {activeTab} found.</p>
            )}
          </div>
        </div>

        {/* Right Column: Permission Toggles */}
        <div className="w-full lg:w-2/3 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 lg:p-8 flex flex-col h-[600px]">
          {selectedTarget ? (
            <>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center space-x-3">
                  <Key size={24} className="text-blue-500" />
                  <span>{selectedTarget.name}</span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  {activeTab === 'roles' ? 'These permissions apply to everyone with this role.' : 'These are specific user overrides that stack on top of their role permissions.'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {availablePermissions.map(perm => {
                  const hasPerm = selectedTarget.customPerms?.includes(perm.id);
                  return (
                    <div 
                      key={perm.id} 
                      onClick={() => togglePermission(selectedTarget.id, perm.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all group ${hasPerm ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'}`}
                    >
                      <div>
                        <h4 className={`font-bold ${hasPerm ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'}`}>{perm.label}</h4>
                        <p className={`text-xs mt-1 font-mono ${hasPerm ? 'text-blue-500/70 dark:text-blue-400/70' : 'text-gray-400 dark:text-slate-500'}`}>{perm.id}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${hasPerm ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 dark:bg-slate-700 text-transparent group-hover:bg-gray-300 dark:group-hover:bg-slate-600'}`}>
                        <Check size={14} strokeWidth={4} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
              <Key size={48} className="mb-4 opacity-50" />
              <p className="font-bold">Select a target to configure permissions.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}