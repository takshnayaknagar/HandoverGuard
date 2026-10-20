import React, { useState } from 'react';
import { Patient, AcuityLevel } from '../types/clinical';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (newPatient: Patient, initialNotes?: string) => void;
  existingCount: number;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  onAddPatient,
  existingCount,
}) => {
  const nextNumber = 105 + existingCount;
  const defaultBed = `Bed ${existingCount + 1}A`;

  const [roomBed, setRoomBed] = useState(defaultBed);
  const [patientId, setPatientId] = useState(`#${nextNumber}`);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>(52);
  const [gender, setGender] = useState('Female');
  const [condition, setCondition] = useState('Post-Op Monitoring');
  const [acuity, setAcuity] = useState<AcuityLevel>('attention');
  const [department, setDepartment] = useState('Intensive Care Unit (ICU)');
  const [attendingPhysician, setAttendingPhysician] = useState('Dr. Emily Vance, MD');
  const [initialNote, setInitialNote] = useState('Admitted from surgical suite. Vitals stable upon arrival.');

  if (!isOpen) return null;

  // Extract avatar text like '2A' or '3B' from roomBed
  const avatarText = roomBed.replace(/bed/i, '').trim().toUpperCase() || 'PT';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomBed.trim() || !patientId.trim()) return;

    const newPatient: Patient = {
      id: patientId.trim().startsWith('#') ? patientId.trim() : `#${patientId.trim()}`,
      roomBed: roomBed.trim(),
      avatarText: avatarText.slice(0, 3),
      name: name.trim(),
      age: Number(age) || 45,
      gender,
      condition: condition.trim() || 'General Observation',
      acuity,
      department,
      attendingPhysician,
    };

    onAddPatient(newPatient, initialNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#eceef0] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#eceef0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e]">Add Patient Record</h3>
              <p className="text-xs text-[#45464d]">Admit bed to active shift handover</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-[#eceef0] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto">
          {/* Bed & Patient ID Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#191c1e]">Bed / Room *</label>
              <input
                type="text"
                required
                value={roomBed}
                onChange={(e) => setRoomBed(e.target.value)}
                placeholder="e.g. Bed 5B"
                className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#191c1e]">Patient ID *</label>
              <input
                type="text"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. #106"
                className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#191c1e]">Patient Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Age & Gender Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#191c1e]">Age</label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
                className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#191c1e]">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Clinical Condition / Diagnosis */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#191c1e]">Diagnosis / Condition *</label>
            <input
              type="text"
              required
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Post-Op Hip Arthroplasty"
              className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Acuity Level Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e]">Acuity Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAcuity('critical')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                  acuity === 'critical'
                    ? 'bg-[#86f2e4] text-[#006f66] border-[#006a61]'
                    : 'bg-[#f2f4f6] text-[#45464d] border-transparent hover:bg-[#eceef0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#006a61]"></span>
                <span>Critical</span>
              </button>
              <button
                type="button"
                onClick={() => setAcuity('attention')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                  acuity === 'attention'
                    ? 'bg-amber-100 text-amber-900 border-amber-500'
                    : 'bg-[#f2f4f6] text-[#45464d] border-transparent hover:bg-[#eceef0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Attention</span>
              </button>
              <button
                type="button"
                onClick={() => setAcuity('stable')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                  acuity === 'stable'
                    ? 'bg-slate-200 text-slate-900 border-slate-400'
                    : 'bg-[#f2f4f6] text-[#45464d] border-transparent hover:bg-[#eceef0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span>Stable</span>
              </button>
            </div>
          </div>

          {/* Attending Physician */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#191c1e]">Attending Physician</label>
            <input
              type="text"
              value={attendingPhysician}
              onChange={(e) => setAttendingPhysician(e.target.value)}
              placeholder="e.g. Dr. Emily Vance, MD"
              className="h-10 px-3 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Initial Admission Note */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#191c1e]">Initial Handover Note</label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="Clinical baseline or immediate task..."
              className="p-2.5 bg-[#f2f4f6] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-[#eceef0]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-[#eceef0] text-[#191c1e] rounded-xl text-xs font-semibold hover:bg-[#e6e8ea] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-[#000000] text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Admit Patient Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
