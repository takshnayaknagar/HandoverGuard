import React, { useState } from 'react';
import { Patient, ShiftInfo, HandoverItem, VerificationFlag } from '../../types/clinical';
import { ExportModal } from '../ExportModal';

interface ExportScreenProps {
  currentPatient: Patient | null;
  allPatients: Patient[];
  shiftInfo: ShiftInfo;
  items: HandoverItem[];
  flags: VerificationFlag[];
  onSelectPatient: (patient: Patient) => void;
  onNavigateToDashboard: () => void;
  onOpenAddPatient?: () => void;
  onOpenDeletePatient?: (patient: Patient) => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  currentPatient,
  allPatients,
  shiftInfo,
  items,
  flags,
  onSelectPatient,
  onNavigateToDashboard,
  onOpenAddPatient,
  onOpenDeletePatient,
}) => {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-24">
      {/* Screen Header Intro */}
      <div className="flex flex-col gap-1 pt-2 mb-4">
        <h2 className="text-xl font-bold text-[#191c1e]">
          Export Handover Reports
        </h2>
        <p className="text-xs text-[#45464d] leading-relaxed">
          Generate secure shift documentation formatted for clinical records or quick sharing.
        </p>
      </div>

      {/* Ward Status Preview Cards */}
      <div className="flex flex-col gap-3 mb-4">
        {currentPatient ? (
          <>
            <div className="bg-[#f2f4f6] rounded-xl p-4 flex flex-col gap-2 border border-[#eceef0]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#45464d]">
                  Active Shift: {shiftInfo.ward}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#86f2e4] text-[#006f66] text-[10px] font-bold">
                  Secure Sync
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#191c1e] pt-1">
                <span>Current Patient: <strong>{currentPatient.roomBed} ({currentPatient.id})</strong></span>
                <span className="text-[#006a61]">{currentPatient.condition}</span>
              </div>
            </div>

            {/* Action Trigger Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#eceef0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    description
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#191c1e]">
                    {currentPatient.roomBed} Handover Record
                  </div>
                  <div className="text-xs text-[#45464d]">
                    Shift {shiftInfo.shiftNumber} • Ready to compile
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 bg-[#000000] text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Open Exporter
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#f2f4f6] rounded-xl p-4 text-center border border-[#eceef0]">
            <p className="text-xs text-[#45464d] mb-2">No active bed selected for export.</p>
            {onOpenAddPatient && (
              <button
                onClick={onOpenAddPatient}
                className="px-3 py-1.5 bg-[#000000] text-white rounded-lg text-xs font-semibold"
              >
                + Add Patient Record
              </button>
            )}
          </div>
        )}

        {/* Batch Export All Ward Beds */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#eceef0] flex flex-col gap-2">
          <div className="text-xs font-bold text-[#191c1e] flex items-center justify-between">
            <span>Ward Patients ({allPatients.length} Active Beds)</span>
            {onOpenAddPatient && (
              <button
                onClick={onOpenAddPatient}
                className="text-[11px] text-[#006a61] font-semibold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Add Record</span>
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {allPatients.map((p) => (
              <div 
                key={p.id}
                className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                  currentPatient && p.id === currentPatient.id ? 'bg-[#dae2fd] text-[#131b2e] font-semibold' : 'hover:bg-[#f2f4f6] text-[#191c1e]'
                }`}
              >
                <div 
                  onClick={() => onSelectPatient(p)}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center border border-[#eceef0]">
                    {p.avatarText}
                  </div>
                  <span>{p.roomBed} ({p.id}) - {p.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#45464d]">{p.condition}</span>
                  {onOpenDeletePatient && (
                    <button
                      onClick={() => onOpenDeletePatient(p)}
                      className="w-6 h-6 rounded hover:bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center transition-colors"
                      title={`Discharge / Delete ${p.roomBed}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The Export Modal dialog matching the user screenshot */}
      <ExportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPatient={currentPatient}
        shiftInfo={shiftInfo}
        items={items}
        flags={flags}
      />
    </div>
  );
};
