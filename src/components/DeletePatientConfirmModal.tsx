import React from 'react';
import { Patient } from '../types/clinical';

interface DeletePatientConfirmModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onConfirmDelete: (patientId: string) => void;
}

export const DeletePatientConfirmModal: React.FC<DeletePatientConfirmModalProps> = ({
  isOpen,
  patient,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-[#eceef0] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">delete</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#191c1e]">Discharge Patient Record</h3>
            <p className="text-xs text-[#45464d]">Remove from active shift handover</p>
          </div>
        </div>

        <div className="p-3 bg-[#f2f4f6] rounded-xl text-xs space-y-1.5 border border-[#eceef0]">
          <div className="flex justify-between">
            <span className="text-[#76777d]">Bed / Room:</span>
            <span className="font-bold text-[#191c1e]">{patient.roomBed} ({patient.id})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76777d]">Name:</span>
            <span className="text-[#191c1e]">{patient.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76777d]">Diagnosis:</span>
            <span className="text-[#191c1e]">{patient.condition}</span>
          </div>
        </div>

        <p className="text-xs text-[#76777d] leading-relaxed">
          Discharging this patient will archive their active tasks, pending lab checklists, and handover notes from this shift.
        </p>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 bg-[#eceef0] text-[#191c1e] rounded-xl text-xs font-semibold hover:bg-[#e6e8ea] transition-colors"
          >
            Keep Record
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(patient.id);
              onClose();
            }}
            className="flex-1 h-10 bg-[#ba1a1a] text-white rounded-xl text-xs font-semibold hover:bg-[#93000a] transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Discharge / Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
