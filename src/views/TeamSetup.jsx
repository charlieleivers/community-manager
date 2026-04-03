import React from 'react';
import { Plus, Scissors, Merge, Trash2, Edit } from 'lucide-react';

export default function TeamSetup({ teams, setTeams, setTeamModal }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Team Architecture</h2>
          <p className="text-gray-500 mt-1">Define the structure and hierarchy of your community groups.</p>
        </div>
        <button 
          onClick={() => setTeamModal({ isOpen: true })}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
        >
          <Plus size={20} /> <span>Create Team</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-12 rounded-full" style={{ backgroundColor: team.color }}></div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{team.name}</h3>
                <div className="flex space-x-2 mt-1">
                  {team.isMgmt && <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded uppercase font-bold">Management</span>}
                </div>
              </div>
            </div>
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
              <button className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Scissors size={18} /></button>
              <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Merge size={18} /></button>
              <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}