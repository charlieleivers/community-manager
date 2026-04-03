import React from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';

export default function RoleManagement({ roles, setRoleModal }) {
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the ${name} role?`)) {
      await deleteDoc(doc(db, 'artifacts', 'community-manager', 'public', 'data', 'roles', id));
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Role Hierarchy</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Define access levels and global scopes.</p>
        </div>
        <button 
          onClick={() => setRoleModal({ isOpen: true, data: null })}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg transition-all"
        >
          <Plus size={20} /> <span>Create Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-3xl"></div>
            <div className="flex justify-between items-start ml-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Shield size={18} className="text-blue-500" />
                  <span>{role.name}</span>
                </h3>
                <span className="inline-block mt-3 text-[10px] font-black tracking-widest uppercase bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded-lg">
                  Scope: {role.scope}
                </span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {role.customPerms?.map(perm => (
                    <span key={perm} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md font-medium border border-blue-100 dark:border-blue-800/50">
                      {perm.replace('_', ' ')}
                    </span>
                  ))}
                  {(!role.customPerms || role.customPerms.length === 0) && <span className="text-xs text-gray-400 dark:text-slate-500">No specific permissions</span>}
                </div>
              </div>
              <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setRoleModal({ isOpen: true, data: role })} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-slate-800 rounded-xl transition-all">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(role.id, role.name)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-50 dark:bg-slate-800 rounded-xl transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}