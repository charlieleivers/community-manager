import React from 'react';
import { MoveRight } from 'lucide-react';

export default function Dashboard({ teams, members, setActiveTab }) {
  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Overview</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Real-time community health and distribution.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-gray-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Active Personnel</p>
          <h3 className="text-5xl font-black text-gray-900 dark:text-white">{members.filter(m => m.status === 'active').length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-gray-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Live Teams</p>
          <h3 className="text-5xl font-black text-gray-900 dark:text-white">{teams.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-gray-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Pending Requests</p>
          <h3 className="text-5xl font-black text-blue-600 dark:text-blue-400">{members.filter(m => m.status === 'pending').length}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Active Divisions</h3>
        <div className="grid gap-4">
          {teams.map(team => (
            <div 
              key={team.id} 
              className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-transparent dark:border-slate-700/50 transition-all cursor-pointer" 
              onClick={() => setActiveTab(team.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-600 shadow-sm">
                  {team.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">{team.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{members.filter(m => m.teamId === team.id).length} Members</p>
                </div>
              </div>
              <MoveRight className="text-gray-300 dark:text-slate-500" size={20} />
            </div>
          ))}
          {teams.length === 0 && (
             <p className="text-center p-8 text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">No active divisions. Go to Manage Teams to create one.</p>
          )}
        </div>
      </div>
    </div>
  );
}