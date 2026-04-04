// --- modals/MemberModal.jsx ---
import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Loader2, Star } from 'lucide-react';

export default function MemberModal({ memberModal, setMemberModal, teams, roles, handleSaveMember }) {
  const [formData, setFormData] = useState({
    name: '',
    cityId: '',
    discordId: '',
    teamId: '',
    roleId: '',
    status: 'active',
    isMentor: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (memberModal?.isOpen) {
      if (memberModal.data) {
        setFormData({ ...memberModal.data });
      } else {
        setFormData({ 
          name: '', 
          cityId: '',
          discordId: '', 
          teamId: memberModal.teamId || '', 
          roleId: '', 
          status: 'active',
          isMentor: false
        });
      }
    }
  }, [memberModal]);

  if (!memberModal?.isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await handleSaveMember(e, formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {memberModal.data ? 'Manage Personnel' : 'Add Personnel'}
          </h3>
          <button onClick={() => setMemberModal({ isOpen: false, data: null, teamId: null })} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">City Name</label>
              <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">City ID</label>
              <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" value={formData.cityId} onChange={e => setFormData({...formData, cityId: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Discord ID</label>
            <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" value={formData.discordId} onChange={e => setFormData({...formData, discordId: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 flex items-center space-x-1 mb-1">
                <Users size={12} /> <span>Assigned Team</span>
              </label>
              <select required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white appearance-none" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>
                <option value="" disabled>Select...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 flex items-center space-x-1 mb-1">
                <Shield size={12} /> <span>Rank (Promote)</span>
              </label>
              <select required className="w-full p-4 bg-blue-600 text-white rounded-2xl outline-none font-bold appearance-none shadow-md" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}>
                <option value="" disabled>Select Rank...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 cursor-pointer mt-2">
            <input type="checkbox" checked={formData.isMentor} onChange={e => setFormData({...formData, isMentor: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
            <span className="font-black dark:text-white flex items-center space-x-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/><span>Designate as Mentor</span></span>
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg mt-6 disabled:opacity-50">
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Saving...</span></> : <span>{memberModal.data ? 'Confirm Edits' : 'Add Member'}</span>}
          </button>
        </form>
      </div>
    </div>
  );
}