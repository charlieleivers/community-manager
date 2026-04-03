import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';

export default function RoleModal({ roleModal, setRoleModal, availablePermissions = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    scope: 'TEAM', 
    customPerms: []
  });

  if (!roleModal.isOpen) return null;

  const togglePerm = (permId) => {
    setFormData(prev => ({
      ...prev,
      customPerms: prev.customPerms.includes(permId)
        ? prev.customPerms.filter(id => id !== permId)
        : [...prev.customPerms, permId]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const id = roleModal.data?.id || `r${Date.now()}`;
    const docRef = doc(db, 'artifacts', 'community-manager', 'public', 'data', 'roles', id);
    
    await setDoc(docRef, { ...formData, id }, { merge: true });
    setRoleModal({ isOpen: false, data: null });
    setFormData({ name: '', scope: 'TEAM', customPerms: [] });
  };

  return (
    <div className="fixed inset-0 bg-gray-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {roleModal.data ? 'Edit Role' : 'Define New Role'}
          </h3>
          <button onClick={() => setRoleModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Role Title</label>
              <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white mt-1" placeholder="e.g., Moderator" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">System Scope</label>
              <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white mt-1 appearance-none" value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})}>
                <option value="TEAM">Team Level</option>
                <option value="MANAGEMENT">Management Level</option>
                <option value="ALL">Global Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 mb-2 block">Base Permissions</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {availablePermissions.map(perm => (
                <div key={perm.id} onClick={() => togglePerm(perm.id)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${formData.customPerms.includes(perm.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-50 dark:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-700'}`}>
                  <span className={`font-bold text-sm ${formData.customPerms.includes(perm.id) ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{perm.label}</span>
                  {formData.customPerms.includes(perm.id) && <Check size={18} className="text-blue-600 dark:text-blue-400" />}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg">Save Role</button>
        </form>
      </div>
    </div>
  );
}