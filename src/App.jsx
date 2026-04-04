import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders, Terminal, Copy, MapPin, Search, Activity, Eye, EyeOff,
  Briefcase, Bell, Globe, ChevronRight, UploadCloud, Crown
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDoc, writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, OAuthProvider, signInWithPopup, signInWithCustomToken 
} from 'firebase/auth';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kng-staff-control';

// --- SYSTEM CONSTANTS ---
const YOUR_DISCORD_ID = "826277251414360075"; 
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'cvv', 'apiKey'];
const MASTER_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin"; 

// --- SECURITY UTILITY: PII MASKING ---
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

// ============================================================================
// INTERNAL UI COMPONENTS 
// ============================================================================

const Sidebar = ({ activeTab, setActiveTab, teams, members, currentUser, currentUserRole, isGlobalAdmin, isSysAdmin, handleLogout, toggleDarkMode }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teams-setup', label: 'Team Setup', icon: Settings, adminOnly: true },
    { id: 'roles', label: 'Role Management', icon: Shield, adminOnly: true },
    { id: 'requests', label: 'Access Requests', icon: Bell, adminOnly: true },
    { id: 'permissions', label: 'Permissions', icon: Lock, adminOnly: true },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col z-50">
      <div className="p-8 flex items-center space-x-3">
        <div className="p-2 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/20"><Crown size={24} strokeWidth={2.5} /></div>
        <span className="font-black text-xl tracking-tighter uppercase dark:text-white">KNG Staff</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Core Interface</div>
        {navItems.map(item => {
          if (item.adminOnly && !isGlobalAdmin) return null;
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Icon size={20} /><span>{item.label}</span>
            </button>
          );
        })}

        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mt-8 mb-4">Divisions</div>
        {teams.map(team => (
          <button key={team.id} onClick={() => setActiveTab(team.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === team.id ? 'bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: team.color || '#ef4444' }}></div>
            <span className="truncate">{team.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center space-x-3 mb-6 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
           <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white">{currentUser?.name?.charAt(0)}</div>
           <div className="flex-1 overflow-hidden">
             <div className="font-black text-xs truncate dark:text-white uppercase">{currentUser?.name}</div>
             <div className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider truncate">{currentUserRole?.name || 'System User'}</div>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleDarkMode} className="flex items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-600 transition-colors">
            {currentUser?.darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} className="flex items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const Dashboard = ({ teams, members, setActiveTab }) => {
  const stats = [
    { label: 'Total Personnel', value: members.filter(m => m.status === 'active').length, icon: Users, color: 'text-red-600', bg: 'bg-red-600/10' },
    { label: 'Active Divisions', value: teams.length, icon: Globe, color: 'text-purple-600', bg: 'bg-purple-600/10' },
    { label: 'Pending Applications', value: members.filter(m => m.status === 'pending').length, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Operational Overview</h1><p className="text-slate-500 font-medium">Real-time status of community management divisions.</p></div>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"><Activity size={16} className="text-green-500" /><span className="text-xs font-black uppercase tracking-widest dark:text-slate-400">System Healthy</span></div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className={`absolute top-0 right-0 p-8 opacity-10 ${stat.color} transition-transform group-hover:scale-110`}><Icon size={64} /></div>
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}><Icon size={24} /></div>
              <div className="text-4xl font-black dark:text-white">{stat.value}</div>
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- TEAM SETUP (WITH BULK IMPORT & COLORS) ---
const TeamSetupView = ({ teams, setTeamModal }) => {
  const handleBulkImport = async () => {
    const input = prompt("Enter team names separated by commas (e.g. Alpha, Bravo, Charlie):");
    if (!input) return;
    const names = input.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const id = `t${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'teams', id);
        batch.set(ref, { id, name, color: '#ef4444' }); // Default red
      });
      await batch.commit();
      alert(`Successfully imported ${names.length} teams.`);
    } catch (e) { alert("Bulk import failed."); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className="text-3xl font-black dark:text-white uppercase">Team Setup</h2><p className="text-slate-500">Manage community divisions and colors.</p></div>
        <div className="flex space-x-3">
          <button onClick={handleBulkImport} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black flex items-center space-x-2 transition-all"><UploadCloud size={18}/><span>Bulk Import</span></button>
          <button onClick={() => setTeamModal({ isOpen: true, data: null })} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black flex items-center space-x-2 transition-all shadow-lg shadow-red-600/20"><Plus size={18}/><span>Add Team</span></button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <div key={team.id} className="p-6 border border-gray-100 dark:border-slate-700 rounded-3xl flex justify-between items-center group bg-slate-50/50 dark:bg-slate-800/50">
             <div className="flex items-center space-x-4">
               <div className="w-6 h-6 rounded-full shadow-inner border-2 border-white dark:border-slate-700" style={{ backgroundColor: team.color || '#ef4444' }}></div>
               <span className="font-black dark:text-white uppercase">{team.name}</span>
             </div>
             <button onClick={() => setTeamModal({ isOpen: true, data: team })} className="p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Edit size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- ROLE MANAGEMENT (WITH BULK IMPORT) ---
const RoleManagementView = ({ roles, setRoleModal }) => {
  const handleBulkImport = async () => {
    const input = prompt("Enter role names separated by commas (e.g. Manager, Mod, Helper):");
    if (!input) return;
    const names = input.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const id = `r${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'roles', id);
        batch.set(ref, { id, name, scope: 'TEAM', permissions: [] });
      });
      await batch.commit();
      alert(`Successfully imported ${names.length} roles.`);
    } catch (e) { alert("Bulk import failed."); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className="text-3xl font-black dark:text-white uppercase">Role Management</h2><p className="text-slate-500">Define hierarchy and access levels.</p></div>
        <div className="flex space-x-3">
          <button onClick={handleBulkImport} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black flex items-center space-x-2"><UploadCloud size={18}/><span>Bulk Import</span></button>
          <button onClick={() => setRoleModal({ isOpen: true, data: null })} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black flex items-center space-x-2 shadow-lg shadow-red-600/20"><Plus size={18}/><span>Add Role</span></button>
        </div>
      </div>
      <div className="space-y-3">
        {roles.map(role => (
          <div key={role.id} className="p-4 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <div className="font-black dark:text-white uppercase flex items-center space-x-2"><Shield size={16} className="text-red-500"/><span>{role.name}</span></div>
              <div className="text-xs text-slate-400 font-bold mt-1">Scope: {role.scope}</div>
            </div>
            <button onClick={() => setRoleModal({ isOpen: true, data: role })} className="p-2 text-slate-400 hover:text-red-600"><Edit size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // --- CORE STATE ---
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- AUTH & FLOW STATE ---
  const [authView, setAuthView] = useState('login'); 
  const [authForm, setAuthForm] = useState({ name: '', cityId: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
  
  // --- MODAL STATE ---
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

  // --- DEBUG & LOGGING STATE ---
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  // --- THE 16-POINT PERMISSION SYSTEM (ADDED ADMINISTRATOR) ---
  const AVAILABLE_PERMISSIONS = [
    { id: 'ADMINISTRATOR', label: 'Administrator (Bypass All Checks)' },
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

  // --- LOGGED MODE INTERCEPTOR ---
  useEffect(() => {
    if (currentUser?.isDebug) {
      const originalLog = console.log;
      const originalError = console.error;
      const formatArgs = (args) => args.map(a => typeof a === 'object' ? JSON.stringify(maskSensitiveData(a), null, 2) : a).join(' ');

      console.log = (...args) => { setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'INFO', msg: formatArgs(args) }]); originalLog(...args); };
      console.error = (...args) => { setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'ERROR', msg: formatArgs(args) }]); originalError(...args); };

      console.log("Logged Mode Active. Sanitization layer initialized.");
      return () => { console.log = originalLog; console.error = originalError; };
    }
  }, [currentUser?.isDebug]);

  useEffect(() => { if (currentUser?.darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [currentUser?.darkMode]);
  useEffect(() => { if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // --- FIREBASE DATA SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { console.error("Auth Fail:", err.message); }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const unsubTeams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), (snap) => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubRoles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'roles'), (snap) => setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubTeams(); unsubRoles(); unsubMembers(); };
    });
    return () => unsubAuth();
  }, []);

  // --- VIRTUAL ROLE INJECTION & PERMS ---
  const currentUserRole = useMemo(() => {
    if (currentUser?.id === 'superadmin') {
      return { id: 'superadmin_virtual', name: 'System Owner', scope: 'ALL', permissions: AVAILABLE_PERMISSIONS.map(p => p.id), customPerms: AVAILABLE_PERMISSIONS.map(p => p.id) };
    }
    return roles.find(r => r.id === currentUser?.roleId);
  }, [roles, currentUser]);

  const hasPerm = (permId) => currentUser?.id === 'superadmin' || currentUserRole?.permissions?.includes('ADMINISTRATOR') || currentUserRole?.permissions?.includes(permId) || currentUser?.customPerms?.includes(permId);
  const isGlobalAdmin = currentUser?.isSystemAdmin || hasPerm('ADMINISTRATOR') || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // --- AUTH HANDLERS ---
  const handleDiscordLogin = async () => {
    const provider = new OAuthProvider('oidc.discord');
    try {
      const result = await signInWithPopup(auth, provider);
      const discordUID = result.user.providerData[0].uid;
      
      if (discordUID === YOUR_DISCORD_ID) {
        setCurrentUser({ id: 'superadmin', name: 'System Owner', isSystemAdmin: true, status: 'active', darkMode: true, isDebug: false });
        return;
      }
      const match = members.find(m => m.discordId === discordUID && m.status === 'active');
      if (match) setCurrentUser(match);
      else { alert("Access Denied."); await auth.signOut(); }
    } catch (error) { alert(`Login Failed: ${error.message}`); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (authForm.password === MASTER_ADMIN_PASSWORD) {
      setCurrentUser({ id: 'superadmin', name: 'System Owner', isSystemAdmin: true, status: 'active', darkMode: true, isDebug: false });
      return;
    }
    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user && user.status === 'active') setCurrentUser(user);
    else alert("Invalid credentials or account pending.");
  };

  const handleLinkAndSubmit = async (e) => {
    e.preventDefault();
    const provider = new OAuthProvider('oidc.discord');
    try {
      const result = await signInWithPopup(auth, provider);
      const verifiedUID = result.user.providerData[0].uid;
      const requestId = `m${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', requestId), {
        ...authForm, id: requestId, discordId: verifiedUID, status: 'pending', customPerms: [], darkMode: true, isMentor: false
      });
      alert("Application Submitted!"); setAuthView('login');
      setAuthForm({ name: '', cityId: '', discordId: '', password: '', teamId: '', requestedRoleId: '' });
    } catch (error) { alert(error.message); }
  };

  // --- DATA HANDLERS ---
  const handleSaveMember = async (e, mData) => {
    e.preventDefault();
    const id = mData.id || `m${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { ...mData, id, status: 'active' }, { merge: true });
    setMemberModal({ isOpen: false, data: null, teamId: null });
  };

  const handleSaveTeam = async (e, tData) => {
    e.preventDefault();
    const id = tData.id || `t${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teams', id), { ...tData, id }, { merge: true });
    setTeamModal({ isOpen: false, data: null });
  };

  const handleSaveRole = async (e, rData) => {
    e.preventDefault();
    const id = rData.id || `r${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'roles', id), { ...rData, id }, { merge: true });
    setRoleModal({ isOpen: false, data: null });
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Remove Personnel? They will lose all access.")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId));
    if (currentUser?.id === memberId) handleLogout();
  };

  const handleLogout = () => { setCurrentUser(null); setActiveTab('dashboard'); setLogs([]); document.documentElement.classList.remove('dark'); };
  const copyId = (text) => { navigator.clipboard.writeText(text); alert("ID Copied: " + text); };

  // --- RENDER: LOGIN VIEW ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 selection:bg-[#ef4444] selection:text-white">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
          <div className="flex justify-center mb-8">
            <div className="bg-red-600 p-4 rounded-xl text-white shadow-2xl shadow-red-600/20 rotate-3">
              <Crown size={40} strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="text-3xl font-black mb-2 text-white uppercase tracking-tighter">{authView === 'login' ? 'KNG Staff Control' : authView === 'admin_login' ? 'Override' : 'Request'}</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Management Terminal</p>

          <div className="space-y-4">
            {authView === 'login' && (
              <>
                <button onClick={handleDiscordLogin} className="group w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-5 rounded-2xl font-black shadow-lg flex justify-center items-center space-x-3 transition-all active:scale-95 group"><img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="24" alt="" /><span>Login with Discord</span></button>
                <div className="grid grid-cols-2 gap-3"><button onClick={() => setAuthView('request_step1')} className="bg-slate-800 text-slate-200 p-4 rounded-2xl font-bold text-xs border border-slate-700 hover:border-red-500 hover:text-red-400 transition-colors">Request Access</button><button onClick={() => setAuthView('admin_login')} className="bg-slate-800 text-slate-200 p-4 rounded-2xl font-bold text-xs border border-slate-700 hover:border-red-500 hover:text-red-400 transition-colors">Admin Bypass</button></div>
              </>
            )}

            {authView === 'admin_login' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input required className="w-full p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500 transition-all" placeholder="Username" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
                <input required className="w-full p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500 transition-all" type="password" placeholder="Key Phrase" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-5 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all">Authenticate</button>
                <button type="button" onClick={() => setAuthView('login')} className="w-full text-slate-500 text-[10px] font-black uppercase hover:text-white transition-colors">Cancel</button>
              </form>
            )}

            {authView === 'request_step1' && (
              <form onSubmit={(e) => { e.preventDefault(); setAuthView('request_step2'); }} className="space-y-4 text-left">
                <div className="flex space-x-2"><input required className="w-2/3 p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="City Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} /><input required className="w-1/3 p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="ID #" value={authForm.cityId} onChange={e => setAuthForm({...authForm, cityId: e.target.value})} /></div>
                <div className="flex space-x-2">
                  <select required className="w-1/2 p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500" value={authForm.teamId} onChange={e => setAuthForm({...authForm, teamId: e.target.value})}><option value="" disabled>Team...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <select required className="w-1/2 p-5 bg-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500" value={authForm.requestedRoleId} onChange={e => setAuthForm({...authForm, requestedRoleId: e.target.value})}><option value="" disabled>Rank...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-5 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all">Next Step</button>
                <button type="button" onClick={() => setAuthView('login')} className="w-full text-slate-500 text-[10px] font-black uppercase hover:text-white transition-colors">Back</button>
              </form>
            )}

            {authView === 'request_step2' && (
              <div className="space-y-6 text-center animate-fade-in text-left">
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-slate-700 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-white"><MapPin size={48} /></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Summary</p>
                  <h4 className="text-white font-black text-xl">{authForm.name}</h4>
                  <p className="text-red-400 text-xs font-bold font-mono">ID: {authForm.cityId}</p>
                </div>
                <button onClick={handleLinkAndSubmit} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white p-6 rounded-2xl font-black shadow-2xl flex justify-center items-center space-x-4 active:scale-95 transition-all"><img src="https://cdn.prod.website-files.com/6257adef93867e3d0390e21b/6257adef93867e38ca90e22b_Discord-Logo-White.svg" width="28" alt="" /><span className="text-lg">Link & Submit</span></button>
                <button onClick={() => setAuthView('request_step1')} className="text-slate-500 text-[10px] font-black uppercase w-full hover:text-white transition-colors">Edit Information</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MODAL INTERNAL COMPONENTS ---
  const InternalMemberModal = () => {
    if (!memberModal.isOpen) return null;
    const isEdit = !!memberModal.data;
    const [formData, setFormData] = useState(memberModal.data || { name: '', cityId: '', discordId: '', teamId: memberModal.teamId || '', roleId: '', isMentor: false });
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <form onSubmit={(e) => handleSaveMember(e, formData)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md border border-gray-100 dark:border-slate-800 shadow-2xl">
          <h2 className="text-2xl font-black mb-6 dark:text-white uppercase">{isEdit ? 'Edit Personnel' : 'Enlist Member'}</h2>
          <div className="space-y-4 mb-8">
            <input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-red-500" placeholder="City Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-red-500" placeholder="City ID #" value={formData.cityId} onChange={e => setFormData({...formData, cityId: e.target.value})} />
            <input required className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white border border-gray-100 dark:border-slate-700 font-mono text-sm focus:ring-2 focus:ring-red-500" placeholder="Discord User ID" value={formData.discordId} onChange={e => setFormData({...formData, discordId: e.target.value})} />
            <div className="flex space-x-2">
              <select required className="w-1/2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-red-500" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}><option value="" disabled>Assign Team...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select required className="w-1/2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-red-500" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}><option value="" disabled>Assign Rank...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            </div>
            <label className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-red-500 transition-colors">
              <input type="checkbox" checked={formData.isMentor} onChange={e => setFormData({...formData, isMentor: e.target.checked})} className="w-5 h-5 rounded text-red-600 focus:ring-red-500" />
              <span className="font-black dark:text-white flex items-center space-x-2"><Star size={16} className="text-yellow-500 fill-yellow-500"/><span>Designate as Mentor</span></span>
            </label>
          </div>
          <div className="flex space-x-3">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all">Save</button>
            <button type="button" onClick={() => setMemberModal({isOpen:false})} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-4 rounded-2xl font-black transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    );
  };

  const InternalTeamModal = () => {
    if (!teamModal.isOpen) return null;
    const isEdit = !!teamModal.data;
    const [formData, setFormData] = useState(teamModal.data || { name: '', color: '#ef4444' });
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <form onSubmit={(e) => handleSaveTeam(e, formData)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-sm border border-gray-100 dark:border-slate-800 shadow-2xl">
          <h2 className="text-2xl font-black mb-6 dark:text-white uppercase">{isEdit ? 'Edit Team' : 'Create Team'}</h2>
          <div className="space-y-4 mb-8">
            <input required autoFocus className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white focus:ring-2 focus:ring-red-500" placeholder="Division Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-red-500">
               <label className="font-black dark:text-white flex-1 text-sm uppercase">Team Color Identity</label>
               <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
            </div>
          </div>
          <div className="flex space-x-3">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all">Save</button>
            <button type="button" onClick={() => setTeamModal({isOpen:false})} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-4 rounded-2xl font-black transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    );
  };

  const InternalRoleModal = () => {
    if (!roleModal.isOpen) return null;
    const isEdit = !!roleModal.data;
    const [formData, setFormData] = useState(roleModal.data || { name: '', scope: 'TEAM', customPerms: [] });
    const togglePerm = (id) => { const perms = formData.customPerms || []; setFormData({...formData, customPerms: perms.includes(id) ? perms.filter(p => p !== id) : [...perms, id]}); };
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <form onSubmit={(e) => handleSaveRole(e, formData)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-2xl border border-gray-100 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
          <h2 className="text-2xl font-black mb-6 dark:text-white uppercase">{isEdit ? 'Edit Role Policy' : 'Create Role'}</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 mb-6">
            <div className="flex space-x-4">
              <input required className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white focus:ring-2 focus:ring-red-500" placeholder="Role Title (e.g. Moderator)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <select className="w-1/3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white font-black focus:ring-2 focus:ring-red-500 appearance-none" value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})}>
                <option value="TEAM">Team Scope</option><option value="MANAGEMENT">Management Scope</option><option value="ALL">Global Scope</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Assigned Permissions</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {AVAILABLE_PERMISSIONS.map(p => (
                  <label key={p.id} className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.customPerms?.includes(p.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    <input type="checkbox" checked={formData.customPerms?.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded text-red-600 focus:ring-red-500" />
                    <span className="text-xs font-black leading-tight">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all">Save Policy</button>
            <button type="button" onClick={() => setRoleModal({isOpen:false})} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-4 rounded-2xl font-black transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    );
  };

  // --- RENDER: MAIN APP ---
  return (
    <div className="flex h-screen font-sans overflow-hidden bg-[#f8fafc] text-gray-900 dark:bg-[#0B0F19] dark:text-slate-200 transition-colors duration-500 selection:bg-red-500 selection:text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} teams={teams} members={members} currentUser={currentUser} currentUserRole={currentUserRole} isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} handleLogout={handleLogout} toggleDarkMode={handleToggleDarkMode} />
      
      <div className={`flex-1 flex flex-col overflow-hidden ${currentUser.isDebug ? 'pb-64' : ''}`}>
        {isSysAdmin && (
          <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-4 flex justify-end">
            <button onClick={toggleLoggedMode} className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentUser.isDebug ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'}`}>
              {currentUser.isDebug ? <EyeOff size={14}/> : <Eye size={14}/>}<span>{currentUser.isDebug ? 'Disable Logged Mode' : 'Enable Logged Mode'}</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard teams={teams} members={members} setActiveTab={setActiveTab} />}
          {activeTab === 'teams-setup' && <TeamSetupView teams={teams} setTeamModal={setTeamModal} />}
          {activeTab === 'roles' && <RoleManagementView roles={roles} setRoleModal={setRoleModal} />}
          {activeTab === 'requests' && (
             <div className="space-y-8 animate-fade-in">
               <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Access Requests</h2>
               <div className="grid gap-6 mt-8">
                 {members.filter(m => m.status === 'pending').map(req => (
                   <div key={req.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between shadow-sm relative overflow-hidden group hover:border-red-500 transition-colors">
                     <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
                     <div className="flex items-center space-x-6 w-full">
                       <div className="w-20 h-20 bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg shadow-red-600/20">
                         <span className="text-[10px] opacity-70 uppercase tracking-widest">City</span><span className="text-2xl">{req.cityId || '??'}</span>
                       </div>
                       <div className="flex-1">
                         <h4 className="font-black text-2xl text-gray-900 dark:text-white">{req.name}</h4>
                         <div className="flex gap-4 mt-3">
                           <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl">{teams.find(t => t.id === req.teamId)?.name}</span>
                           <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl">{roles.find(r => r.id === req.requestedRoleId)?.name}</span>
                           <span className="text-xs font-mono font-black text-[#5865F2] bg-[#5865F2]/10 px-3 py-2 rounded-xl">ID: {req.discordId}</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex space-x-3 shrink-0 mt-6 lg:mt-0">
                       <button onClick={() => handleSaveMember({ preventDefault: () => {} }, { ...req, status: 'active' })} className="flex items-center justify-center space-x-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg shadow-green-600/20 transition-all active:scale-95"><Check size={20} /><span>Approve</span></button>
                       <button onClick={() => handleDeleteMember(req.id)} className="flex items-center justify-center space-x-2 px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all active:scale-95"><X size={20} /><span>Deny</span></button>
                     </div>
                   </div>
                 ))}
                 {members.filter(m => m.status === 'pending').length === 0 && <div className="p-24 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800"><p className="text-slate-400 font-bold uppercase tracking-widest">No pending requests</p></div>}
               </div>
             </div>
          )}
          {activeTab === 'permissions' && (
             <div className="space-y-8 animate-fade-in">
               <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Global Permissions</h2>
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                 <p className="text-slate-500 mb-6">Select a role to modify its system privileges.</p>
                 <div className="grid gap-4">
                   {roles.map(role => (
                     <div key={role.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700">
                       <h3 className="font-black text-xl dark:text-white flex items-center space-x-2 mb-4"><Shield size={20} className="text-red-500" /><span>{role.name}</span></h3>
                       <div className="flex flex-wrap gap-3">
                         {AVAILABLE_PERMISSIONS.map(perm => {
                           const hasPerm = role.customPerms?.includes(perm.id);
                           return (
                             <button key={perm.id} onClick={() => {
                               const newPerms = hasPerm ? role.customPerms.filter(p => p !== perm.id) : [...(role.customPerms || []), perm.id];
                               handleSaveRole({ preventDefault: () => {} }, { ...role, customPerms: newPerms });
                             }} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${hasPerm ? 'bg-red-50 text-red-600 border-red-500/30 dark:bg-red-900/20 dark:text-red-400' : 'bg-white dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                               {perm.label}
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          )}
          
          {/* DYNAMIC TEAM ROSTERS */}
          {!['dashboard', 'teams-setup', 'roles', 'requests', 'permissions'].includes(activeTab) && (
            <div className="bg-white dark:bg-slate-900 p-8 lg:p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none" style={{ color: teams.find(t=>t.id===activeTab)?.color || '#ef4444' }}><Users size={200} /></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 relative z-10 gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 rounded-xl text-white shadow-lg" style={{ backgroundColor: teams.find(t=>t.id===activeTab)?.color || '#ef4444' }}><Users size={20} /></div>
                    <h2 className="text-4xl font-black tracking-tighter dark:text-white uppercase">{teams.find(t=>t.id===activeTab)?.name}</h2>
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 font-medium ml-1">Live personnel management for this division.</p>
                </div>
                <button onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })} className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-red-600/20 transition-all flex items-center space-x-3 active:scale-95"><Plus size={24} strokeWidth={3} /><span>Enlist Member</span></button>
              </div>

              <div className="grid gap-6 relative z-10">
                {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                  <div key={member.id} className="flex flex-col lg:flex-row justify-between items-center p-6 bg-gray-50/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/50 group hover:border-red-400 dark:hover:border-red-500 transition-all duration-300">
                    <div className="flex items-center space-x-6 w-full">
                      <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-2xl border border-gray-100 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-105" style={{ color: teams.find(t=>t.id===activeTab)?.color || '#ef4444' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="font-black text-xl text-gray-900 dark:text-white flex items-center space-x-2">
                            <span>{member.name}</span>
                            {member.isMentor && <Star size={18} className="text-yellow-500 fill-yellow-500" title="Mentor" />}
                          </h4>
                          <span className="flex items-center space-x-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm"><MapPin size={12}/><span>City ID: {member.cityId || '000'}</span></span>
                          <span className="text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-[0.2em] shadow-lg" style={{ backgroundColor: teams.find(t=>t.id===activeTab)?.color || '#ef4444' }}>{roles.find(r => r.id === member.roleId)?.name || 'UNRANKED'}</span>
                        </div>
                        <div className="flex items-center space-x-3 mt-3">
                          <div className="px-3 py-2 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl text-[11px] font-mono text-[#5865F2] dark:text-[#5865F2] font-black tracking-tight">{member.discordId}</div>
                          <button onClick={() => copyId(member.discordId)} className="text-slate-400 hover:text-[#5865F2] dark:hover:text-[#5865F2] transition-colors p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm" title="Copy Unique ID"><Copy size={16}/></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-6 lg:mt-0 w-full lg:w-auto justify-end">
                      <button onClick={() => setMemberModal({ isOpen: true, data: member, teamId: activeTab })} className="p-4 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all"><Edit size={20} /></button>
                      <button onClick={() => handleDeleteMember(member.id)} className="p-4 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all"><Trash2 size={20} /></button>
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
            <div className="flex items-center space-x-3"><Terminal size={18} strokeWidth={3} /> <span>CORE_SYSTEM_DEBUG_v5.0</span></div>
            <div className="flex items-center space-x-6">
               <button onClick={() => setLogs([])} className="hover:underline">FLUSH_LOGS</button>
               <button onClick={toggleLoggedMode} className="bg-white/20 px-2 py-1 rounded hover:bg-white/40 transition-colors uppercase font-black text-[9px]">Terminate Session</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-[11px] space-y-2 selection:bg-green-500 selection:text-black">
            {logs.map((log, i) => (
              <div key={i} className="animate-fade-in border-l-2 border-slate-800 pl-3">
                <span className="opacity-40 font-bold">[{log.time}]</span> 
                <span className={`ml-2 font-black ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARN' ? 'text-yellow-500' : 'text-green-500'}`}>{log.type} //</span> 
                <span className="ml-2 text-slate-300">{log.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* RENDER ACTIVE MODAL */}
      <InternalMemberModal />
      <InternalTeamModal />
      <InternalRoleModal />
    </div>
  );
}