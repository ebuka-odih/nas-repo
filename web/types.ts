
export enum SittingStatus {
  DRAFT = 'Draft',
  OFFICIAL = 'Official Record'
}

export interface AgendaItem {
  id: string;
  number: number;
  title: string;
  content: string;
  summary?: string;
}

export interface Bill {
  id: string;
  title: string;
  stage: string;
}

export interface Sitting {
  id: string;
  assembly: string;
  session: string;
  date: string;
  time: string;
  agendaItems: AgendaItem[];
  bills: Bill[];
  status: SittingStatus;
  summaryText?: string;
}

export type AppView = 
  | 'login'
  | 'home' 
  | 'new_entry' 
  | 'scan_document' 
  | 'basic_details' 
  | 'agenda_overview' 
  | 'agenda_detail' 
  | 'bills_section' 
  | 'review' 
  | 'sessions' 
  | 'search' 
  | 'profile' 
  | 'session_summary' 
  | 'document_viewer';

export interface AppState {
  currentView: AppView;
  selectedSittingId?: string;
  activeDraft?: Partial<Sitting>;
  history: AppView[];
  editingAgendaId?: string;
}
