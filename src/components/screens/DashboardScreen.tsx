import React, { useState } from 'react';
import { Patient, VerificationFlag, HandoverItem } from '../../types/clinical';

interface DashboardScreenProps {
  currentPatient: Patient | null;
  allPatients: Patient[];
  flags: VerificationFlag[];
  handoverItems: HandoverItem[];
  onSelectPatient: (patient: Patient) => void;
  onOpenExportModal: () => void;
  onResolveFlag: (flagId: string, note: string) => void;
  onToggleItemComplete?: (itemId: string, detailIndex?: number) => void;
  onConfirmAndNext: () => void;
  onOpenAddPatient: () => void;
  onOpenDeletePatient: (patient: Patient) => void;
  onAddNote?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  currentPatient,
  allPatients,
  flags,
  handoverItems,
  onSelectPatient,
  onOpenExportModal,
  onResolveFlag,
  onConfirmAndNext,
  onOpenAddPatient,
  onOpenDeletePatient,
}) => {
  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const [activeFlagToResolve, setActiveFlagToResolve] = useState<VerificationFlag | null>(null);
  const [resolveNote, setResolveNote] = useState('ECG completed at 16:30. Normal sinus rhythm confirmed by Dr. Vance. Telemetry lead reattached.');
  const [confirmedSuccessToast, setConfirmedSuccessToast] = useState<string | null>(null);

  // Filter items for current patient
  const patientFlags = currentPatient ? flags.filter((f) => f.patientId === currentPatient.id && !f.resolved) : [];
  const patientItems = currentPatient ? handoverItems.filter((i) => i.patientId === currentPatient.id) : [];

  // Group items by category
  const pendingItems = patientItems.filter((i) => i.category === 'PENDING');
  const followUpItems = patientItems.filter((i) => i.category === 'FOLLOW-UP');
  const completedItems = patientItems.filter((i) => i.category === 'COMPLETED');
  const commItems = patientItems.filter((i) => i.category === 'COMMUNICATION');

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeFlagToResolve) {
      onResolveFlag(activeFlagToResolve.id, resolveNote);
      setActiveFlagToResolve(null);
    }
  };

  const handleNextClick = () => {
    if (!currentPatient) return;
    setConfirmedSuccessToast(`Handover for ${currentPatient.roomBed} confirmed`);
    setTimeout(() => {
      setConfirmedSuccessToast(null);
      onConfirmAndNext();
    }, 600);
  };

  if (!currentPatient) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#eceef0] my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#f2f4f6] text-[#76777d] flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[32px]">hotel</span>
        </div>
        <h3 className="text-base font-bold text-[#191c1e] mb-1">No Active Patients</h3>
        <p className="text-xs text-[#45464d] max-w-xs mb-4">
          All beds have been discharged or no records are present in the active ward roster.
        </p>
        <button
          onClick={onOpenAddPatient}
          className="h-11 px-4 bg-[#000000] text-white rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add New Patient Record</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-28">
      {/* Toast Confirmation */}
      {confirmedSuccessToast && (
        <div className="mb-3 p-3 bg-[#006a61] text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{confirmedSuccessToast}</span>
          </div>
          <span className="text-[10px] opacity-80">Syncing...</span>
        </div>
      )}

      {/* Patient Summary Card */}
      <div className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(15,23,42,0.06)] mb-4 flex items-center justify-between border border-[#eceef0]/60 relative">
        <div 
          onClick={() => setShowPatientSwitcher(!showPatientSwitcher)}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          title="Click to switch or manage patients"
        >
          {/* Avatar 3B */}
          <div className="w-12 h-12 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
            {currentPatient.avatarText}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#191c1e] group-hover:text-[#006a61] transition-colors">
                {currentPatient.roomBed}
              </span>
              <span className="text-xs text-[#45464d] px-2 py-0.5 bg-[#eceef0] rounded-full font-medium">
                {currentPatient.id}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#76777d]">
                expand_more
              </span>
            </div>
            <p className="text-xs text-[#45464d] truncate mt-0.5">
              {currentPatient.gender}, {currentPatient.age} yrs • {currentPatient.condition}
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Record, Delete Bed, and Download Report */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Add Patient Icon */}
          <button
            onClick={onOpenAddPatient}
            className="w-9 h-9 rounded-full bg-[#eceef0] hover:bg-[#e6e8ea] active:scale-95 flex items-center justify-center transition-colors text-[#191c1e]"
            title="Add New Patient Record"
            aria-label="Add Patient Record"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
          </button>

          {/* Delete / Discharge Patient Icon */}
          <button
            onClick={() => onOpenDeletePatient(currentPatient)}
            className="w-9 h-9 rounded-full bg-[#ffdad6]/60 hover:bg-[#ffdad6] active:scale-95 flex items-center justify-center transition-colors text-[#ba1a1a]"
            title="Discharge / Delete Patient Record"
            aria-label="Delete Patient Record"
          >
            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
          </button>

          {/* Generate / Download Report Button */}
          <button
            onClick={onOpenExportModal}
            className="w-9 h-9 rounded-full bg-[#eceef0] hover:bg-[#e6e8ea] active:scale-95 flex items-center justify-center transition-colors text-[#191c1e]"
            title="Export PDF / TXT Handover Report"
            aria-label="Download Handover Report"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>

        {/* Patient Switcher & Management Dropdown */}
        {showPatientSwitcher && (
          <div className="absolute top-16 left-0 right-0 z-30 bg-white rounded-xl shadow-xl border border-[#eceef0] p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#eceef0] mb-1">
              <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">
                Active Ward Beds ({allPatients.length})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPatientSwitcher(false);
                  onOpenAddPatient();
                }}
                className="text-[11px] text-[#006a61] font-bold hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Add Record</span>
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              {allPatients.map((patient) => (
                <div
                  key={patient.id}
                  className={`w-full p-2 rounded-lg flex items-center justify-between transition-colors ${
                    patient.id === currentPatient.id
                      ? 'bg-[#dae2fd] text-[#131b2e]'
                      : 'hover:bg-[#f2f4f6] text-[#191c1e]'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectPatient(patient);
                      setShowPatientSwitcher(false);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#131b2e] text-[#dae2fd] flex items-center justify-center text-xs font-bold shrink-0">
                      {patient.avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{patient.roomBed} ({patient.id})</div>
                      <div className="text-[11px] text-[#45464d] truncate">{patient.name} • {patient.condition}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                      patient.acuity === 'critical'
                        ? 'bg-[#86f2e4] text-[#006f66]'
                        : patient.acuity === 'attention'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {patient.acuity}
                    </span>

                    {/* Delete Icon Button per patient in dropdown */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPatientSwitcher(false);
                        onOpenDeletePatient(patient);
                      }}
                      className="w-7 h-7 rounded-md hover:bg-black/10 flex items-center justify-center text-[#ba1a1a] transition-colors"
                      title={`Discharge / Delete ${patient.roomBed}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Action in dropdown */}
            <div className="pt-2 mt-1 border-t border-[#eceef0]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPatientSwitcher(false);
                  onOpenAddPatient();
                }}
                className="w-full py-2 bg-[#000000] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ Add New Patient Record</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Verification Flag Banner */}
      {patientFlags.map((flag) => (
        <div 
          key={flag.id} 
          className="bg-amber-500/10 rounded-xl p-4 mb-4 flex items-start gap-3 shadow-sm border border-amber-500/20"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-amber-700 text-[18px]">
              warning
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-sm">
              {flag.title}
            </h3>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              {flag.description}
            </p>
          </div>
          <button 
            onClick={() => setActiveFlagToResolve(flag)}
            className="text-amber-900 text-xs font-semibold hover:underline shrink-0 self-center px-2 py-1 rounded hover:bg-amber-500/20 transition-colors"
          >
            Resolve
          </button>
        </div>
      ))}

      {/* Categorized Status Cards (Vertical Scrollable Stack) */}
      <div className="flex flex-col gap-3 mb-6">
        {/* PENDING Card */}
        {pendingItems.length > 0 && pendingItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(15,23,42,0.06)] relative overflow-hidden flex items-start gap-3 border border-[#eceef0]/60"
          >
            <div className="absolute left-0 inset-y-0 w-1.5 bg-[#ba1a1a]"></div>
            <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#93000a] flex items-center justify-center shrink-0 ml-1">
              <span className="material-symbols-outlined text-[18px]">
                schedule
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#ba1a1a] tracking-wider uppercase">
                  Pending
                </span>
                <span className="text-xs text-[#45464d] font-mono">
                  {item.time}
                </span>
              </div>
              <p className="text-sm text-[#191c1e] font-medium mt-1 leading-snug">
                {item.title}
              </p>
            </div>
          </div>
        ))}

        {/* FOLLOW-UP Card */}
        {followUpItems.length > 0 && followUpItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(15,23,42,0.06)] relative overflow-hidden flex items-start gap-3 border border-[#eceef0]/60"
          >
            <div className="absolute left-0 inset-y-0 w-1.5 bg-amber-500"></div>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 ml-1">
              <span className="material-symbols-outlined text-[18px]">
                priority_high
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase">
                  Follow-up
                </span>
                <span className="text-xs text-[#45464d]">
                  {item.tag || 'Action Required'}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {item.details.map((detail, idx) => (
                  <p key={idx} className="text-sm text-[#191c1e] font-medium leading-snug">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* COMPLETED Card */}
        {completedItems.length > 0 && completedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(15,23,42,0.06)] relative overflow-hidden flex items-start gap-3 border border-[#eceef0]/60"
          >
            <div className="absolute left-0 inset-y-0 w-1.5 bg-[#006a61]"></div>
            <div className="w-8 h-8 rounded-full bg-[#86f2e4] text-[#006f66] flex items-center justify-center shrink-0 ml-1">
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#006a61] tracking-wider uppercase">
                  Completed
                </span>
                <span className="text-xs text-[#45464d] font-mono">
                  {item.time}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {item.details.map((detail, idx) => (
                  <p key={idx} className="text-sm text-[#191c1e] font-medium leading-snug">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* COMMUNICATION Card */}
        {commItems.length > 0 && commItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(15,23,42,0.06)] relative overflow-hidden flex items-start gap-3 border border-[#eceef0]/60"
          >
            <div className="absolute left-0 inset-y-0 w-1.5 bg-[#131b2e]"></div>
            <div className="w-8 h-8 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center shrink-0 ml-1">
              <span className="material-symbols-outlined text-[18px]">
                chat
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#3f465c] tracking-wider uppercase">
                  Communication
                </span>
                <span className="text-xs text-[#45464d]">
                  {item.tag || 'Family'}
                </span>
              </div>
              <p className="text-sm text-[#191c1e] font-medium mt-1 leading-snug">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Action Footer inside flow */}
      <div className="fixed bottom-20 inset-x-0 bg-[#f7f9fb]/90 backdrop-blur-md px-4 py-3 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] border-t border-[#eceef0]">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={onOpenExportModal}
            className="flex-1 h-12 rounded-xl bg-[#eceef0] hover:bg-[#e6e8ea] active:scale-[0.98] text-[#191c1e] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            <span>Export PDF / TXT</span>
          </button>

          <button
            onClick={handleNextClick}
            className="flex-1 h-12 rounded-xl bg-[#000000] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <span>Confirm & Next</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Resolve AI Documentation Check Modal */}
      {activeFlagToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#eceef0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eceef0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">verified</span>
                <h3 className="text-sm font-bold text-[#191c1e]">Resolve Clinical Verification</h3>
              </div>
              <button 
                onClick={() => setActiveFlagToResolve(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#76777d] hover:bg-[#eceef0]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="py-3 flex flex-col gap-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900">
                <span className="font-bold">{activeFlagToResolve.title}:</span> {activeFlagToResolve.description}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#191c1e]">
                  Clinical Resolution Status Note:
                </label>
                <textarea
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full bg-[#f2f4f6] rounded-xl p-2.5 text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveFlagToResolve(null)}
                  className="flex-1 h-10 rounded-xl bg-[#eceef0] text-xs font-semibold text-[#191c1e] hover:bg-[#e6e8ea]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#000000] text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
                >
                  Mark Resolved & Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
