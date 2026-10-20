export type AcuityLevel = 'critical' | 'stable' | 'attention';

export type HandoverCategory = 'PENDING' | 'FOLLOW-UP' | 'COMPLETED' | 'COMMUNICATION';

export interface Patient {
  id: string;
  roomBed: string;
  avatarText: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  acuity: AcuityLevel;
  department: string;
  attendingPhysician: string;
}

export interface VerificationFlag {
  id: string;
  patientId: string;
  type: string;
  title: string;
  description: string;
  time: string;
  resolved: boolean;
  resolutionNote?: string;
}

export interface HandoverItem {
  id: string;
  patientId: string;
  category: HandoverCategory;
  title: string;
  details: string[];
  time: string;
  tag: string;
  isActionRequired?: boolean;
}

export interface ShiftInfo {
  shiftNumber: string;
  ward: string;
  activeNurse: string;
  nurseRole: string;
  nurseId: string;
  timeWindow: string;
}
