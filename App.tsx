import React, { useState, useEffect } from 'react';
import { SkillMode, UserStats } from './types';
import Dashboard from './components/Dashboard';
import SpeakingPractice from './components/SpeakingPractice';
import WritingPractice from './components/WritingPractice';
import LoginScreen from './components/LoginScreen';
import { Button } from './components/Components';
import { setApiKey } from './services/geminiService';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SkillMode>(SkillMode.DASHBOARD);
  
  // User Progress State
  const [stats, setStats] = useState<UserStats>({
    speakingScore: [],
    writingScore: [],
    lessonsCompleted: 0,
    streak: 1,
    lastPractice: new Date().toISOString()
  });

  // Load User on Mount
  useEffect(() => {
    const savedUser = localStorage.getItem('lingua_current_user');
    const savedKey = localStorage.getItem('lingua_api_key');
    if (savedUser && savedKey) {
        setApiKey(savedKey);
        handleLogin(savedUser, savedKey);
    }
  }, []);

  const handleLogin = (name: string, key: string) => {
      setCurrentUser(name);
      localStorage.setItem('lingua_current_user', name);
      
      // Save API key
      setApiKey(key);
      localStorage.setItem('lingua_api_key', key);
      
      // Load stats for this specific user
      const userStatsKey = `lingua_stats_${name.replace(/\s+/g, '_')}`;
      const storedStats = localStorage.getItem(userStatsKey);
      
      if (storedStats) {
        setStats(JSON.parse(storedStats));
      } else {
        // Reset stats for new user
        setStats({
            speakingScore: [],
            writingScore: [],
            lessonsCompleted: 0,
            streak: 1,
            lastPractice: new Date().toISOString()
        });
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('lingua_current_user');
      // We do not remove API Key here by default so other students on the same device don't have to re-enter it,
      // but strictly speaking, for security in a shared environment, you might want to remove it.
      // For this school app context, assuming devices might be shared or personal, keeping it is usually better UX.
      setStats({
        speakingScore: [],
        writingScore: [],
        lessonsCompleted: 0,
        streak: 1,
        lastPractice: new Date().toISOString()
      });
      setActiveTab(SkillMode.DASHBOARD);
  };

  // Update Stats Helper
  const updateStats = (score: number, mode: 'speaking' | 'writing') => {
    if (!currentUser) return;

    const newStats = { ...stats };
    if (mode === 'speaking') {
      newStats.speakingScore = [...newStats.speakingScore, score];
    } else {
      newStats.writingScore = [...newStats.writingScore, score];
    }
    newStats.lessonsCompleted += 1;
    newStats.lastPractice = new Date().toISOString();
    
    setStats(newStats);
    
    // Save to specific user key
    const userStatsKey = `lingua_stats_${currentUser.replace(/\s+/g, '_')}`;
    localStorage.setItem(userStatsKey, JSON.stringify(newStats));
  };

  // Navigation Items
  const navItems = [
    { id: SkillMode.DASHBOARD, label: 'Overview', icon: 'fa-chart-pie' },
    { id: SkillMode.SPEAKING, label: 'Speaking', icon: 'fa-microphone' },
    { id: SkillMode.WRITING, label: 'Writing', icon: 'fa-pen-nib' },
  ];

  // --- RENDER LOGIN IF NO USER ---
  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  // --- MAIN APP UI ---
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-80 bg-white/80 backdrop-blur-xl border-r border-white/50 flex-shrink-0 sticky top-0 md:h-screen z-20 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.03)]">
        <div className="p-8 flex items-center gap-4 border-b border-gray-100/50">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transform hover:scale-110 transition-transform">
              <i className="fas fa-shapes text-2xl"></i>
           </div>
           <div>
              <h1 className="font-extrabold text-2xl tracking-tight text-gray-900 leading-none">Lingua<span className="text-blue-600">AI</span></h1>
              <p className="text-sm text-gray-400 font-semibold tracking-wide mt-1">English Mastery</p>
           </div>
        </div>

        <div className="px-8 py-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-xl shadow-sm ring-2 ring-white">
                    {currentUser.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-0.5">Student</p>
                    <p className="font-bold text-lg text-gray-900 truncate">{currentUser}</p>
                </div>
            </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 overflow-y-auto py-2">
          {navItems.map((item) => (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all duration-300 font-bold text-lg group ${
                   activeTab === item.id 
                   ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                   : 'text-gray-500 hover:bg-white hover:shadow-md hover:text-blue-600'
                }`}
             >
                <i className={`fas ${item.icon} w-8 text-center text-xl transition-transform group-hover:scale-110`}></i>
                {item.label}
                {activeTab === item.id && <i className="fas fa-chevron-right ml-auto text-sm opacity-50"></i>}
             </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100/50">
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors font-bold text-lg"
            >
                <i className="fas fa-sign-out-alt w-8 text-center text-xl"></i>
                Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar">
        <div className="max-w-7xl mx-auto p-6 md:p-12 flex flex-col min-h-full">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
             <div>
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                   {navItems.find(n => n.id === activeTab)?.label}
                </h2>
                <p className="text-gray-500 text-lg mt-2">Welcome back, <span className="font-bold text-blue-600">{currentUser}</span>! Ready to learn?</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="px-5 py-2.5 bg-white rounded-full border border-gray-200 shadow-sm flex items-center gap-3">
                   <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                   <span className="text-sm font-bold text-gray-700">Gemini 2.0 Connected</span>
                </div>
             </div>
          </header>

          {/* Content Area */}
          <div className="animate-fade-in-up pb-10 flex-1">
             {activeTab === SkillMode.DASHBOARD && <Dashboard stats={stats} />}
             {activeTab === SkillMode.SPEAKING && (
                <SpeakingPractice 
                   onComplete={(score) => updateStats(score, 'speaking')} 
                   studentName={currentUser}
                />
             )}
             {activeTab === SkillMode.WRITING && (
                <WritingPractice 
                   onComplete={(score) => updateStats(score, 'writing')}
                   studentName={currentUser}
                />
             )}
          </div>
          
          {/* Footer */}
          <footer className="py-6 text-center text-orange-600 text-xs font-bold uppercase tracking-widest border-t border-gray-100/50 mt-auto">
             DEVELOPED BY TEACHER VO THI THU HA - TRAN HUNG DAO HIGH SCHOOL - LAM DONG
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;