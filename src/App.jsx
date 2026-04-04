import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders, Terminal, Copy, MapPin, Search, Activity, Eye, EyeOff
} from 'lucide-react';

import { auth, db } from './firebase-config.js';
import { 
  collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  signInAnonymously, onAuthStateChanged, OAuthProvider, signInWithPopup 
} from 'firebase/auth';

import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import TeamSetup from './views/TeamSetup';
import RoleManagement from './views/RoleManagement';
import AccessRequests from './views/AccessRequests';
import PermissionsManager from './views/PermissionsManager';
import MemberModal from './modals/MemberModal';
import TeamModal from './modals/TeamModal';
import RoleModal from './modals/RoleModal';

// --- CONFIGURATION ---
const MASTER_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const YOUR_DISCORD_ID = "826277251414360075"; 
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'cvv', 'apiKey'];
const appId = "community-manager";

// --- SECURITY FIX: DATA MASKING ---
const maskSensitiveData = (data) => {
    if (!data || typeof data !== 'object') return data;
    try {
        const masked = JSON.parse(JSON.stringify(data)); 
        const redact = (obj) => {
            for (let key in obj) {
                if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
                    obj[key] = "[REDACTED]";
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    redact(obj[key]);
                }
            }
        };
        redact(masked);
        return masked;
    } catch (e) { return data; }
};

export default function App() {
  // --- CORE STATE ---
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- AUTH & FLOW STATE ---
  const [authView, setAuthView] = useState('login'); 
  const [authForm, setAuthForm] = useState({ 
    name: '', 
    cityId: '', 
    discordId: '', 
    password: '', 
    teamId: '', 
    requestedRoleId: '' 
  });
  
  // --- MODAL STATE ---
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

  // --- DEBUG & LOGGING STATE ---
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  // --- THE 15-POINT PERMISSION SYSTEM ---
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

  // --- TAILWIND V4 DARK MODE ENGINE ---
  useEffect(() => {
    if (currentUser?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentUser?.darkMode]);

  // --- GLOBAL DEBUG INTERCEPTOR (THE SECURITY FIX) ---
  useEffect(() => {
    if (currentUser?.isDebug) {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      const formatArgs = (args) => args.map(a => 
        typeof a === 'object' ? JSON.stringify(maskSensitiveData(a), null, 2) : a
      ).join(' ');

      console.log = (...args) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'INFO', msg: formatArgs(args) }]);
        originalLog(...args);
      };
      console.error = (...args) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'ERROR', msg: formatArgs(args) }]);
        originalError(...args);
      };
      console.warn = (...args) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'WARN', msg: formatArgs(args) }]);
        originalWarn(...args);
      };

      console.log("Debug System Online. Redaction Interceptor Active.");

      return () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [currentUser?.isDebug]);

  // Auto-scroll for Debug Console
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // --- FIREBASE DATA SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Tunnel Failed:", err.message);
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      
      const unsubTeams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), 
        (snap) => {
          setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      );

      const unsubRoles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'roles'), 
        (snap) => {
          setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      );

      const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), 
        (snap) => {
          setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      );
      
      return () => { unsubTeams(); unsubRoles(); unsubMembers(); };
    });

    return () => unsubAuth();
  }, []);

  // --- PERMISSION CALCULATIONS ---
  const currentUserRole = useMemo(() => roles.find(r => r.id === currentUser?.roleId), [roles, currentUser]);
  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // --- AUTH HANDLERS ---
  const handleDiscordLogin = async () => {
    const provider = new OAuthProvider('oidc.discord');
    try {
      const result = await signInWithPopup(auth, provider);
      const discordUID = result.user.providerData[0].uid;
      
      // SUPER ADMIN CHECK
      if (discordUID === YOUR_DISCORD_ID) {
        setCurrentUser({ 
          id: 'superadmin', 
          name: 'System Owner', 
          isSystemAdmin: true, 
          status: 'active', 
          darkMode: true,
          isDebug: false 
        });
        return;
      }

      const match = members.find(m => m.discordId === discordUID && m.status === 'active');
      if (match) {
        setCurrentUser(match);
      } else {
        alert("Access Denied: Your Discord identity is not linked to an approved manager profile.");
        await auth.signOut();
      }
    } catch (error) {
      alert(`Discord Login Failed: ${error.message}`);
    }
  };

  const toggleLoggedMode = () => {
      setCurrentUser(prev => ({ ...prev, isDebug: !prev.isDebug }));
      if (!currentUser.isDebug) setLogs([]);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (authForm.discordId === 'debug' && authForm.password === 'debug') {
      setCurrentUser({ id: 'debug_user', name: 'Debug Console', isSystemAdmin: true, status: 'active', darkMode: true, isDebug: true });
      return;
    }
    if (authForm.discordId === 'admin' && authForm.password === MASTER_ADMIN_PASSWORD) {
      setCurrentUser({ id: 'superadmin', name: 'System Admin', isSystemAdmin: true, status: 'active', darkMode: true, isDebug: false });
      return;
    }
    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user && user.status === 'active') setCurrentUser(user);
    else if (user && user.status === 'pending') alert("Your application is still under review.");
    else alert("Invalid credentials.");
  };

  const handleLinkAndSubmit = async (e) => {
    e.preventDefault();
    const provider = new OAuthProvider('oidc.discord');
    try {
      const result = await signInWithPopup(auth, provider);
      const verifiedUID = result.user.providerData[0].uid;
      
      const requestId = `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', requestId);
      
      const payload = {
        ...authForm,
        id: requestId,
        discordId: verifiedUID,
        status: 'pending',
        customPerms: [],
        darkMode: true
      };

      await setDoc(docRef, payload);
      alert("Application Submitted! Verified UID: " + verifiedUID);
      await auth.signOut();
      setAuthView('login');
      setAuthForm({ name: '', cityId: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
    } catch (error) {
      alert(`Submission Failed: ${error.message}`);
    }
  };

  // --- DATA HANDLERS ---
  const handleSaveMember = async (memberData) => {
    try {
      const id = memberData.id || `m${Date.now()}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await setDoc(docRef, { ...memberData, id }, { merge: true });
      setMemberModal({ isOpen: false, data: null, teamId: null });
    } catch (err) { console.error("Member Save Error:", err.message); }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Permanent Removal: Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId));
      if (currentUser?.id === memberId) handleLogout();
    } catch (err) { console.error("Deletion Error:", err.message); }
  };

  const togglePermission = async (targetId, permId) => {
    try {
      const isRole = roles.find(r => r.id === targetId);
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', isRole ? 'roles' : 'members', targetId);
      const targetData = isRole ? roles.find(r => r.id === targetId) : members.find(m => m.id === targetId);
      const perms = targetData?.customPerms || [];
      const newPerms = perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId];
      await setDoc(docRef, { customPerms: newPerms }, { merge: true });
    } catch (err) { console.error("Perm Toggle Error:", err.message); }
  };

  const handleToggleDarkMode = async () => {
    const newState = !currentUser.darkMode;
    setCurrentUser({ ...currentUser, darkMode: newState });
    if (currentUser.id !== 'superadmin' && !currentUser.isDebug) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', currentUser.id), { darkMode: newState }, { merge: true });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setLogs([]);
    document.documentElement.classList.remove('dark');
  };

  const copyId = (text) => {
    navigator.clipboard.writeText(text);
    alert("ID Copied: " + text);
  };

  // --- RENDER: LOGIN & PORTAL ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 selection:bg-[#5865F2] selection:text-white">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#5865F2] to-transparent opacity-50"></div>
          
          <div className="flex justify-center mb-8">
            <div className="bg-[#5865F2] p-5 rounded-3xl text-white shadow-2xl shadow-[#5865F2]/20 rotate-3">
              <Shield size={40} strokeWidth={2.5} />
            </div>
          </div>
          
          <h2 className="text-3xl font-black mb-2 text-center text-white tracking-tighter uppercase">
            {authView === 'login' && 'Portal'}
            {authView === 'admin_login' && 'Override'}
            {authView === 'request_step1' && 'Request'}
            {authView === 'request_step2' && 'Verify'}
          </h2>
          <p className="text-center text-slate-500 text-sm mb-8 font-medium">
            {authView === 'login' && 'Management Terminal'}
            {authView === 'admin_login' && 'Secure Admin Authentication'}
            {authView === 'request_step1' && 'Step 1: City Identification'}
            {authView === 'request_step2' && 'Step 2: Discord Association'}
          </p>

          <div className="space-y-4">
            {authView === 'login' && (
              <>
                <button onClick={handleDiscordLogin} className="group w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-5 rounded-2xl font-black shadow-lg flex justify-center items-center space-x-3 transition-all active:scale-95">
                  <img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="24" alt="" />
                  <span>Login with Discord</span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setAuthView('request_step1')} className="bg-slate-800 hover:bg-slate-750 text-slate-200 p-4 rounded-2xl font-bold text-xs border border-slate-700 transition-all">Request Access</button>
                  <button onClick={() => setAuthView('admin_login')} className="bg-slate-800 hover:bg-slate-750 text-slate-200 p-4 rounded-2xl font-bold text-xs border border-slate-700 transition-all">Admin Bypass</button>
                </div>
              </>
            )}

            {authView === 'admin_login' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input required className="w-full p-5 pl-12 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Username" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input required className="w-full p-5 pl-12 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" type="password" placeholder="Key Phrase" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black shadow-xl transition-all">Authenticate</button>
                <button onClick={() => setAuthView('login')} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              </form>
            )}

            {authView === 'request_step1' && (
              <form onSubmit={(e) => { e.preventDefault(); setAuthView('request_step2'); }} className="space-y-4">
                <div className="flex space-x-2">
                  <input required className="w-2/3 p-5 bg-slate-800 border-none rounded-2xl text-white outline-none" placeholder="City Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                  <input required className="w-1/3 p-5 bg-slate-800 border-none rounded-2xl text-white outline-none" placeholder="ID #" value={authForm.cityId} onChange={e => setAuthForm({...authForm, cityId: e.target.value})} />
                </div>
                <div className="flex space-x-2">
                  <select required className="w-1/2 p-5 bg-slate-800 border-none rounded-2xl text-white outline-none appearance-none" value={authForm.teamId} onChange={e => setAuthForm({...authForm, teamId: e.target.value})}>
                    <option value="" disabled>Team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select required className="w-1/2 p-5 bg-slate-800 border-none rounded-2xl text-white outline-none appearance-none" value={authForm.requestedRoleId} onChange={e => setAuthForm({...authForm, requestedRoleId: e.target.value})}>
                    <option value="" disabled>Rank...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg">Next Step</button>
                <button onClick={() => setAuthView('login')} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest">Back</button>
              </form>
            )}

            {authView === 'request_step2' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-slate-700 text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-white group-hover:rotate-12 transition-transform">
                    <MapPin size={48} />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Application Summary</p>
                  <div className="space-y-1">
                    <h4 className="text-white font-black text-xl">{authForm.name}</h4>
                    <p className="text-blue-400 text-xs font-bold font-mono">CITY ID: {authForm.cityId}</p>
                    <div className="flex space-x-2 mt-4">
                      <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-1 rounded uppercase tracking-wider">
                        {teams.find(t=>t.id===authForm.teamId)?.name}
                      </span>
                      <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-1 rounded uppercase tracking-wider">
                        {roles.find(r=>r.id===authForm.requestedRoleId)?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed">
                    Final Step: Link your Discord account. This will automatically pull your unique identity for management to verify.
                  </p>
                  
                  <button onClick={handleLinkAndSubmit} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-6 rounded-2xl font-black shadow-2xl shadow-[#5865F2]/20 flex justify-center items-center space-x-4 transition-all active:scale-95 group">
                    <img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="28" alt="" className="group-hover:scale-110 transition-transform" />
                    <span className="text-lg">Link & Submit</span>
                  </button>
                </div>

                <button onClick={() => setAuthView('request_step1')} className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Edit Information</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN APPLICATION ---
  return (
    <div className="flex h-screen font-sans overflow-hidden bg-[#f8fafc] text-gray-900 dark:bg-[#0B0F19] dark:text-slate-200 transition-colors duration-500">
      
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        teams={teams} members={members} 
        currentUser={currentUser} currentUserRole={currentUserRole} 
        isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} 
        handleLogout={handleLogout} toggleDarkMode={handleToggleDarkMode} 
      />
      
      <div className={`flex-1 flex flex-col overflow-hidden ${currentUser.isDebug ? 'pb-64' : ''}`}>
        
        {/* SUPER ADMIN TOGGLE BAR */}
        {isSysAdmin && (
          <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-4 flex justify-end">
            <button 
              onClick={toggleLoggedMode}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentUser.isDebug ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-600/10 hover:text-red-600'}`}
            >
              {currentUser.isDebug ? <EyeOff size={14}/> : <Eye size={14}/>}
              <span>{currentUser.isDebug ? 'Disable Logged Mode' : 'Enable Logged Mode'}</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-7xl mx-auto w-full">
          
          {/* VIEW ROUTING */}
          {activeTab === 'dashboard' && <Dashboard teams={teams} members={members} setActiveTab={setActiveTab} />}
          {activeTab === 'teams-setup' && <TeamSetup teams={teams} setTeamModal={setTeamModal} />}
          {activeTab === 'roles' && <RoleManagement roles={roles} setRoleModal={setRoleModal} />}
          
          {activeTab === 'requests' && (
            <AccessRequests 
              members={members} teams={teams} roles={roles} 
              handleApprove={(id, tid, rid) => handleSaveMember({...members.find(m=>m.id===id), status: 'active', teamId: tid, roleId: rid})} 
              handleDeny={handleDeleteMember} 
            />
          )}
          
          {activeTab === 'permissions' && (
            <PermissionsManager 
              roles={roles} members={members} 
              isSysAdmin={isSysAdmin} togglePermission={togglePermission} 
              availablePermissions={AVAILABLE_PERMISSIONS} 
            />
          )}
          
          {/* DYNAMIC TEAM ROSTERS */}
          {!['dashboard', 'teams-setup', 'roles', 'requests', 'permissions'].includes(activeTab) && (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-blue-500 dark:text-blue-400">
                <Users size={200} />
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 relative z-10 gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/20"><Users size={20} /></div>
                    <h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase">
                      {teams.find(t=>t.id===activeTab)?.name}
                    </h2>
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 font-medium ml-1">Live personnel management for this division.</p>
                </div>
                <button 
                  onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-blue-900/20 transition-all flex items-center space-x-3 active:scale-95"
                >
                  <Plus size={24} strokeWidth={3} />
                  <span>Enlist Member</span>
                </button>
              </div>

              <div className="grid gap-6 relative z-10">
                {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                  <div key={member.id} className="flex flex-col lg:flex-row justify-between items-center p-6 bg-gray-50/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/50 group hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300">
                    <div className="flex items-center space-x-6 w-full">
                      <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-3xl flex items-center justify-center font-black text-2xl text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-105">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="font-black text-xl text-gray-900 dark:text-white">{member.name}</h4>
                          <span className="flex items-center space-x-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
                            <MapPin size={12} className="text-blue-500"/>
                            <span>City ID: {member.cityId || '000'}</span>
                          </span>
                          <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-[0.2em] shadow-lg shadow-blue-900/20">
                            {roles.find(r => r.id === member.roleId)?.name || 'UNRANKED'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 mt-3">
                          <div className="px-3 py-2 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl text-[11px] font-mono text-[#5865F2] dark:text-blue-400 font-black tracking-tight">
                            {member.discordId}
                          </div>
                          <button 
                            onClick={() => copyId(member.discordId)} 
                            className="text-slate-400 hover:text-[#5865F2] dark:hover:text-blue-400 transition-colors p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm"
                            title="Copy Unique ID"
                          >
                            <Copy size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-6 lg:mt-0 w-full lg:w-auto justify-end">
                      <button onClick={() => setMemberModal({ isOpen: true, data: member, teamId: activeTab })} className="p-4 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all"><Edit size={20} /></button>
                      <button onClick={() => handleDeleteMember(member.id)} className="p-4 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
                
                {members.filter(m => m.teamId === activeTab && m.status === 'active').length === 0 && (
                   <div className="p-20 text-center bg-gray-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800 animate-pulse">
                      <Users size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-sm">No Active Personnel Found</p>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL DEBUG OVERLAY */}
      {currentUser.isDebug && (
        <div className="fixed bottom-0 left-0 right-0 h-64 bg-black/95 border-t-4 border-red-600 text-green-400 font-mono flex flex-col z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="bg-red-600 text-white px-6 py-3 flex justify-between items-center font-black text-xs tracking-widest shrink-0">
            <div className="flex items-center space-x-3"><Terminal size={18} strokeWidth={3} /> <span>CORE_SYSTEM_DEBUG_v4.0</span></div>
            <div className="flex items-center space-x-6">
               <button onClick={() => setLogs([])} className="hover:underline">FLUSH_LOGS</button>
               <button onClick={toggleLoggedMode} className="bg-white/20 px-2 py-1 rounded hover:bg-white/40 transition-colors uppercase font-black text-[9px]">Terminate Session</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-[11px] space-y-2 selection:bg-green-500 selection:text-black">
            {logs.map((log, i) => (
              <div key={i} className="animate-fade-in border-l-2 border-slate-800 pl-3">
                <span className="opacity-40 font-bold">[{log.time}]</span> 
                <span className={`ml-2 font-black ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARN' ? 'text-yellow-500' : 'text-green-500'}`}>
                  {log.type} //
                </span> 
                <span className="ml-2 text-slate-300">{log.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* PORTALS & MODALS */}
      <MemberModal 
        memberModal={memberModal} 
        setMemberModal={setMemberModal} 
        teams={teams} roles={roles} 
        handleSaveMember={handleSaveMember} 
      />
      <TeamModal 
        teamModal={teamModal} 
        setTeamModal={setTeamModal} 
      />
      <RoleModal 
        roleModal={roleModal} 
        setRoleModal={setRoleModal} 
        availablePermissions={AVAILABLE_PERMISSIONS} 
      />
    </div>
  );
}