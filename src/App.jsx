import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders, Terminal, Copy
} from 'lucide-react';

import { auth, db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import TeamSetup from './views/TeamSetup';
import RoleManagement from './views/RoleManagement';
import AccessRequests from './views/AccessRequests';
import PermissionsManager from './views/PermissionsManager';
import MemberModal from './modals/MemberModal';
import TeamModal from './modals/TeamModal';
import RoleModal from './modals/RoleModal';

const MASTER_ADMIN_PASSWORD = "admin"; 

export default function App() {
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Updated Auth Flow States
  const [authView, setAuthView] = useState('login'); // 'login', 'request_step1', 'request_step2'
  const [authForm, setAuthForm] = useState({ name: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
  
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

  // Debug State
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  const appId = "community-manager";

  const AVAILABLE_PERMISSIONS = [
    { id: 'EDIT_ASSIGNED_TEAM', label: 'Edit Assigned Team' },
    { id: 'EDIT_ALL_TEAMS', label: 'Edit All Teams' },
    { id: 'CREATE_TEAM', label: 'Create Team' },
    { id: 'DELETE_TEAM', label: 'Delete Team' },
    { id: 'CREATE_ROLE', label: 'Create Role' },
    { id: 'EDIT_ROLE', label: 'Edit Role' },
    { id: 'DELETE_ROLE', label: 'Remove Role' },
    { id: 'PROMOTE_ASSIGNED', label: 'Promote Assigned Team Member' },
    { id: 'DEMOTE_ASSIGNED', label: 'Demote Assigned Team Member' },
    { id: 'REMOVE_ASSIGNED', label: 'Remove Assigned Team User' },
    { id: 'PROMOTE_ALL', label: 'Promote All Team Member' },
    { id: 'DEMOTE_ALL', label: 'Demote All Team Member' },
    { id: 'REMOVE_ALL', label: 'Remove All Team User' },
    { id: 'APPROVE_REQUESTS_ASSIGNED', label: 'Approve Requests (Assigned Team)' },
    { id: 'APPROVE_REQUESTS_ALL', label: 'Approve Requests (All Teams)' }
  ];

  // --- DARK MODE ENGINE ---
  useEffect(() => {
    if (currentUser?.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [currentUser?.darkMode]);

  // --- DEBUG LOGGER INTERCEPTOR ---
  useEffect(() => {
    if (currentUser?.isDebug) {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      const formatArgs = (args) => args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');

      console.log = (...args) => { setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'INFO', msg: formatArgs(args) }]); originalLog(...args); };
      console.error = (...args) => { setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'ERROR', msg: formatArgs(args) }]); originalError(...args); };
      console.warn = (...args) => { setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'WARN', msg: formatArgs(args) }]); originalWarn(...args); };

      console.log("Debug Mode Initialized. Intercepting all logs...");

      return () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [currentUser?.isDebug]);

  // Auto-scroll debug console
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // --- FIREBASE INIT ---
  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); console.log("Firebase Auth Anonymous Login Success"); } catch (err) { console.error("Firebase Auth failed:", err.message); } };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.warn("No authenticated user detected by Firebase yet.");
        return;
      }
      console.log("Firebase User Authenticated. Attaching database listeners...");
      
      const unsubTeams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), 
        (snap) => { console.log(`Fetched ${snap.docs.length} teams`); setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
        (error) => console.error("Teams Sync Error:", error.message)
      );
      const unsubRoles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'roles'), 
        (snap) => { console.log(`Fetched ${snap.docs.length} roles`); setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
        (error) => console.error("Roles Sync Error:", error.message)
      );
      const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), 
        (snap) => { console.log(`Fetched ${snap.docs.length} members`); setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
        (error) => console.error("Members Sync Error:", error.message)
      );
      
      return () => { unsubTeams(); unsubRoles(); unsubMembers(); };
    });

    return () => unsubAuth();
  }, []);

  const currentUserRole = useMemo(() => roles.find(r => r.id === currentUser?.roleId), [roles, currentUser]);
  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (authForm.discordId === 'debug' && authForm.password === 'debug') {
      setCurrentUser({ id: 'debug_user', name: 'Debug Console', isSystemAdmin: true, status: 'active', darkMode: true, isDebug: true });
      return;
    }
    if (authForm.discordId === 'admin' && authForm.password === MASTER_ADMIN_PASSWORD) {
      setCurrentUser({ id: 'superadmin', name: 'System Admin', isSystemAdmin: true, status: 'active', darkMode: true });
      return;
    }
    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user && user.status === 'active') setCurrentUser(user);
    else if (user && user.status === 'pending') alert("Your access request is still pending approval.");
    else alert("Invalid credentials or Discord ID not found.");
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!authForm.teamId || !authForm.requestedRoleId) return alert("You must select a Team and a Role to request access.");
    try {
      const id = `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await setDoc(docRef, { ...authForm, id, status: 'pending', roleId: 'r_pending', customPerms: [], darkMode: true });
      alert("Request submitted! Please wait for an admin to approve your Discord connection.");
      setAuthView('login');
      setAuthForm({ name: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
    } catch (error) {
      console.error("Access Request Failed:", error.message);
      alert("Failed to send request. Check your debug console if active.");
    }
  };

  const handleSaveMember = async (memberData) => {
    try {
      const id = memberData.id || `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await setDoc(docRef, { ...memberData, id, status: memberData.status || 'active' }, { merge: true });
      setMemberModal({ isOpen: false, data: null, teamId: null });
    } catch (error) {
      console.error("Save Member Error:", error.message);
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId);
      await deleteDoc(docRef);
      if (currentUser?.id === memberId) handleLogout();
    } catch (error) {
      console.error("Delete Member Error:", error.message);
    }
  };

  const togglePermission = async (targetId, permId) => {
    try {
      const isRole = roles.find(r => r.id === targetId);
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', isRole ? 'roles' : 'members', targetId);
      const targetData = isRole ? roles.find(r => r.id === targetId) : members.find(m => m.id === targetId);
      const perms = targetData?.customPerms || [];
      const newPerms = perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId];
      await setDoc(docRef, { customPerms: newPerms }, { merge: true });
    } catch (error) {
      console.error("Toggle Permission Error:", error.message);
    }
  };

  const handleToggleDarkMode = async () => {
    const newState = !currentUser.darkMode;
    setCurrentUser({ ...currentUser, darkMode: newState });
    if (currentUser.id !== 'superadmin' && !currentUser.isDebug) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', currentUser.id), { darkMode: newState }, { merge: true });
      } catch (error) {
        console.error("Failed to save dark mode preference:", error.message);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setLogs([]);
    document.documentElement.classList.remove('dark');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied Discord ID to clipboard: ${text}`);
  };

  // --- RENDER LOGIC ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-[#5865F2] p-4 rounded-2xl text-white shadow-lg shadow-[#5865F2]/30">
              <Shield size={32} />
            </div>
          </div>
          
          <h2 className="text-2xl font-black mb-2 text-center text-white tracking-tight">
            {authView === 'login' && 'CommUnity Portal'}
            {authView === 'request_step1' && 'Request Access'}
            {authView === 'request_step2' && 'Link Discord'}
          </h2>
          <p className="text-center text-slate-400 text-sm mb-6">
            {authView === 'login' && 'Sign in to access the management tools.'}
            {authView === 'request_step1' && 'Step 1: Tell us where you belong.'}
            {authView === 'request_step2' && 'Step 2: Authenticate your identity.'}
          </p>

          <form onSubmit={authView === 'login' ? handleLogin : authView === 'request_step2' ? handleRequestAccess : (e) => { e.preventDefault(); setAuthView('request_step2'); }} className="space-y-4">
            
            {/* LOGIN VIEW */}
            {authView === 'login' && (
              <>
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-[#5865F2]" placeholder="Discord ID (or Admin User)" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-[#5865F2]" type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                <button type="submit" className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center space-x-2">
                  <span>Sign In</span>
                </button>
              </>
            )}

            {/* REQUEST STEP 1: INFO */}
            {authView === 'request_step1' && (
              <>
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-[#5865F2]" placeholder="Real Full Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <div className="flex space-x-2">
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white focus:ring-2 focus:ring-[#5865F2]" value={authForm.teamId} onChange={e => setAuthForm({...authForm, teamId: e.target.value})}>
                    <option value="" disabled>Select Team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white focus:ring-2 focus:ring-[#5865F2]" value={authForm.requestedRoleId} onChange={e => setAuthForm({...authForm, requestedRoleId: e.target.value})}>
                    <option value="" disabled>Select Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg transition-all">
                  Next Step
                </button>
              </>
            )}

            {/* REQUEST STEP 2: DISCORD MOCK */}
            {authView === 'request_step2' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
                  <p className="text-xs text-[#5865F2] font-bold uppercase mb-2">Simulated OAuth Window</p>
                  <p className="text-sm text-slate-300">In a live environment, this redirects to Discord. For now, enter your Discord ID and a secure password manually.</p>
                </div>
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-[#5865F2]" placeholder="Discord ID (e.g., username#1234)" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-[#5865F2]" type="password" placeholder="Create a temporary password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                
                <button type="submit" className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-4 rounded-xl font-bold shadow-lg shadow-[#5865F2]/20 transition-all flex justify-center items-center space-x-2">
                  <span>Connect Discord & Submit</span>
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center border-t border-slate-800 pt-6">
            {authView === 'login' ? (
              <button onClick={() => setAuthView('request_step1')} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                Need management access? Apply here.
              </button>
            ) : (
              <button onClick={() => setAuthView('login')} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-[#f8fafc] text-gray-900 dark:bg-[#0B0F19] dark:text-slate-200">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} teams={teams} members={members}
        currentUser={currentUser} currentUserRole={currentUserRole} isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} 
        handleLogout={handleLogout} toggleDarkMode={handleToggleDarkMode} 
      />

      <div className={`flex-1 flex flex-col overflow-hidden ${currentUser.isDebug ? 'pb-64' : ''}`}>
        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard teams={teams} members={members} setActiveTab={setActiveTab} />}
          {activeTab === 'teams-setup' && <TeamSetup teams={teams} setTeamModal={setTeamModal} />}
          {activeTab === 'roles' && <RoleManagement roles={roles} setRoleModal={setRoleModal} />}
          {activeTab === 'requests' && <AccessRequests members={members} teams={teams} roles={roles} handleApprove={(id, teamId, roleId) => handleSaveMember({...members.find(m=>m.id===id), status: 'active', teamId, roleId})} handleDeny={handleDeleteMember} />}
          {activeTab === 'permissions' && <PermissionsManager roles={roles} members={members} isSysAdmin={isSysAdmin} togglePermission={togglePermission} availablePermissions={AVAILABLE_PERMISSIONS} />}

          {/* INDIVIDUAL TEAM VIEW - WITH UPGRADED ADMIN DISCORD VISIBILITY */}
          {!['dashboard', 'teams-setup', 'roles', 'requests', 'permissions'].includes(activeTab) && (
             <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{teams.find(t=>t.id===activeTab)?.name}</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage personnel and oversight for this division.</p>
                  </div>
                  <button onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg transition-all">
                    <Plus size={20} /> <span>Add Member</span>
                  </button>
                </div>

                <div className="grid gap-4">
                  {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                    <div key={member.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 group hover:border-blue-200 dark:hover:border-slate-600 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-600">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-3">
                            <h4 className="font-bold text-gray-900 dark:text-white">{member.name}</h4>
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded font-bold">
                              {roles.find(r => r.id === member.roleId)?.name || 'No Role'}
                            </span>
                          </div>
                          
                          {/* UPGRADED DISCORD ID VIEW */}
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="px-2 py-1 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded text-xs font-mono text-[#5865F2] font-semibold flex items-center">
                              {member.discordId}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(member.discordId)}
                              className="text-gray-400 hover:text-[#5865F2] transition-colors p-1"
                              title="Copy Discord ID"
                            >
                              <Copy size={14} />
                            </button>
                          </div>

                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setMemberModal({ isOpen: true, data: member, teamId: activeTab })} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => { if(window.confirm(`Remove ${member.name}?`)) handleDeleteMember(member.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {members.filter(m => m.teamId === activeTab && m.status === 'active').length === 0 && (
                     <p className="text-center p-8 text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">No members in this team yet.</p>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>

      {currentUser.isDebug && (
        <div className="fixed bottom-0 left-0 right-0 h-64 bg-black/95 border-t-4 border-red-600 text-green-400 font-mono flex flex-col z-[100] shadow-2xl">
          {/* ... Debug Console ... */}
        </div>
      )}

      <MemberModal memberModal={memberModal} setMemberModal={setMemberModal} teams={teams} roles={roles} handleSaveMember={handleSaveMember} currentUser={currentUser} />
      <TeamModal teamModal={teamModal} setTeamModal={setTeamModal} />
      <RoleModal roleModal={roleModal} setRoleModal={setRoleModal} availablePermissions={AVAILABLE_PERMISSIONS} />
    </div>
  );
}