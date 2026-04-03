import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders
} from 'lucide-react';

// FIXED: Using the new filename to bypass Vercel caching issues
import { auth, db } from './firebase-config.js';
import { 
  collection, onSnapshot, doc, setDoc, deleteDoc, 
  query, where 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// FRAGMENTED IMPORTS
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import TeamSetup from './views/TeamSetup';
import RoleManagement from './views/RoleManagement';
import AccessRequests from './views/AccessRequests';
import PermissionsManager from './views/PermissionsManager';
import MemberModal from './modals/MemberModal';

const MASTER_ADMIN_PASSWORD = "admin"; 

export default function App() {
  // --- STATE ---
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // login or request
  const [authForm, setAuthForm] = useState({ name: '', discordId: '', password: '', teamId: 't1' });
  
  // Modal States
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });
  const [teamModal, setTeamModal] = useState({ isOpen: false, data: null });
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });

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

  // --- DATABASE SYNC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed", err);
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const teamsRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
      const unsubTeams = onSnapshot(teamsRef, (snap) => {
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Teams listener failed", err));

      const rolesRef = collection(db, 'artifacts', appId, 'public', 'data', 'roles');
      const unsubRoles = onSnapshot(rolesRef, (snap) => {
        setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Roles listener failed", err));

      const membersRef = collection(db, 'artifacts', appId, 'public', 'data', 'members');
      const unsubMembers = onSnapshot(membersRef, (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Members listener failed", err));

      return () => {
        unsubTeams();
        unsubRoles();
        unsubMembers();
      };
    });

    return () => unsubAuth();
  }, []);

  const currentUserRole = useMemo(() => roles.find(r => r.id === currentUser?.roleId), [roles, currentUser]);
  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (authForm.discordId === 'admin' && authForm.password === MASTER_ADMIN_PASSWORD) {
      setCurrentUser({ id: 'superadmin', name: 'System Admin', isSystemAdmin: true, status: 'active', darkMode: false });
      return;
    }

    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user && user.status === 'active') {
      setCurrentUser(user);
    } else if (user && user.status === 'pending') {
      alert("Your access request is still pending approval.");
    } else {
      alert("Invalid credentials.");
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    const id = `m${Date.now()}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
    await setDoc(docRef, { 
      ...authForm, 
      id, 
      status: 'pending', 
      roleId: 'r_pending', 
      customPerms: [], 
      darkMode: false 
    });
    alert("Request submitted! Please wait for an admin to approve you.");
    setAuthView('login');
  };

  const handleSaveMember = async (memberData) => {
    const id = memberData.id || `m${Date.now()}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
    await setDoc(docRef, { ...memberData, id, status: memberData.status || 'active' }, { merge: true });
    setMemberModal({ isOpen: false, data: null, teamId: null });
  };

  const handleDeleteMember = async (memberId) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId);
    await deleteDoc(docRef);
    if (currentUser?.id === memberId) handleLogout();
  };

  const togglePermission = async (targetId, permId) => {
    const isRole = roles.find(r => r.id === targetId);
    const collectionName = isRole ? 'roles' : 'members';
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, targetId);
    
    const targetData = isRole ? roles.find(r => r.id === targetId) : members.find(m => m.id === targetId);
    const perms = targetData?.customPerms || [];
    const newPerms = perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId];

    await setDoc(docRef, { customPerms: newPerms }, { merge: true });
  };

  const handleToggleDarkMode = async () => {
    const newState = !currentUser.darkMode;
    setCurrentUser({ ...currentUser, darkMode: newState });
    
    if (currentUser.id !== 'superadmin') {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', currentUser.id);
      await setDoc(docRef, { darkMode: newState }, { merge: true });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // --- RENDER LOGIC ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 tracking-tight">
            {authView === 'login' ? 'CommUnity Manager' : 'Join Management'}
          </h2>
          <form onSubmit={authView === 'login' ? handleLogin : handleRequestAccess} className="space-y-4">
            {authView === 'request' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Discord ID</label>
              <input required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="charlie#1234" value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
              <input required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg transition-all">
              {authView === 'login' ? 'Enter System' : 'Submit Request'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setAuthView(authView === 'login' ? 'request' : 'login')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              {authView === 'login' ? "Request Management Access" : "Back to Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${currentUser.darkMode ? 'dark bg-gray-950 text-white' : 'bg-[#f8fafc] text-gray-900'}`}>
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        teams={teams} members={members}
        currentUser={currentUser} currentUserRole={currentUserRole} 
        isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} 
        handleLogout={handleLogout} toggleDarkMode={handleToggleDarkMode} 
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard teams={teams} members={members} setActiveTab={setActiveTab} />}
          
          {activeTab === 'teams-setup' && (
            <TeamSetup teams={teams} setTeams={setTeams} setTeamModal={setTeamModal} />
          )}

          {activeTab === 'roles' && (
            <RoleManagement roles={roles} setRoles={setRoles} setRoleModal={setRoleModal} />
          )}

          {activeTab === 'requests' && (
            <AccessRequests 
              members={members} 
              handleApprove={(id, rid) => handleSaveMember({...members.find(m=>m.id===id), status: 'active', roleId: rid})} 
              handleDeny={handleDeleteMember} 
            />
          )}

          {activeTab === 'permissions' && (
            <PermissionsManager 
              roles={roles} 
              members={members} 
              isSysAdmin={isSysAdmin} 
              togglePermission={togglePermission} 
              availablePermissions={AVAILABLE_PERMISSIONS} 
            />
          )}

          {/* Individual Team View Controller */}
          {!['dashboard', 'teams-setup', 'roles', 'requests', 'permissions'].includes(activeTab) && (
             <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white">{teams.find(t=>t.id===activeTab)?.name}</h2>
                    <p className="text-gray-500 mt-1">Manage personnel and oversight for this division.</p>
                  </div>
                  <button 
                    onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg transition-all"
                  >
                    <Plus size={20} /> <span>Add Member</span>
                  </button>
                </div>

                <div className="grid gap-4">
                  {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                    <div key={member.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 group hover:border-blue-200 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-blue-600 border border-gray-100 dark:border-gray-600">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-white">{member.name}</h4>
                          <p className="text-xs text-gray-500 font-mono">{member.discordId}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setMemberModal({ isOpen: true, data: member, teamId: activeTab })}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm(`Are you sure you want to remove ${member.name}? Their system access will be instantly revoked.`)) {
                              handleDeleteMember(member.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </div>

      <MemberModal 
        memberModal={memberModal} 
        setMemberModal={setMemberModal} 
        teams={teams} 
        roles={roles} 
        handleSaveMember={handleSaveMember} 
        currentUser={currentUser} 
      />

      {/* Modal Placeholders */}
      {teamModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Team</h3>
            <p className="text-gray-500 mb-6 text-sm">Team creation modal content goes here.</p>
            <button onClick={()=>setTeamModal({isOpen:false})} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-xl font-bold dark:text-white">Close</button>
          </div>
        </div>
      )}
      {roleModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Role</h3>
            <p className="text-gray-500 mb-6 text-sm">Role creation modal content goes here.</p>
            <button onClick={()=>setRoleModal({isOpen:false})} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-xl font-bold dark:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}