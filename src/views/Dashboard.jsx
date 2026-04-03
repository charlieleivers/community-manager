import React from 'react';
import { Users, Shield, Star, MoveRight } from 'lucide-react';

// Notice we accept "teams", "members", and "setActiveTab" inside the brackets!
export default function Dashboard({ teams, members, setActiveTab }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800">Community Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Members</p>
            <p className="text-3xl font-bold text-gray-800">{members.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><Shield size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Teams</p>
            <p className="text-3xl font-bold text-gray-800">{teams.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-xl"><Star size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Mentors</p>
            <p className="text-3xl font-bold text-gray-800">{members.filter(m => m.isMentor).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Team Summaries</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {teams.map(team => {
            const teamMembers = members.filter(m => m.teamId === team.id);
            return (
              <div key={team.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                  <span className="font-semibold text-gray-800 text-lg">{team.name}</span>
                  {team.isMgmt && <span className="px-2 py-1 text-xs bg-gray-800 text-white rounded-md font-medium">MGMT</span>}
                </div>
                <div className="flex items-center space-x-6 text-gray-500">
                  <span>{teamMembers.length} Members</span>
                  <button 
                    onClick={() => setActiveTab(team.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1"
                  >
                    <span>View Team</span> <MoveRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );// PASTE EVERYTHING FROM <div className="space-y-6 animate-fade-in"> DOWN TO THE END OF THE DASHBOARD HERE
}