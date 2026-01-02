import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppView, Sitting, SittingStatus, AgendaItem } from './types';
import { Icons } from './constants';
import { processSittingDocuments } from './services/gemini';
import { authApi, apiClient } from './services/api';
import type { ApiError } from './services/api';

// Mock Initial Data
const INITIAL_SITTINGS: Sitting[] = [
  {
    id: 's1',
    assembly: '10th Parliament',
    session: '2nd Session',
    date: '2024-05-15',
    time: '14:30',
    status: SittingStatus.OFFICIAL,
    agendaItems: [
      { id: 'a1', number: 1, title: 'Communication from the Chair', content: 'Details of official communications...' },
      { id: 'a2', number: 2, title: 'Messages from the President', content: 'A message regarding the appointment of judges...' }
    ],
    bills: [{ id: 'b1', title: 'The Appropriation Bill (No. 2) 2024', stage: 'First Reading' }],
    summaryText: 'The sitting focused on executive appointments and the first reading of the 2024 budget adjustment bill.'
  },
  {
    id: 's2',
    assembly: '10th Parliament',
    session: '2nd Session',
    date: '2024-05-14',
    time: '10:00',
    status: SittingStatus.OFFICIAL,
    agendaItems: [{ id: 'a3', number: 1, title: 'Opening Prayers', content: 'Routine opening.' }],
    bills: [],
    summaryText: 'Routine morning sitting with minimal legislative business.'
  }
];

type SortField = 'date' | 'assembly' | 'session';
type SortOrder = 'asc' | 'desc';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [sittings, setSittings] = useState<Sitting[]>(INITIAL_SITTINGS);
  const [activeDraft, setActiveDraft] = useState<Partial<Sitting>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [editingAgendaId, setEditingAgendaId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New Entry specific state
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          await authApi.getCurrentUser();
          setIsLoggedIn(true);
        } catch (error) {
          // Token is invalid, clear it
          apiClient.setToken(null);
          setIsLoggedIn(false);
        }
      }
      setIsLoadingAuth(false);
    };
    checkAuth();
  }, []);

  // Session filters
  const [filterParliament, setFilterParliament] = useState('All');
  const [filterSession, setFilterSession] = useState('All');
  const [sessionSortField, setSessionSortField] = useState<SortField>('date');
  const [sessionSortOrder, setSessionSortOrder] = useState<SortOrder>('desc');

  const navigate = (to: AppView, params?: { id?: string, agendaId?: string }) => {
    if (params?.id) setSelectedId(params.id);
    if (params?.agendaId) setEditingAgendaId(params.agendaId);
    setView(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSitting = sittings.find(s => s.id === selectedId);

  const parliaments = useMemo(() => ['All', ...new Set(sittings.map(s => s.assembly))], [sittings]);
  const sessions = useMemo(() => ['All', ...new Set(sittings.map(s => s.session))], [sittings]);

  const filteredAndSortedSessions = useMemo(() => {
    let result = [...sittings];
    if (filterParliament !== 'All') result = result.filter(s => s.assembly === filterParliament);
    if (filterSession !== 'All') result = result.filter(s => s.session === filterSession);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.date.toLowerCase().includes(q) ||
        s.summaryText?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA = a[sessionSortField];
      let valB = b[sessionSortField];
      return sessionSortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });
    return result;
  }, [sittings, filterParliament, filterSession, searchQuery, sessionSortField, sessionSortOrder]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await authApi.login({ email, password });
      
      if (response.success && response.data) {
        setIsLoggedIn(true);
        setView('home');
        // Clear form
        e.currentTarget.reset();
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      setLoginError(apiError.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if request fails
      console.error('Logout error:', error);
    } finally {
      setIsLoggedIn(false);
      setView('home');
      setSittings(INITIAL_SITTINGS);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 5 - capturedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImages(prev => [...prev, reader.result as string].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
    
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitNewSitting = async () => {
    if (!activeDraft.assembly || !activeDraft.session || !activeDraft.date || !activeDraft.time || capturedImages.length === 0) {
      alert("Please provide all metadata and capture at least one document photo.");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processSittingDocuments(capturedImages);
      
      const newSitting: Sitting = {
        id: `s${Date.now()}`,
        assembly: activeDraft.assembly!,
        session: activeDraft.session!,
        date: activeDraft.date!,
        time: activeDraft.time!,
        status: SittingStatus.DRAFT,
        agendaItems: result.agendaItems.map((item: any, idx: number) => ({
          ...item,
          id: `ai-${Date.now()}-${idx}`
        })),
        bills: [],
        summaryText: result.summaryText,
      };

      setSittings([newSitting, ...sittings]);
      setCapturedImages([]);
      setActiveDraft({});
      navigate('sessions');
    } catch (err) {
      alert("Failed to process document. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const TopBar = ({ title, showBack }: { title: string, showBack?: boolean }) => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-center w-full shadow-sm">
      <div className="max-w-5xl w-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={() => setView('home')} className="text-slate-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-50">
              <Icons.ArrowLeft />
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-800 truncate tracking-tight">{title}</h1>
        </div>
        <div className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-200 px-3 py-1 rounded-lg bg-slate-50/50">
          Official Registry
        </div>
      </div>
    </header>
  );

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-center h-20 pb-4 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
      <div className="max-w-xl w-full flex justify-around items-center px-4">
        <NavIcon label="Home" icon={<Icons.Home />} active={view === 'home'} onClick={() => setView('home')} />
        <NavIcon label="New" icon={<Icons.Plus />} active={view === 'new_entry'} onClick={() => setView('new_entry')} />
        <NavIcon label="Sessions" icon={<Icons.Sessions />} active={view === 'sessions'} onClick={() => setView('sessions')} />
        <NavIcon label="Search" icon={<Icons.Search />} active={view === 'search'} onClick={() => setView('search')} />
        <NavIcon label="Profile" icon={<Icons.User />} active={view === 'profile'} onClick={() => setView('profile')} />
      </div>
    </nav>
  );

  const NavIcon = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-2 rounded-2xl ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`${active ? 'scale-110' : ''} transition-transform`}>{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  const ViewContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10 pb-40 lg:pb-32">
      {children}
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-800 rounded-full -ml-40 -mb-40 blur-[100px]"></div>
      <div className="max-w-xl w-full relative z-10">
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-12 border-b-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl border-4 border-slate-800">
               <Icons.Sessions />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Registry Portal</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Senate of the Republic</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address</label>
              <input 
                type="email" 
                name="email"
                placeholder="clerk@example.com" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-bold transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Secure Passcode</label>
              <input 
                type="password" 
                name="password"
                placeholder="••••••••" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-bold transition-all" 
              />
            </div>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-6 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Authenticating...' : 'Authorize Access'}
            </button>
          </form>
          <div className="pt-6 text-center">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Authorized Personnel Only.<br/>Access is monitored and recorded.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <>
      <TopBar title="Senate Registry" />
      <ViewContainer>
        <div className="space-y-10">
          <div className="w-full">
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[280px] border border-slate-800">
              <div className="relative z-10 max-w-xl">
                <p className="text-blue-400 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-4">Legislative Status</p>
                <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tight">10th Parliament of the Senate</h2>
                <p className="text-slate-400 text-sm md:text-base font-medium opacity-80 mb-8 max-w-md">2nd Session • July 2023 - 2027 Official Record period overseen by the Clerk of the Senate.</p>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest">Active Registry Session</span></div>
              </div>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Registry Logs</h3><p className="text-xl font-black text-slate-800">Recent Sittings</p></div>
              <button onClick={() => setView('sessions')} className="text-blue-600 hover:text-blue-700 text-sm font-bold">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {filteredAndSortedSessions.slice(0, 5).map((sitting) => (
                <div key={sitting.id} onClick={() => navigate('session_summary', { id: sitting.id })} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.assembly}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">•</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.session}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 mb-1">{sitting.date} at {sitting.time}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">{sitting.summaryText || 'No summary available'}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      sitting.status === SittingStatus.OFFICIAL 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {sitting.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ViewContainer>
      <BottomNav />
    </>
  );

  const renderSessions = () => (
    <>
      <TopBar title="Sessions" showBack />
      <ViewContainer>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <select value={filterParliament} onChange={(e) => setFilterParliament(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400">
              {parliaments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400">
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            {filteredAndSortedSessions.map((sitting) => (
              <div key={sitting.id} onClick={() => navigate('session_summary', { id: sitting.id })} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.assembly}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">•</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.session}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">{sitting.date} at {sitting.time}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{sitting.summaryText || 'No summary available'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    sitting.status === SittingStatus.OFFICIAL 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {sitting.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ViewContainer>
      <BottomNav />
    </>
  );

  const renderNewEntry = () => (
    <>
      <TopBar title="New Entry" showBack />
      <ViewContainer>
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Basic Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assembly</label>
                <input type="text" value={activeDraft.assembly || ''} onChange={(e) => setActiveDraft({...activeDraft, assembly: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" placeholder="10th Parliament" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Session</label>
                <input type="text" value={activeDraft.session || ''} onChange={(e) => setActiveDraft({...activeDraft, session: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" placeholder="2nd Session" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" value={activeDraft.date || ''} onChange={(e) => setActiveDraft({...activeDraft, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</label>
                <input type="time" value={activeDraft.time || ''} onChange={(e) => setActiveDraft({...activeDraft, time: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Document Photos ({capturedImages.length}/5)</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageCapture} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
              <Icons.Plus className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">Tap to capture documents</p>
            </button>
            <div className="grid grid-cols-2 gap-4">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
                  <img src={img} alt={`Document ${idx + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                    <Icons.Plus className="rotate-45" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={submitNewSitting} disabled={isProcessing} className="w-full bg-blue-600 text-white text-sm font-black uppercase tracking-widest py-4 rounded-xl disabled:opacity-50">
              {isProcessing ? 'Processing...' : 'Process Documents'}
            </button>
          </div>
        </div>
      </ViewContainer>
      <BottomNav />
    </>
  );

  const renderSearch = () => (
    <>
      <TopBar title="Search" showBack />
      <ViewContainer>
        <div className="space-y-6">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sittings..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" />
          <div className="space-y-4">
            {filteredAndSortedSessions.map((sitting) => (
              <div key={sitting.id} onClick={() => navigate('session_summary', { id: sitting.id })} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.assembly}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">•</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.session}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">{sitting.date} at {sitting.time}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{sitting.summaryText || 'No summary available'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ViewContainer>
      <BottomNav />
    </>
  );

  const renderProfile = () => (
    <>
      <TopBar title="Profile" showBack />
      <ViewContainer>
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4">User Settings</h3>
            <p className="text-sm text-slate-600 mb-6">Profile settings coming soon...</p>
            <button 
              onClick={handleLogout}
              className="w-full bg-red-600 text-white text-sm font-black uppercase tracking-widest py-4 rounded-xl hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </ViewContainer>
      <BottomNav />
    </>
  );

  const renderSessionSummary = () => {
    if (!currentSitting) {
      return (
        <>
          <TopBar title="Session Not Found" showBack />
          <ViewContainer>
            <p className="text-slate-600">The requested session could not be found.</p>
          </ViewContainer>
          <BottomNav />
        </>
      );
    }

    return (
      <>
        <TopBar title={`${currentSitting.date} - ${currentSitting.time}`} showBack />
        <ViewContainer>
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{currentSitting.assembly}</h2>
                  <p className="text-sm text-slate-600">{currentSitting.session}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  currentSitting.status === SittingStatus.OFFICIAL 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {currentSitting.status}
                </div>
              </div>
              {currentSitting.summaryText && (
                <p className="text-sm text-slate-700 leading-relaxed">{currentSitting.summaryText}</p>
              )}
            </div>
            {currentSitting.agendaItems.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">Agenda Items</h3>
                <div className="space-y-4">
                  {currentSitting.agendaItems.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-600 pl-4">
                      <h4 className="font-black text-slate-800">{item.number}. {item.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {currentSitting.bills.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">Bills</h3>
                <div className="space-y-3">
                  {currentSitting.bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h4 className="font-bold text-slate-800">{bill.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">{bill.stage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ViewContainer>
        <BottomNav />
      </>
    );
  };

  // Show loading state while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-sm font-bold">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return renderLogin();
  }

  switch (view) {
    case 'home':
      return renderHome();
    case 'sessions':
      return renderSessions();
    case 'new_entry':
      return renderNewEntry();
    case 'search':
      return renderSearch();
    case 'profile':
      return renderProfile();
    case 'session_summary':
      return renderSessionSummary();
    default:
      return renderHome();
  }
}