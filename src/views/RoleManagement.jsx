import React from 'react';
import { Shield, Plus, ChevronUp, ChevronDown } from 'lucide-react';

export default function RoleManagement({ roles, setRoles, setRoleModal }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Role Hierarchy</h2>
          <p className="text-gray-500 mt-1">Configure permissions and authority levels across the system.</p>
        </div>
        <button 
          onClick={() => setRoleModal({ isOpen: true })}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-200"
        >
          <Plus size={20} /> <span>New Role</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Level</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role Name</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Scope</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4"><span className="font-mono font-bold text-gray-400">#{role.level}</span></td>
                <td className="p-4 flex items-center space-x-3">
                  <Shield size={18} className="text-purple-500" />
                  <span className="font-bold text-gray-800">{role.name}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    role.scope === 'MANAGEMENT' ? 'bg-red-100 text-red-700' : 
                    role.scope === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {role.scope}
                  </span>
                </td>
                <td className="p-4">
                   <div className="flex space-x-2">
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-200"><ChevronUp size={16} /></button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-200"><ChevronDown size={16} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}