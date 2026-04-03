import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function AccessRequests({ members, handleApprove, handleDeny }) {
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Pending Requests</h2>
        <p className="text-gray-500 mt-1 font-medium">Review and approve access for new personnel.</p>
      </div>

      <div className="grid gap-4 mt-8">
        {pendingMembers.map(req => (
          <div key={req.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-sm transition-colors">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-xl">
                {req.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-lg dark:text-white">{req.name}</h4>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{req.discordId}</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => handleApprove(req.id, 'r_member')}
                className="flex items-center space-x-2 px-5 py-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-xl font-bold transition-all"
              >
                <CheckCircle2 size={20} />
                <span>Approve</span>
              </button>
              <button 
                onClick={() => handleDeny(req.id)}
                className="flex items-center space-x-2 px-5 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-xl font-bold transition-all"
              >
                <XCircle size={20} />
                <span>Deny</span>
              </button>
            </div>
          </div>
        ))}

        {pendingMembers.length === 0 && (
          <div className="p-16 text-center text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-slate-800">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">All caught up!</h3>
            <p className="text-sm mt-2">There are no pending access requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}