import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function MemberModal({ memberModal, setMemberModal, teams, roles, handleSaveMember, currentUser }) {
  if (!memberModal.isOpen) return null;
  const isEditing = !!memberModal.data;
  const teamId = memberModal.teamId || memberModal.data?.teamId;
  const team = teams.find(t => t.id === teamId);
  
  const [formData, setFormData] = useState(memberModal.data || {
    name: '', discordId: '', teamId: teamId, roleId: '', isMentor: false, password: 'password', status: 'active', darkMode: false, isSystemAdmin: false
  });

  const availableRoles = roles.filter(r => 
    r.scope === 'ALL' || (r.scope === 'TEAM' && r.teamIds.includes(formData.teamId)) || (r.scope === 'MANAGEMENT' && r.teamIds.includes(formData.teamId))
  ).sort((a, b) => a.level - b.level);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveMember(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center" style={{ borderTop: `4px solid ${team?.color || '#3b82f6'}` }}>
          <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Member' : 'Add Member'}</h3>
          <button onClick={() => setMemberModal({ isOpen: false })} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required type="text" className="w-full p-2.5 border border-gray-200 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discord ID</label>
            <input required type="text" className="w-full p-2.5 border border-gray-200 rounded-lg" value={formData.discordId} onChange={e => setFormData({...formData, discordId: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select required className="w-full p-2.5 border border-gray-200 rounded-lg" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value, roleId: ''})}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select required className="w-full p-2.5 border border-gray-200 rounded-lg" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}>
              <option value="" disabled>Select a role...</option>
              {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input type="checkbox" className="w-4 h-4 text-amber-500 rounded" checked={formData.isMentor} onChange={e => setFormData({...formData, isMentor: e.target.checked})} />
            <label className="text-sm font-medium text-gray-700">Assign Mentor Badge</label>
          </div>
          
          {currentUser?.id === 'superadmin' && (
            <div className="flex items-center space-x-2 pt-3 mt-3 border-t border-gray-100">
              <input type="checkbox" className="w-4 h-4 text-red-600 rounded" checked={formData.isSystemAdmin} onChange={e => setFormData({...formData, isSystemAdmin: e.target.checked})} />
              <label className="text-sm font-bold text-red-600">Delegate System Admin Privileges</label>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setMemberModal({ isOpen: false })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-white rounded-lg" style={{ backgroundColor: team?.color || '#3b82f6' }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}