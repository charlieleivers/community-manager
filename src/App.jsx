import React, { useState, useMemo } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

// ... inside your App component ...
useEffect(() => {
  const initAuth = async () => {
    await signInAnonymously(auth);
  };
  initAuth();

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      // Set up listeners for Teams and Members
      const teamsRef = collection(db, 'artifacts', 'community-manager', 'public', 'data', 'teams');
      onSnapshot(teamsRef, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeams(teamsData.length > 0 ? teamsData : initialTeams);
      });
    }
  });

  return () => unsubscribeAuth();
}, []);
// 1. ALL IMPORTS (Matches your VS Code folder structure)
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import TeamSetup from './views/TeamSetup';
import RoleManagement from './views/RoleManagement';
import AccessRequests from './views/AccessRequests';
import PermissionsManager from './views/PermissionsManager';
import MemberModal from './modals/MemberModal';

// --- INITIAL SEED DATA ---
const initialTeams = [
  { id: 't1', name: 'Server Management', color: '#8b5cf6', isMgmt: true },
  { id: 't2', name: 'Moderation', color: '#ef4444', isMgmt: false },
  { id: 't3', name: 'Event Planning', color: '#10b981', isMgmt: false }
];

const initialRoles = [
  { id: 'r1', name: 'Owner', scope: 'MANAGEMENT', teamIds: ['t1'], level: 1, customPerms: [] },
  { id: 'r2', name: 'Head Admin', scope: 'MANAGEMENT', teamIds: ['t1', 't2', 't3'], level: 2, customPerms: [] },
  { id: 'r3', name: 'Team Lead', scope: 'ALL', teamIds: [], level: 3, customPerms: [] },
  { id: 'r4', name: 'Senior Moderator', scope: 'TEAM', teamIds: ['t2'], level: 4, customPerms: [] },
  { id: 'r5', name: 'Moderator', scope: 'TEAM', teamIds: ['t2'], level: 5, customPerms: [] },
  { id: 'r6', name: 'Event Coordinator', scope: 'TEAM', teamIds: ['t3'], level: 6, customPerms: [] },
  { id: 'r_pending', name: 'Pending Access', scope: 'TEAM', teamIds: [], level: 99, customPerms: [] },
];

const initialMembers = [
  { id: 'm0', name: 'System Admin', discordId: 'admin', password: 'admin', status: 'active', isSystemAdmin: true, roleId: 'r1', teamId: 't1', customPerms: [] },
  { id: 'm1', name: 'Alice', discordId: 'alice#0001', teamId: 't1', roleId: 'r1', isMentor: true, password: 'password', status: 'active', darkMode: false, customPerms: [] },
  { id: 'm2', name: 'Bob', discordId: 'bob#0002', teamId: 't2', roleId: 'r3', isMentor: true, password: 'password', status: 'active', darkMode: false, customPerms: [] },
  { id: 'm3', name: 'Charlie', discordId: 'charlie#0003', teamId: 't2', roleId: 'r5', isMentor: false, password: 'password', status: 'active', darkMode: true, customPerms: [] },
  { id: 'm4', name: 'Diana', discordId: 'diana#0004', teamId: 't3', roleId: 'r6', isMentor: false, password: 'password', status: 'active', darkMode: false, customPerms: [] },
];

export default function App() {
  // --- STATE ---
  const [teams, setTeams] = useState(initialTeams);
  const [roles, setRoles] = useState(initialRoles);
  const [members, setMembers] = useState(initialMembers);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [currentUser, setCurrentUser] = useState(null); 
  const [authView, setAuthView] = useState('login'); // 'login' or 'request'
  const [authForm, setAuthForm] = useState({ name: '', discordId: '', password: '', teamId: 't1' });
  const [memberModal, setMemberModal] = useState({ isOpen: false, data: null, teamId: null });

  // --- EXPANDED PERMISSIONS DEFINITIONS ---
  const AVAILABLE_PERMISSIONS = [
    { id: 'MANAGE_TEAMS', label: 'Team Architecture (Merge/Split/Create)' },
    { id: 'MANAGE_ROLES', label: 'Role Hierarchy & Levels' },
    { id: 'REVIEW_REQUESTS', label: 'Approve/Deny Pending Members' },
    { id: 'MANAGE_USERS', label: 'User Overrides & Role Assignment' },
    { id: 'MANAGE_MENTORS', label: 'Assign Mentor Badges' },
    { id: 'VIEW_AUDIT_LOGS', label: 'View System Audit Logs' },
    { id: 'BROADCAST_ANNOUNCE', label: 'Send System-wide Announcements' },
    { id: 'EXPORT_DATA', label: 'Export Community Reports' },
    { id: 'SYSTEM_SETTINGS', label: 'Modify Global System Config' }
  ];

  // --- PERMISSIONS HELPERS ---
  const currentUserRole = useMemo(() => {
    return roles.find(r => r.id === currentUser?.roleId);
  }, [roles, currentUser]);

  const isGlobalAdmin = currentUser?.isSystemAdmin || currentUserRole?.scope === 'MANAGEMENT' || currentUserRole?.scope === 'ALL';
  const isSysAdmin = currentUser?.isSystemAdmin;

  // Granular check function
  const hasPermission = (permId) => {
    if (isSysAdmin) return true;
    const rolePerms = currentUserRole?.customPerms || [];
    const userPerms = currentUser?.customPerms || [];
    return rolePerms.includes(permId) || userPerms.includes(permId);
  };

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    const user = members.find(m => m.discordId === authForm.discordId && m.password === authForm.password);
    if (user) {
      if (user.status === 'active') {
        setCurrentUser(user);
      } else {
        alert("Your access request is still pending approval.");
      }
    } else {
      alert("Invalid credentials. (Hint: Try admin / admin)");
    }
  };

  const handleRequestAccess = (e) => {
    e.preventDefault();
    const newRequest = {
      ...authForm,
      id: `m${Date.now()}`,
      status: 'pending',
      roleId: 'r_pending',
      isMentor: false,
      darkMode: false,
      isSystemAdmin: false,
      customPerms: []
    };
    setMembers([...members, newRequest]);
    alert("Request submitted! Please wait for an admin to approve you.");
    setAuthView('login');
  };

  const handleSaveMember = (memberData) => {
    if (memberData.id) {
      setMembers(members.map(m => m.id === memberData.id ? memberData : m));
    } else {
      setMembers([...members, { ...memberData, id: `m${Date.now()}`, customPerms: [] }]);
    }
    setMemberModal({ isOpen: false, data: null, teamId: null });
  };

  // REFINEMENT: Automatic access removal.
  // Deleting a user or setting them as inactive effectively revokes access during login/session.
  const handleDeleteMember = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    
    // Safety check: If the deleted user is the one currently logged in, force a logout immediately
    if (currentUser?.id === id) {
      handleLogout();
      alert("Your access has been revoked.");
    }
  };

  const togglePermission = (targetId, permId) => {
    // Check if target is a role
    setRoles(prev => prev.map(r => {
      if (r.id === targetId) {
        const perms = r.customPerms || [];
        return { ...r, customPerms: perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId] };
      }
      return r;
    }));
    // Check if target is a member
    setMembers(prev => prev.map(m => {
      if (m.id === targetId) {
        const perms = m.customPerms || [];
        return { ...m, customPerms: perms.includes(permId) ? perms.filter(p => p !== permId) : [...perms, permId] };
      }
      return m;
    }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const toggleDarkMode = () => {
    setCurrentUser(prev => prev ? ({ ...prev, darkMode: !prev.darkMode }) : null);
  };

  // --- RENDER LOGIC ---

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-900">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">CommUnity</h1>
            <p className="text-gray-500 mt-2">
              {authView === 'login' ? 'Secure dashboard for community staff' : 'Request membership to get started'}
            </p>
          </div>

          <form onSubmit={authView === 'login' ? handleLogin : handleRequestAccess} className="space-y-4">
            {authView === 'request' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Full Name</label>
                <input required type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" 
                  value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Discord ID</label>
              <input required type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Username#0000" 
                value={authForm.discordId} onChange={e => setAuthForm({...authForm, discordId: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Password</label>
              <input required type="password" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" 
                value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition-all shadow-lg shadow-blue-100">
              {authView === 'login' ? 'Enter System' : 'Submit Request'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setAuthView(authView === 'login' ? 'request' : 'login')} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
              {authView === 'login' ? "Need access? Request membership" : "Already registered? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-[#f8fafc] font-sans text-gray-900 overflow-hidden ${currentUser?.darkMode ? 'dark-mode-override' : ''}`}>
      
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        teams={teams} members={members}
        currentUser={currentUser} currentUserRole={currentUserRole} 
        isGlobalAdmin={isGlobalAdmin} isSysAdmin={isSysAdmin} 
        handleLogout={handleLogout} toggleDarkMode={toggleDarkMode} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          
          {activeTab === 'dashboard' && (
            <Dashboard teams={teams} members={members} setActiveTab={setActiveTab} />
          )}

          {activeTab === 'teams-setup' && (
            <TeamSetup teams={teams} />
          )}

          {activeTab === 'roles' && (
            <RoleManagement roles={roles} />
          )}

          {activeTab === 'requests' && (
            <AccessRequests 
              members={members} 
              handleApprove={(id, roleId) => setMembers(members.map(m => m.id === id ? {...m, status: 'active', roleId: roleId} : m))}
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

          {/* Fallback for individual team views */}
          {!['dashboard', 'teams-setup', 'roles', 'requests', 'permissions'].includes(activeTab) && (
            <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Team: {teams.find(t => t.id === activeTab)?.name}</h2>
                  <button 
                    onClick={() => setMemberModal({ isOpen: true, data: null, teamId: activeTab })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Add Member
                  </button>
               </div>
               <p className="text-gray-500">Member listings and team-specific management will appear here.</p>
               
               {/* Example of automatic removal logic in action */}
               <div className="mt-8 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">Team Members</p>
                  {members.filter(m => m.teamId === activeTab && m.status === 'active').map(member => (
                    <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-medium">{member.name}</span>
                      <button 
                        onClick={() => handleDeleteMember(member.id)} 
                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                      >
                        Remove Access
                      </button>
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