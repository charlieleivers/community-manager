import React from 'react';
import { CheckCircle2, XCircle, Users, Shield, MapPin, Hash } from 'lucide-react';

export default function AccessRequests({ members, teams, roles, handleApprove, handleDeny }) {
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Access Requests</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium">Review city personnel applications.</p>
      </div>

      <div className="grid gap-4 mt-8">
        {pendingMembers.map(req => {
          const requestedTeam = teams.find(t => t.id === req.teamId)?.name || 'Unknown Team';
          const requestedRole = roles.find(r => r.id === req.requestedRoleId)?.name || 'Unknown Role';

          return (
            <div key={req.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg shadow-blue-900/20">
                  <span className="text-xs opacity-70 uppercase">City</span>
                  <span className="text-xl">{req.cityId || '??'}</span>
                </div>
                <div>
                  <h4 className="font-bold text-xl dark:text-white leading-tight">{req.name} <span className="text-slate-400 font-medium text-sm ml-2">({req.discordId})</span></h4>
                  
                  <div className="flex items-center space-y-0 space-x-3 mt-3">
                    <span className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      <Users size={12} /> <span>{requestedTeam}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                      <Shield size={12} /> <span>{requestedRole}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 shrink-0">
                <button 
                  onClick={() => handleApprove(req.id, req.teamId, req.requestedRoleId)}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
                >
                  <CheckCircle2 size={18} />
                  <span>Approve</span>
                </button>
                <button 
                  onClick={() => handleDeny(req.id)}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl font-bold transition-all"
                >
                  <XCircle size={18} />
                  <span>Deny</span>
                </button>
              </div>
            </div>
          )
        })}

        {pendingMembers.length === 0 && (
          <div className="p-16 text-center text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-slate-800">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50 text-blue-500" />
            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">Queue is Empty</h3>
            <p className="text-sm mt-2">No new city residents are awaiting management access.</p>
          </div>
        )}
      </div>
    </div>
  );
}