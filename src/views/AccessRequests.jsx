import React from 'react';
import { UserCheck, X, AlertCircle } from 'lucide-react';

export default function AccessRequests({ members, handleApprove, handleDeny }) {
  const pending = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">Pending Requests</h2>
      
      {pending.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
          <UserCheck size={48} className="mx-auto mb-4 opacity-20" />
          <p>All clear! No pending access requests at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold text-xl">
                  {req.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{req.name}</h3>
                  <p className="text-sm text-gray-500">{req.discordId}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => handleDeny(req.id)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors">Deny</button>
                <button onClick={() => handleApprove(req.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-100">Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}