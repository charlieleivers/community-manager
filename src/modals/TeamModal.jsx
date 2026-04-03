import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';

export default function TeamModal({ teamModal, setTeamModal }) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teamModal?.isOpen && teamModal?.data) {
      setFormData({
        name: teamModal.data.name || '',
        description: teamModal.data.description || ''
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [teamModal]);

  if (!teamModal?.isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    console.log("--- TEAM MODAL SAVE INITIATED ---");
    console.log("1. Form Data Captured:", formData);
    setIsSubmitting(true);
    
    try {
      if (!db) throw new Error("CRITICAL: 'db' is undefined. Check firebase-config.js import.");

      const id = teamModal.data?.id || `t${Date.now()}`;
      console.log("2. Generated ID:", id);
      
      const docRef = doc(db, 'artifacts', 'community-manager', 'public', 'data', 'teams', id);
      console.log("3. Created Doc Reference:", docRef.path);
      
      console.log("4. Awaiting Firebase setDoc...");
      await setDoc(docRef, { ...formData, id }, { merge: true });
      console.log("5. Firebase SUCCESS! Closing Modal.");
      
      setTeamModal({ isOpen: false, data: null });
      setFormData({ name: '', description: '' }); 
    } catch (error) {
      console.error("TEAM MODAL CRASH:", error.message);
      alert(`FAILED:\n${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {teamModal.data ? 'Edit Team' : 'Create New Team'}
          </h3>
          <button onClick={() => setTeamModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Team Name</label>
            <input 
              required 
              autoFocus
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g., Development, Marketing" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Description</label>
            <textarea 
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white mt-1 focus:ring-2 focus:ring-blue-500 resize-none h-24" 
              placeholder="What does this team do?" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none mt-4 disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Saving...</span></> : <span>Save Team</span>}
          </button>
        </form>
      </div>
    </div>
  );
}