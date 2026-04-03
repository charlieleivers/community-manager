import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders, Terminal
} from 'lucide-react';

import { auth, db } from './firebase-config.js';
import { 
  collection, onSnapshot, doc, setDoc, deleteDoc 
} from 'firebase/firestore';
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
  const [authView, setAuthView] = useState('login'); 
  const [authForm, setAuthForm] = useState({ name: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
  
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

  // Debug State
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  const appId = "community-manager";

  const AVAILABLE_PERMISSIONS = [
    { id: 'MANAGE_TEAMS', label: 'Team Architecture (Merge/Split/Create)' },
    { id: 'MANAGE_ROLES', label: 'Role Hierarchy & Levels' },
    { id: 'REVIEW_REQUESTS', label: 'Approve/Deny Pending Members' },
    { id: 'MANAGE_USERS', label: 'User Overrides & Role Assignment' },
    { id: 'MANAGE_MENTORS', label: 'Assign Mentor Badges' },
    { id: 'VIEW_AUDIT_LOGS', label: 'View System Audit Logs' },
    { id: 'MANAGE_INTEGRATIONS', label: 'Database & Webhook Config' },
    { id: 'SYSTEM_SETTINGS', label: 'Global System Overrides' },
    { id: 'EXPORT_DATA', label: 'Export Community Reports' },
    { id: 'BROADCAST_ANNOUNCE', label: 'Send System-wide Announcements' },
    { id: 'MANAGE_FINANCES', label: 'Manage Team Budgets/Payouts' }
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
    else alert("Invalid credentials.");
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!authForm.teamId || !authForm.requestedRoleId) return alert("You must select a Team and a Role to request access.");
    try {
      const id = `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await setDoc(docRef, { ...authForm, id, status: 'pending', roleId: 'r_pending', customPerms: [], darkMode: true });
      alert("Request submitted! Please wait for an admin to approve you.");
      setAuthView('login');
      setAuthForm({ name: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
    } catch (error) {
      console.error("Access Request Failed:", error.message);
      alert("Failed to send request. Check your debug console if active.");
    }
  };

  const handleSaveMember = async (memberData) => {
    try {
      console.log("Attempting to save member...", memberData);
      const id = memberData.id || `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await setDoc(docRef, { ...memberData, id, status: memberData.status || 'active' }, { merge: true });
      console.log("Member saved successfully!");
      setMemberModal({ isOpen: false, data: null, teamId: null });
    } catch (error) {
      console.error("Save Member Error:", error.message);
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      console.log("Attempting to delete member...", memberId);
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId);
      await deleteDoc(docRef);
      console.log("Member deleted successfully!");
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
      console.log(`Permission ${permId} toggled for ${targetId}`);
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

  const runDiagnosticTest = async () => {
    console.log("--- RUNNING FIREBASE DIAGNOSTIC TEST ---");
    try {
      const testId = `test_${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'diagnostic', testId);
      console.log("Attempting to write to database path:", docRef.path);
      await setDoc(docRef, { status: "Write Successful", time: new Date().toISOString() });
      console.log("SUCCESS: Database is unlocked and accepting writes.");
      await deleteDoc(docRef);
      console.log("SUCCESS: Cleaned up diagnostic document.");
    } catch (error) {
      console.error("DIAGNOSTIC FAILED:", error.message);
      console.warn("SOLUTION: Go to Firebase Console -> Firestore Database -> Rules. Ensure they are set to 'allow read, write: if true;'");
    }
  };

  // --- RENDER LOGIC ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-900/50">
              <Shield size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-6 text-center text-white tracking-tight">
            {authView === 'login' ? 'CommUnity Portal' : 'Join Management'}
          </h2>
          <form onSubmit={authView === 'login' ? handleLogin : handleRequestAccess} className="space-y-4">
            {authView === 'request' && (
              <>
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                <div className="flex space-x-2">
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white" value={authForm.teamId} onChange={e => setAuthForm({...authForm, teamId: e.target.value})}>
                    <option value="" disabled>Select Team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white" value={authForm.requestedRoleId} onChange={e => setAuthForm({...authForm, requestedRoleId: e.target.value})}>
                    <option value="" disabled>Select Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" placeholder="Discord ID" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
            <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg transition-all">
              {authView === 'login' ? 'Enter System' : 'Submit Request'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setAuthView(authView === 'login' ? 'request' : 'login')} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              {authView === 'login' ? "Request Management Access" : "Back to Login"}
            </button>
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
             </div>
          )}
        </div>
      </div>

      {/* GLOBAL DEBUG CONSOLE */}
      {currentUser.isDebug && (
        <div className="fixed bottom-0 left-0 right-0 h-64 bg-black/95 border-t-4 border-red-600 text-green-400 font-mono flex flex-col z-[100] shadow-2xl">
          <div className="bg-red-600 text-white px-4 py-2 flex justify-between items-center font-bold text-sm shrink-0">
            <div className="flex items-center space-x-2"><Terminal size={16} /> <span>SYSTEM DEBUG CONSOLE</span></div>
            <div className="flex space-x-4">
              <button onClick={runDiagnosticTest} className="bg-white text-red-600 px-3 py-1 rounded text-xs hover:bg-gray-200 transition-colors">RUN FIREBASE TEST</button>
              <button onClick={() => setLogs([])} className="hover:text-red-200">CLEAR LOGS</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={`${log.type === 'ERROR' ? 'text-red-400' : log.type === 'WARN' ? 'text-yellow-400' : 'text-green-400'}`}>
                <span className="opacity-50">[{log.time}]</span> <span className="font-bold">{log.type}:</span> {log.msg}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      <MemberModal memberModal={memberModal} setMemberModal={setMemberModal} teams={teams} roles={roles} handleSaveMember={handleSaveMember} currentUser={currentUser} />
      <TeamModal teamModal={teamModal} setTeamModal={setTeamModal} />
      <RoleModal roleModal={roleModal} setRoleModal={setRoleModal} availablePermissions={AVAILABLE_PERMISSIONS} />
    </div>
  );
}