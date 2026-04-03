import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders, Terminal, Copy, MapPin
} from 'lucide-react';

import { auth, db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { OAuthProvider, signInWithPopup } from "firebase/auth";
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
  // ADDED cityId to the authForm state
  const [authForm, setAuthForm] = useState({ name: '', cityId: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
  
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

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
    if (currentUser?.darkMode) {
      document.documentElement.classList.add('dark');
      console.log("DEBUG: DARK MODE APPLIED TO HTML TAG");
    } else {
      document.documentElement.classList.remove('dark');
      console.log("DEBUG: DARK MODE REMOVED FROM HTML TAG");
    }
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

      console.log("Debug Mode Initialized.");

      return () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [currentUser?.isDebug]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // --- FIREBASE INIT ---
  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      
      const unsubTeams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), 
        (snap) => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubRoles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'roles'), 
        (snap) => setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), 
        (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      
      return () => { unsubTeams(); unsubRoles(); unsubMembers(); };
    });

    return () => unsubAuth();
  }, []);

  const currentUserRole = useMemo(() => roles.find(r => r.id === currentUser?.roleId), [roles, currentUser]);
  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // --- HANDLERS ---
  const handleDiscordLogin = async () => {
    console.log("--- DISCORD AUTH INITIATED ---");
    
    // This tells Firebase we want to use Discord
    const provider = new OAuthProvider('oidc.discord');
    
    try {
      // 1. Open the Discord Popup
      const result = await signInWithPopup(auth, provider);
      const discordUser = result.user;
      
      // 2. Get the unique Discord ID from the login
      const discordUID = discordUser.providerData[0].uid;
      console.log("Discord UID received:", discordUID);

      // 3. Look for a matching member in your 'members' state
      // We check if the Discord ID they registered with matches the one they just logged in with
      const match = members.find(m => m.discordId === discordUID && m.status === 'active');

      if (match) {
        console.log("Match found! Logging in as:", match.name);
        setCurrentUser(match);
      } else {
        console.warn("No active account found for this Discord ID.");
        alert("Access Denied: This Discord account is not linked to an approved manager profile.");
        // Log them out of Firebase so they can try a different account if needed
        await auth.signOut();
      }
    } catch (error) {
      console.error("Discord Auth Error:", error.message);
      
      // If you haven't set up the Firebase Console yet, this error will trigger:
      if (error.code === 'auth/operation-not-allowed') {
        alert("Discord Login is not yet enabled in your Firebase Console. See the 'Admin Login' to bypass.");
      } else {
        alert(`Discord Login Failed: ${error.message}`);
      }
    }
  };
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
      setAuthForm({ name: '', cityId: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
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
    alert(`Copied to clipboard: ${text}`);
  };

  // --- RENDER LOGIC ---
  // --- UPDATED LOGIN RENDER ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="bg-[#5865F2] p-4 rounded-2xl text-white shadow-lg shadow-[#5865F2]/30">
              <Shield size={32} />
            </div>
          </div>
          
          <h2 className="text-2xl font-black mb-2 text-center text-white tracking-tight">
            {authView === 'login' && 'CommUnity Portal'}
            {authView === 'admin_login' && 'Admin Override'}
            {authView === 'request_step1' && 'Request Access'}
            {authView === 'request_step2' && 'Link Discord Identity'}
          </h2>

          <div className="space-y-4 mt-6">
            {/* INITIAL CHOICE VIEW */}
            {authView === 'login' && (
              <>
                <button 
                  onClick={handleDiscordLogin}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-4 rounded-xl font-bold shadow-lg flex justify-center items-center space-x-3 transition-all"
                >
                  <img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="24" alt="Discord" />
                  <span>Login with Discord</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAuthView('request_step1')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-xl font-bold text-sm transition-all border border-slate-700"
                  >
                    Request Access
                  </button>
                  <button 
                    onClick={() => setAuthView('admin_login')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-xl font-bold text-sm transition-all border border-slate-700"
                  >
                    Admin Login
                  </button>
                </div>
              </>
            )}

            {/* ADMIN LOGIN VIEW */}
            {authView === 'admin_login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500" placeholder="Admin Username" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500" type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg transition-all">
                  Sign In as Admin
                </button>
                <button onClick={() => setAuthView('login')} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">Cancel</button>
              </form>
            )}

            {/* REQUEST STEP 1: CITY INFO */}
            {authView === 'request_step1' && (
              <form onSubmit={(e) => { e.preventDefault(); setAuthView('request_step2'); }} className="space-y-4">
                <div className="flex space-x-2">
                  <input required className="w-2/3 p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" placeholder="City Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                  <input required className="w-1/3 p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" placeholder="City ID" value={authForm.cityId} onChange={e => setAuthForm({...authForm, cityId: e.target.value})} />
                </div>
                <div className="flex space-x-2">
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white" value={authForm.teamId} onChange={e => setAuthForm({...authForm, teamId: e.target.value})}>
                    <option value="" disabled>Target Team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select required className="w-1/2 p-4 bg-slate-800 border-none rounded-xl outline-none text-white" value={authForm.requestedRoleId} onChange={e => setAuthForm({...authForm, requestedRoleId: e.target.value})}>
                    <option value="" disabled>Target Role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg">Continue to Discord Link</button>
                <button onClick={() => setAuthView('login')} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">Back</button>
              </form>
            )}

            {/* REQUEST STEP 2: DISCORD LINK (REQUIRED ID) */}
            {authView === 'request_step2' && (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl text-center">
                  <p className="text-sm text-slate-300">To complete your request, you <strong>must</strong> provide your Discord ID. This allows management to verify your identity.</p>
                </div>
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white border-2 border-[#5865F2]/50" placeholder="Discord Username (e.g. jdoe#1234)" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                <input required className="w-full p-4 bg-slate-800 border-none rounded-xl outline-none text-white placeholder-slate-400" type="password" placeholder="Create Portal Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                
                <button type="submit" className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-4 rounded-xl font-bold shadow-lg flex justify-center items-center space-x-2">
                  <img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="20" alt="" />
                  <span>Submit Application</span>
                </button>
              </form>
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

          {/* INDIVIDUAL TEAM VIEW - WITH UPGRADED CITY UI */}
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
                            {member.cityId && (
                              <span className="flex items-center space-x-1 text-xs text-gray-500 dark:text-slate-400 font-mono">
                                <MapPin size={12} /> <span>ID: {member.cityId}</span>
                              </span>
                            )}
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded font-bold">
                              {roles.find(r => r.id === member.roleId)?.name || 'No Role'}
                            </span>
                          </div>
                          
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
          <div className="bg-red-600 text-white px-4 py-2 flex justify-between items-center font-bold text-sm shrink-0">
            <div className="flex items-center space-x-2"><Terminal size={16} /> <span>SYSTEM DEBUG CONSOLE</span></div>
            <div className="flex space-x-4">
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