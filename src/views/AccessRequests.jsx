import React from 'react';
import { CheckCircle2, XCircle, Users, Shield, MapPin, Hash, ExternalLink } from 'lucide-react';

export default function AccessRequests({ members, teams, roles, handleApprove, handleDeny }) {
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Access Requests</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Review and verify city personnel applications.</p>
      </div>

      <div className="grid gap-6 mt-8">
        {pendingMembers.map(req => {
          const requestedTeam = teams.find(t => t.id === req.teamId)?.name || 'Unknown Team';
          const requestedRole = roles.find(r => r.id === req.requestedRoleId)?.name || 'Unknown Role';

          return (
            <div key={req.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              
              <div className="flex items-center space-x-6 w-full">
                {/* CITY ID BADGE */}
                <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex flex-col items-center justify-center font-black shrink-0 shadow-xl shadow-blue-900/20">
                  <span className="text-[10px] opacity-70 uppercase tracking-widest">City</span>
                  <span className="text-2xl">{req.cityId || '??'}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">{req.name}</h4>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                      Pending Approval
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-slate-700">
                      <Users size={14} className="text-blue-500" />
                      <span>{requestedTeam}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-slate-700">
                      <Shield size={14} className="text-blue-500" />
                      <span>{requestedRole}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-mono font-black text-[#5865F2] bg-[#5865F2]/5 px-3 py-2 rounded-xl border border-[#5865F2]/20">
                      <span>Verified Discord ID: {req.discordId}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 shrink-0 mt-8 lg:mt-0 w-full lg:w-auto">
                <button 
                  onClick={() => handleApprove(req.id, req.teamId, req.requestedRoleId)}
                  className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  <CheckCircle2 size={20} />
                  <span>Approve</span>
                </button>
                <button 
                  onClick={() => handleDeny(req.id)}
                  className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-8 py-4 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 dark:hover:text-red-400 rounded-2xl font-black transition-all active:scale-95"
                >
                  <XCircle size={20} />
                  <span>Deny</span>
                </button>
              </div>
            </div>
          )
        })}

        {pendingMembers.length === 0 && (
          <div className="p-24 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 size={40} className="text-blue-500 opacity-50" />
            </div>
            <h3 className="text-2xl font-black text-gray-700 dark:text-gray-200 uppercase tracking-tighter">Everything Cleared</h3>
            <p className="text-slate-400 dark:text-slate-500 font-medium mt-2">No personnel are currently awaiting access.</p>
          </div>
        )}
      </div>
    </div>
  );
}