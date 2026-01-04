import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AppView, Sitting, SittingStatus, AgendaItem } from './types';
import { Icons } from './constants';
import { authApi, apiClient, assembliesApi, sessionsApi, sittingsApi, documentsApi } from './services/api';
import type { ApiError } from './services/api';
import type { Assembly } from './services/api/assemblies';
import type { Session } from './services/api/sessions';

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

// Simple parser for document text to apply formatting
// Simple parser for document text to apply formatting
const DocumentFormatter = ({ text }: { text: string }) => {
  if (!text) return null;

  // Split lines and filter empty ones
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

  return (
    <div className="bg-slate-100 p-2 sm:p-4 md:p-8 rounded-xl overflow-auto border border-slate-200">
      <div className="document-page p-3 sm:p-6 md:p-12 lg:p-16 text-slate-900 leading-relaxed font-serif text-sm sm:text-base relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        {lines.map((line, i) => {
          const trimmed = line.trim();

          // Match numbered headers (e.g., "1. Presentation of Bills:")
          const headerMatch = trimmed.match(/^(\d+)\.\s+(.*)/);

          // Match roman numerals (e.g., "(i)", "(ii)") - Strict check to avoid false positives
          const subItemMatch = trimmed.match(/^(\([ivx]+\))\s+(.*)/i);

          // Detect center-aligned heavy headers (e.g. "SENATE OF THE")
          const isHeavyHeader = trimmed === trimmed.toUpperCase() && trimmed.length < 50 && !headerMatch;

          if (isHeavyHeader) {
            return (
              <div key={i} className="text-center font-bold text-lg md:text-xl tracking-wide py-1 text-slate-900 border-none">
                {trimmed}
              </div>
            );
          }

          if (headerMatch) {
            return (
              <div key={i} className="flex gap-4 pt-6 pb-2 items-baseline">
                <span className="font-bold text-slate-900 text-lg min-w-[20px]">{headerMatch[1]}.</span>
                <span className="font-bold text-slate-900 text-lg uppercase tracking-tight">{headerMatch[2]}</span>
              </div>
            );
          }

          if (subItemMatch) {
            return (
              <div key={i} className="flex gap-4 ml-8 pl-4 py-1.5 items-baseline">
                <span className="font-medium text-slate-600 min-w-[28px] italic">{subItemMatch[1]}</span>
                <span className="text-slate-800">{subItemMatch[2]}</span>
              </div>
            );
          }

          // Regular content
          const isTitle = trimmed === trimmed.toUpperCase() && trimmed.length > 5;

          return (
            <div key={i} className={`ml-8 ${isTitle ? 'font-bold text-slate-800 pt-3' : 'text-slate-700 py-0.5 text-justify'}`}>
              {trimmed}
            </div>
          );
        })}

        {/* Page Footer Simulation */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-400 font-sans">
          <span>Official Record</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};

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
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<number | null>(null);
  const [detailedSitting, setDetailedSitting] = useState<Sitting | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSittingId, setCreatedSittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [hasUploadErrors, setHasUploadErrors] = useState(false);

  // Session filters
  const [filterParliament, setFilterParliament] = useState('All');
  const [filterSession, setFilterSession] = useState('All');
  const [sessionSortField, setSessionSortField] = useState<SortField>('date');
  const [sessionSortOrder, setSessionSortOrder] = useState<SortOrder>('desc');

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

  // Fetch assemblies when new_entry view is active
  useEffect(() => {
    if (view === 'new_entry' && isLoggedIn) {
      const fetchAssemblies = async () => {
        try {
          const response = await assembliesApi.getAll();
          console.log('Assemblies API response:', response);
          if (response.success && response.data) {
            console.log('Assemblies loaded:', response.data);
            setAssemblies(response.data);
          } else {
            console.warn('Assemblies API returned no data:', response);
          }
        } catch (error) {
          console.error('Failed to fetch assemblies:', error);
          alert('Failed to load assemblies. Please refresh the page.');
        }
      };
      fetchAssemblies();
    } else if (view !== 'new_entry') {
      // Clear assemblies when leaving new_entry view
      setAssemblies([]);
      setSelectedAssemblyId(null);
      setAvailableSessions([]);
    }
  }, [view, isLoggedIn]);

  // Fetch sessions when assembly is selected
  useEffect(() => {
    if (selectedAssemblyId && isLoggedIn) {
      const fetchSessions = async () => {
        try {
          const response = await sessionsApi.getByAssembly(selectedAssemblyId);
          if (response.success && response.data) {
            setAvailableSessions(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch sessions:', error);
          setAvailableSessions([]);
        }
      };
      fetchSessions();
    } else {
      setAvailableSessions([]);
    }
  }, [selectedAssemblyId, isLoggedIn]);

  // Fetch all assemblies and sessions for filter dropdowns when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchFilterData = async () => {
        try {
          // Fetch all assemblies
          const assembliesResponse = await assembliesApi.getAll();
          if (assembliesResponse.success && assembliesResponse.data) {
            setAssemblies(assembliesResponse.data);
          }

          // Fetch all sessions
          const sessionsResponse = await sessionsApi.getAll();
          if (sessionsResponse.success && sessionsResponse.data) {
            setAvailableSessions(sessionsResponse.data);
          }
        } catch (error) {
          console.error('Failed to fetch filter data:', error);
        }
      };
      fetchFilterData();
    }
  }, [isLoggedIn]);

  // Fetch sittings when logged in and on sessions/home view
  useEffect(() => {
    if (!isLoggedIn || (view !== 'sessions' && view !== 'home')) {
      return;
    }

    const fetchSittings = async () => {
      try {
        // Build filters from current filter state
        const filters: any = {};
        if (filterParliament !== 'All' && assemblies.length > 0) {
          // Find assembly ID by name
          const assembly = assemblies.find(a => a.name === filterParliament);
          if (assembly) {
            filters.assembly = assembly.id;
          }
        }
        if (filterSession !== 'All' && availableSessions.length > 0) {
          // Find session ID by name
          const session = availableSessions.find(s => s.name === filterSession);
          if (session) {
            filters.session = session.id;
          }
        }

        const response = await sittingsApi.list({ ...filters, per_page: 100 });
        if (response.success && response.data) {
          // Map API response to frontend format
          const mappedSittings: Sitting[] = response.data.map((sitting: any) => ({
            id: String(sitting.id),
            assembly: sitting.assembly || 'Unknown Assembly',
            session: sitting.session || 'Unknown Session',
            date: sitting.date,
            time: sitting.time || '',
            status: sitting.status === 'Official Record' ? SittingStatus.OFFICIAL : SittingStatus.DRAFT,
            summaryText: sitting.summaryText || null,
            agendaItems: sitting.agendaItems || [],
            bills: sitting.bills || [],
          }));
          setSittings(mappedSittings);
        }
      } catch (error) {
        console.error('Failed to fetch sittings:', error);
        // Keep existing sittings on error
      }
    };

    fetchSittings();
    fetchSittings();
  }, [isLoggedIn, view, filterParliament, filterSession, assemblies, availableSessions]);

  // Fetch detailed sitting when entering session_summary
  useEffect(() => {
    if (view === 'session_summary' && selectedId && isLoggedIn) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const response = await sittingsApi.getById(Number(selectedId));
          if (response.success && response.data) {
            const data = response.data;
            // Map backend response to frontend Sitting type
            setDetailedSitting({
              id: String(data.id),
              assembly: data.session?.assembly?.name || 'Unknown Assembly',
              session: data.session?.name || 'Unknown Session',
              date: data.date,
              time: data.time_opened?.substring(0, 5) || '', // HH:MM
              status: (data.status === 'official' || data.status === 'official' as any) ? SittingStatus.OFFICIAL : SittingStatus.DRAFT,
              agendaItems: data.agenda_items || [],
              bills: data.bills || [],
              documents: (data as any).documents || [],
              summaryText: undefined
            });
          }
        } catch (e) {
          console.error("Failed to fetch details", e);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchDetails();
    } else {
      setDetailedSitting(null);
    }
  }, [view, selectedId, isLoggedIn]);

  // Handle delete sitting
  const handleDeleteSitting = async (sittingId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm('Are you sure you want to delete this sitting? This action cannot be undone.')) {
      return;
    }

    try {
      setIsProcessing(true);
      const response = await sittingsApi.delete(Number(sittingId));
      if (response.success) {
        // Remove from local state
        setSittings(prev => prev.filter(s => s.id !== sittingId));
        // Note: The useEffect will automatically refetch when filters change
      } else {
        alert(response.message || 'Failed to delete sitting');
      }
    } catch (error: any) {
      console.error('Failed to delete sitting:', error);
      alert(error.message || 'Failed to delete sitting. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const navigate = (to: AppView, params?: { id?: string, agendaId?: string }) => {
    if (params?.id) setSelectedId(params.id);
    if (params?.agendaId) setEditingAgendaId(params.agendaId);
    setView(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSitting = sittings.find(s => s.id === selectedId);

  // Get unique parliaments and sessions from both sittings and API data
  const parliaments = useMemo(() => {
    const fromSittings = sittings.map(s => s.assembly);
    const fromAssemblies = assemblies.map(a => a.name);
    return ['All', ...new Set([...fromSittings, ...fromAssemblies])];
  }, [sittings, assemblies]);

  const sessions = useMemo(() => {
    const fromSittings = sittings.map(s => s.session);
    const fromApiSessions = availableSessions.map(s => s.name);
    return ['All', ...new Set([...fromSittings, ...fromApiSessions])];
  }, [sittings, availableSessions]);

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

    // Store File objects
    setCapturedFiles(prev => [...prev, ...filesToProcess].slice(0, 5));

    // Store data URLs for preview
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
    setCapturedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitNewSitting = async () => {
    // Debug logging
    console.log('Validation check:', {
      assembly: activeDraft.assembly,
      session: activeDraft.session,
      date: activeDraft.date,
      time: activeDraft.time,
      capturedFilesCount: capturedFiles.length,
      capturedImagesCount: capturedImages.length
    });

    if (!activeDraft.assembly || !activeDraft.session || !activeDraft.date || !activeDraft.time || capturedFiles.length === 0) {
      const missingFields = [];
      if (!activeDraft.assembly) missingFields.push('Assembly');
      if (!activeDraft.session) missingFields.push('Session');
      if (!activeDraft.date) missingFields.push('Date');
      if (!activeDraft.time) missingFields.push('Time');
      if (capturedFiles.length === 0) missingFields.push('at least one document photo');

      alert(`Please provide all metadata and capture at least one document photo.\n\nMissing: ${missingFields.join(', ')}`);
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Find the selected assembly and session from already-loaded data
      if (!selectedAssemblyId) {
        alert('Please select an assembly.');
        setIsProcessing(false);
        return;
      }

      const assembly = assemblies.find(a => a.id === selectedAssemblyId);
      if (!assembly) {
        alert(`Assembly not found. Please try again.`);
        setIsProcessing(false);
        return;
      }

      const session = availableSessions.find(s => s.name === activeDraft.session);
      if (!session) {
        alert(`Session "${activeDraft.session}" not found. Please select a session.`);
        setIsProcessing(false);
        return;
      }

      // Step 3: Create a draft sitting via backend API
      const sittingResponse = await sittingsApi.create({
        session_id: session.id,
        date: activeDraft.date!,
        time_opened: activeDraft.time!,
      });

      if (!sittingResponse.success || !sittingResponse.data) {
        throw new Error(sittingResponse.message || 'Failed to create sitting');
      }

      const createdSitting = sittingResponse.data;

      // Step 4: Upload all document images and extract text using OCR
      const uploadResults = await Promise.allSettled(
        capturedFiles.map(file =>
          documentsApi.upload(createdSitting.id, file, 'original_scan')
        )
      );

      // Collect extracted text from successfully uploaded documents
      const extractedTexts: Array<{ file_name: string; extracted_text: string | null }> = [];

      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          const document = result.value.data;
          extractedTexts.push({
            file_name: document.file_name,
            extracted_text: document.extracted_text || null,
          });
        }
      });

      // Display extracted text in JSON format
      const extractedTextJson = JSON.stringify(extractedTexts, null, 2);
      console.log('Extracted Text from Documents (JSON):', extractedTextJson);

      // Also log individual document texts
      extractedTexts.forEach((doc, index) => {
        console.log(`Document ${index + 1} (${doc.file_name}):`, doc.extracted_text || 'No text extracted');
      });

      // Check if any uploads failed
      const failedUploads = uploadResults.filter(result => result.status === 'rejected');
      let message = '';
      let hasErrors = false;

      if (failedUploads.length > 0) {
        console.error('Some document uploads failed:', failedUploads);
        hasErrors = true;

        // Check for 413 errors (file too large)
        const fileSizeErrors = failedUploads.filter(result => {
          if (result.status === 'rejected' && result.reason) {
            const error = result.reason as any;
            return error?.response?.status === 413 || error?.message?.includes('413') || error?.message?.includes('too large');
          }
          return false;
        });

        if (fileSizeErrors.length > 0) {
          message = `Sitting created successfully, but ${fileSizeErrors.length} document(s) failed to upload because the file size is too large (maximum 5MB per file). Please compress or resize your images and try uploading them again.`;
        } else {
          message = `Sitting created successfully, but ${failedUploads.length} document(s) failed to upload. Please try uploading them again.`;
        }
      } else {
        message = `Sitting created and ${extractedTexts.length} document(s) uploaded successfully!`;
      }

      // Set success modal state
      setCreatedSittingId(String(createdSitting.id));
      setSuccessMessage(message);
      setHasUploadErrors(hasErrors);
      setShowSuccessModal(true);

      // Step 5: Success - clear form (but don't navigate yet, wait for user action in modal)
      setCapturedImages([]);
      setCapturedFiles([]);
      setActiveDraft({});
      setSelectedAssemblyId(null);
      setAvailableSessions([]);
    } catch (err: any) {
      console.error('Error creating sitting:', err);
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to create sitting and upload documents. Please try again.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const TopBar = ({ title, showBack }: { title: string, showBack?: boolean }) => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-center w-full shadow-sm">
      <div className="max-w-5xl w-full px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {showBack && (
            <button onClick={() => setView('home')} className="text-slate-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-50 flex-shrink-0">
              <Icons.ArrowLeft />
            </button>
          )}
          <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate tracking-tight flex-1 min-w-0">{title}</h1>
        </div>
        <div className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-200 px-3 py-1 rounded-lg bg-slate-50/50 flex-shrink-0">
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
        <NavIcon label="Sitting" icon={<Icons.Sessions />} active={view === 'sessions'} onClick={() => setView('sessions')} />
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

  const SuccessModal = () => {
    if (!showSuccessModal) return null;

    const handleViewSitting = () => {
      setShowSuccessModal(false);
      if (createdSittingId) {
        navigate('session_summary', { id: createdSittingId });
      }
    };

    const handleAddNew = () => {
      setShowSuccessModal(false);
      setCreatedSittingId(null);
      setSuccessMessage('');
      setHasUploadErrors(false);
      // Stay on new_entry view, form is already cleared
      setView('new_entry');
    };

    const handleClose = () => {
      setShowSuccessModal(false);
      setCreatedSittingId(null);
      setSuccessMessage('');
      setHasUploadErrors(false);
      navigate('sessions');
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasUploadErrors ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                {hasUploadErrors ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-lg font-black ${hasUploadErrors ? 'text-amber-900' : 'text-emerald-900'}`}>
                  {hasUploadErrors ? 'Sitting Created with Warnings' : 'Sitting Created Successfully'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleViewSitting}
              className="flex-1 bg-blue-600 text-white text-sm font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Sitting
            </button>
            <button
              onClick={handleAddNew}
              className="flex-1 bg-slate-100 text-slate-800 text-sm font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New
            </button>
          </div>
        </div>
      </div>
    );
  };

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
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Authorized Personnel Only.<br />Access is monitored and recorded.</p>
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
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${sitting.status === SittingStatus.OFFICIAL
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
      <TopBar title="Sittings" showBack />
      <ViewContainer>
        <div className="space-y-6">
          <div className="space-y-4">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search sittings..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" 
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <select value={filterParliament} onChange={(e) => setFilterParliament(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400">
                {parliaments.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400">
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {filteredAndSortedSessions.map((sitting) => (
              <div key={sitting.id} onClick={() => navigate('session_summary', { id: sitting.id })} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.assembly}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">•</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sitting.session}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">{sitting.date} at {sitting.time}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{sitting.summaryText || 'No summary available'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sitting.status === SittingStatus.DRAFT && (
                      <button
                        onClick={(e) => handleDeleteSitting(sitting.id, e)}
                        disabled={isProcessing}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete sitting"
                      >
                        <Icons.Trash />
                      </button>
                    )}
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${sitting.status === SittingStatus.OFFICIAL
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                      }`}>
                      {sitting.status}
                    </div>
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
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assembly *</label>
                <select
                  value={selectedAssemblyId || ''}
                  onChange={(e) => {
                    const assemblyId = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedAssemblyId(assemblyId);
                    const selectedAssembly = assemblies.find(a => a.id === assemblyId);
                    // Update assembly name and clear session when assembly changes
                    setActiveDraft({
                      ...activeDraft,
                      assembly: selectedAssembly?.name || '',
                      session: '', // Clear session when assembly changes
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400"
                  required
                >
                  <option value="">{assemblies.length === 0 ? 'Loading assemblies...' : 'Select Assembly'}</option>
                  {assemblies.map(assembly => (
                    <option key={assembly.id} value={assembly.id}>
                      {assembly.name}
                    </option>
                  ))}
                </select>
                {assemblies.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No assemblies available. Please check if you're logged in and the backend is running.</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Session *</label>
                <select
                  value={activeDraft.session || ''}
                  onChange={(e) => {
                    setActiveDraft({ ...activeDraft, session: e.target.value });
                  }}
                  disabled={!selectedAssemblyId || availableSessions.length === 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">{selectedAssemblyId ? 'Select Session' : 'Select Assembly first'}</option>
                  {availableSessions.map(session => (
                    <option key={session.id} value={session.name}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" value={activeDraft.date || ''} onChange={(e) => setActiveDraft({ ...activeDraft, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</label>
                <input type="time" value={activeDraft.time || ''} onChange={(e) => setActiveDraft({ ...activeDraft, time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400" />
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
    // Show loading detailed view
    if (isLoadingDetails) {
      return (
        <>
          <TopBar title="Loading..." showBack />
          <ViewContainer>
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400 font-bold">Loading detailed records...</div>
            </div>
          </ViewContainer>
          <BottomNav />
        </>
      );
    }

    const sitting = detailedSitting || currentSitting;

    if (!sitting) {
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
        <TopBar title={`${sitting.date} - ${sitting.time}`} showBack />
        <ViewContainer>
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
              <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 break-words">{sitting.assembly}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">{sitting.session}</p>
                </div>
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${sitting.status === SittingStatus.OFFICIAL
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
                  }`}>
                  {sitting.status}
                </div>
              </div>
              {sitting.summaryText && (
                <p className="text-sm text-slate-700 leading-relaxed">{sitting.summaryText}</p>
              )}
            </div>

            {/* Documents Section with Extracted Text */}
            {sitting.documents && sitting.documents.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 px-2 uppercase tracking-widest text-xs text-slate-400">Official Documents</h3>
                {sitting.documents.map((doc, idx) => (
                  <div key={doc.id || idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm -mx-4 sm:mx-0">
                    <div className="bg-slate-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate flex-1 min-w-0">{doc.file_name}</h4>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">{doc.type}</span>
                    </div>
                    <div className="p-0 sm:p-4 md:p-6">
                      {doc.extracted_text ? (
                        <div className="bg-white rounded-xl border border-slate-100">
                          <DocumentFormatter text={doc.extracted_text} />
                        </div>
                      ) : (
                        <div className="text-center py-8 px-4 text-slate-400 text-sm font-medium">
                          No text content extracted from this document.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sitting.agendaItems.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">Agenda Items</h3>
                <div className="space-y-4">
                  {sitting.agendaItems.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-600 pl-4">
                      <h4 className="font-black text-slate-800">{item.number}. {item.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sitting.bills.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">Bills</h3>
                <div className="space-y-3">
                  {sitting.bills.map((bill) => (
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

  return (
    <>
      <SuccessModal />
      {(() => {
        switch (view) {
          case 'home':
            return renderHome();
          case 'sessions':
            return renderSessions();
          case 'new_entry':
            return renderNewEntry();
          case 'search':
            // Redirect search view to sessions (search is now integrated in sessions)
            setView('sessions');
            return renderSessions();
          case 'profile':
            return renderProfile();
          case 'session_summary':
            return renderSessionSummary();
          default:
            return renderHome();
        }
      })()}
    </>
  );
}