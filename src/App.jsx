import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Shield, Settings, LayoutDashboard, Plus, 
  Trash2, Edit, ChevronUp, ChevronDown, Star,
  MoveRight, Scissors, Merge, Check, X,
  AlertCircle, Lock, Key, LogOut, UserCheck, Moon, Sun, Sliders
} from 'lucide-react';

// FIREBASE IMPORTS
import { db, auth } from './firebase';
import { 
  collection, onSnapshot, doc, setDoc, deleteDoc, 
  query, where 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// FRAGMENTED IMPORTS (Ensure these exist in your local project)
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
  const [authView, setAuthView] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', discordId: '', password: '', teamId: 't1' });
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });

  const appId = "community-manager"; // Used for our strict path rules

  // --- REFINED PERMISSIONS DEFINITIONS ---
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

  // --- DATABASE SYNC (The "Plumbing") ---
  useEffect(() => {
    // 1. Auth First
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed", err);
      }
    };
    initAuth();

    // 2. Setup Listeners (Strict Path Rule)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // Listen for Teams
      const teamsRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
      const unsubTeams = onSnapshot(teamsRef, (snap) => {
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Teams listener failed", err));

      // Listen for Roles
      const rolesRef = collection(db, 'artifacts', appId, 'public', 'data', 'roles');
      const unsubRoles = onSnapshot(rolesRef, (snap) => {
        setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Roles listener failed", err));

      // Listen for Members
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

  // --- PERMISSIONS HELPERS ---
  const currentUserRole = useMemo(() => {
    return roles.find(r => r.id === currentUser?.roleId);
  }, [roles, currentUser]);

  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  const hasPermission = (permId) => {
    if (isSysAdmin) return true;
    const rolePerms = currentUserRole?.customPerms || [];
    const userPerms = currentUser?.customPerms || [];
    return rolePerms.includes(permId) || userPerms.includes(permId);
  };

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    // Special check for Master Admin
    if (authForm.discordId === 'admin' && authForm.password === MASTER_ADMIN_PASSWORD) {
      setCurrentUser({ id: 'superadmin', name: 'System Admin', isSystemAdmin: true, status: 'active' });
      return;
    }

    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user) {
      if (user.status === 'active') {
        setCurrentUser(user);
      } else {
        alert("Access pending approval.");
      }
    } else {
      alert("Invalid credentials.");
    }
  };

  const handleSaveMember = async (memberData) => {
    const id = memberData.id || `m${Date.now()}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
    await setDoc(docRef, { ...memberData, id, status: memberData.status || 'active' }, { merge: true });
    setMemberModal({ isOpen: false, data: null, teamId: null });
  };

  // REFINED: AUTOMATIC ACCESS REMOVAL LOGIC
  const handleDeleteMember = async (memberId) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId);
    
    // In Firestore, deleting the document revokes all access because our listeners 
    // will update the local state immediately, and future logins will fail.
    await deleteDoc(docRef);
    
    // If the person being deleted is the person currently using the app, boot them.
    if (currentUser?.id === memberId) {
      handleLogout();
      alert("Your access has been revoked by a system administrator.");
    }
  };

  const togglePermission = async (targetId, permId) => {
    // Determine if we are updating a role or a member
    const isRole = roles.find(r => r.id === targetId);
    const collectionName = isRole ? 'roles' : 'members';
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, targetId);
    
    const targetData = isRole ? roles.find(r => r.id === targetId) : members.find(m => m.id === targetId);
    const perms = targetData?.customPerms || [];
    const newPerms = perms.includes(permId) 
      ? perms.filter(p => p !== permId) 
      : [...perms, permId];

    await setDoc(docRef, { customPerms: newPerms }, { merge: true });
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
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 tracking-tight">CommUnity Manager</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Discord ID</label>
              <input 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                placeholder="charlie#1234" 
                value={authForm.discordId} 
                onChange={e => setAuthForm({...authForm, discordId: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
              <input 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                type="password" 
                placeholder="••••••••" 
                value={authForm.password} 
                onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all">
              Enter System
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
    <div className={`flex h-screen bg-[#f8fafc] font-sans text-gray-900 overflow-hidden ${currentUser.darkMode ? 'dark-mode' : ''}`}>
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        teams={teams} members={members}
        currentUser={currentUser} currentUserRole={currentUserRole} 
        isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} 
        handleLogout={handleLogout} toggleDarkMode={() => setCurrentUser({...currentUser, darkMode: !currentUser.darkMode})} 
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              teams={teams} 
              members={members} 
              setActiveTab={setActiveTab} 
            />
          )}
          
          {activeTab === 'teams-setup' && (
            <TeamSetup 
              teams={teams} 
              setTeams={setTeams} 
            />
          )}

          {activeTab === 'roles' && (
            <RoleManagement 
              roles={roles} 
              setRoles={setRoles} 
            />
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
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800">{teams.find(t=>t.id===activeTab)?.name}</h2>
                    <p className="text-gray-500 mt-1">Manage personnel and oversight for this division.</p>
                  </div>
                  <button 
                    onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all"
                  >
                    <Plus size={20} /> <span>Add Member</span>
                  </button>
                </div>

                <div className="grid gap-4">
                  {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                    <div key={member.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 border border-gray-100">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{member.name}</h4>
                          <p className="text-xs text-gray-500 font-mono">{member.discordId}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setMemberModal({ isOpen: true, data: member, teamId: activeTab })}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm(`Are you sure you want to remove ${member.name}? Their system access will be instantly revoked.`)) {
                              handleDeleteMember(member.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all"
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
    </div>
  );
}