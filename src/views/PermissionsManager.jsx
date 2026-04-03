import React, { useState } from 'react';
import { Sliders, Lock, Check } from 'lucide-react';

export default function PermissionsManager({ roles, members, isSysAdmin, togglePermission, availablePermissions }) {
  const [targetId, setTargetId] = useState('');
  
  if (!isSysAdmin) return (
    <div className="p-12 text-center text-gray-400">
      <Lock size={48} className="mx-auto mb-4 opacity-20" />
      <p>System Admin Required to manage granular overrides.</p>
    </div>
  );

  const target = roles.find(r => r.id === targetId) || members.find(m => m.id === targetId);
  const perms = target?.customPerms || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <Sliders className="mr-3 text-red-500" /> Advanced Overrides
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
           <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Select Target</label>
           <select 
             className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
             value={targetId} 
             onChange={e => setTargetId(e.target.value)}
           >
             <option value="">Select Role/User...</option>
             <optgroup label="Global Roles">
               {roles.map(r => <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>)}
             </optgroup>
             <optgroup label="Active Users">
               {members.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
             </optgroup>
           </select>
           <p className="mt-4 text-xs text-gray-400 leading-relaxed italic">
             Note: Permissions assigned to roles apply to all members of that role. Individual user assignments act as overrides.
           </p>
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          {target ? (
            <div className="space-y-3">
              <div className="mb-6">
                <h3 className="font-bold text-gray-800">Adjusting: <span className="text-blue-600">{target.name}</span></h3>
              </div>
              
              <div className="grid gap-2">
                {availablePermissions.map(p => (
                  <div 
                    key={p.id} 
                    className={`flex justify-between items-center p-4 rounded-xl border transition-all ${
                      perms.includes(p.id) ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${perms.includes(p.id) ? 'text-red-700' : 'text-gray-700'}`}>{p.label}</span>
                      <span className="text-[10px] font-mono text-gray-400 mt-0.5">{p.id}</span>
                    </div>
                    <button 
                      onClick={() => togglePermission(targetId, p.id)} 
                      className={`w-12 h-6 rounded-full transition-all relative ${perms.includes(p.id) ? 'bg-red-500 shadow-inner' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${perms.includes(p.id) ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-40">
               <Sliders size={64} className="mb-4" />
               <p className="font-medium">Choose a role or member to manage system-wide permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}