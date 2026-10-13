export interface HandoverItem {
  id: string;
  category: 'pending' | 'followup' | 'completed' | 'communication' | 'verification';
  title: string;
  description?: string;
  patient?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  timestamp?: string;
}

export interface HandoverSummary {
  patientCount: number;
  criticalAlerts: number;
  pendingTasks: number;
  followupsDue: number;
}

export interface HandoverOutput {
  id: string;
  shift: string;
  timestamp: string;
  summary: HandoverSummary;
  items: {
    pending: HandoverItem[];
    followup: HandoverItem[];
    completed: HandoverItem[];
    communication: HandoverItem[];
    verification: HandoverItem[];
  };
  rawTranscript: string;
}

export interface ProcessingState {
  status: 'idle' | 'recording' | 'recorded' | 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  progressPercent?: number;
}
