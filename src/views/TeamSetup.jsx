// --- views/TeamSetup.jsx ---
import React from 'react';
import { Plus, Edit, Trash2, Users, UploadCloud } from 'lucide-react';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase-config.js';

export default function TeamSetup({ teams, setTeamModal }) {
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the ${name} team?`)) {
      await deleteDoc(doc(db, 'artifacts', 'community-manager', 'public', 'data', 'teams', id));
    }
  };

  const handleBulkImport = async () => {
    const input = prompt("Enter team names separated by commas (e.g. Alpha, Bravo, Charlie):");
    if (!input) return;
    
    const names = input.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const id = `t${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
        const ref = doc(db, 'artifacts', 'community-manager', 'public', 'data', 'teams', id);
        batch.set(ref, { id, name, color: '#3b82f6', description: '' }); // Default blue
      });
      await batch.commit();
      alert(`Successfully imported ${names.length} teams.`);
    } catch (error) { 
      console.error("Bulk Import Failed:", error);
      alert("Bulk import failed."); 
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Manage Teams</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Create and structure your community divisions.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleBulkImport}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold transition-all"
          >
            <UploadCloud size={20} /> <span>Bulk Import</span>
          </button>
          <button 
            onClick={() => setTeamModal({ isOpen: true, data: null })}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg transition-all"
          >
            <Plus size={20} /> <span>Create Team</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 flex justify-between items-center shadow-sm group">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800" style={{ color: team.color || '#3b82f6' }}>
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span>{team.name}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#3b82f6' }}></div>
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{team.description || 'No description provided.'}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setTeamModal({ isOpen: true, data: team })} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                <Edit size={20} />
              </button>
              <button onClick={() => handleDelete(team.id, team.name)} className="p-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="text-center p-12 bg-gray-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-slate-800">
             <p className="text-gray-500 dark:text-slate-400 font-bold">No teams exist yet. Create your first division!</p>
          </div>
        )}
      </div>
    </div>
  );
}