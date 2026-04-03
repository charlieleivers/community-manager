import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Loader2 } from 'lucide-react';

export default function MemberModal({ memberModal, setMemberModal, teams, roles, handleSaveMember }) {
  const [formData, setFormData] = useState({
    name: '',
    discordId: '',
    teamId: '',
    roleId: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill the form if we are editing (promoting/demoting) an existing member
  useEffect(() => {
    if (memberModal?.isOpen) {
      if (memberModal.data) {
        setFormData({ ...memberModal.data });
      } else {
        // If adding a new member from a specific team page, pre-select that team
        setFormData({ 
          name: '', 
          discordId: '', 
          teamId: memberModal.teamId || '', 
          roleId: '', 
          status: 'active' 
        });
      }
    }
  }, [memberModal]);

  if (!memberModal?.isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // This calls the function we already built in App.jsx which saves to Firebase
    await handleSaveMember(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {memberModal.data ? 'Edit Personnel' : 'Add Personnel'}
          </h3>
          <button onClick={() => setMemberModal({ isOpen: false, data: null, teamId: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Full Name</label>
            <input 
              required 
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g., John Doe" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Discord ID</label>
            <input 
              required 
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g., user#1234" 
              value={formData.discordId} 
              onChange={e => setFormData({...formData, discordId: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center space-x-1 mb-1">
                <Users size={12} /> <span>Assignment</span>
              </label>
              <select 
                required 
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white appearance-none" 
                value={formData.teamId} 
                onChange={e => setFormData({...formData, teamId: e.target.value})}
              >
                <option value="" disabled>Select Team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center space-x-1 mb-1">
                <Shield size={12} /> <span>Rank/Role</span>
              </label>
              <select 
                required 
                className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl outline-none text-blue-700 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800/50 appearance-none" 
                value={formData.roleId} 
                onChange={e => setFormData({...formData, roleId: e.target.value})}
              >
                <option value="" disabled>Select Role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none mt-6 disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Processing...</span></> : <span>{memberModal.data ? 'Update Personnel' : 'Add to Database'}</span>}
          </button>
        </form>
      </div>
    </div>
  );
}