/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, ScreenTab } from './components/BottomNav';
import { LoginScreen } from './components/screens/LoginScreen';
import { VoiceNoteScreen } from './components/screens/VoiceNoteScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ExportScreen } from './components/screens/ExportScreen';
import { ExportModal } from './components/ExportModal';
import { AddPatientModal } from './components/AddPatientModal';
import { DeletePatientConfirmModal } from './components/DeletePatientConfirmModal';
import { 
  INITIAL_PATIENTS, 
  INITIAL_FLAGS, 
  INITIAL_HANDOVER_ITEMS, 
  INITIAL_SHIFT_INFO 
} from './data/mockClinicalData';
import { Patient, VerificationFlag, HandoverItem, ShiftInfo } from './types/clinical';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('dashboard');
  const [viewMode, setViewMode] = useState<'mobile' | 'workstation'>('mobile');
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(INITIAL_PATIENTS[0] || null);
  const [flags, setFlags] = useState<VerificationFlag[]>(INITIAL_FLAGS);
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>(INITIAL_HANDOVER_ITEMS);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(INITIAL_SHIFT_INFO);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Unresolved flags count for current patient
  const pendingFlagsCount = currentPatient 
    ? flags.filter((f) => f.patientId === currentPatient.id && !f.resolved).length
    : 0;

  // Add Patient Record
  const handleAddPatient = (newPatient: Patient, initialNote?: string) => {
    setPatients((prev) => [...prev, newPatient]);
    setCurrentPatient(newPatient);

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialItems: HandoverItem[] = [
      {
        id: `init-${Date.now()}-1`,
        patientId: newPatient.id,
        category: 'COMPLETED',
        title: 'Bed Admission & Initial Triage Assessment',
        details: [
          initialNote || 'Patient admitted to unit. Vital signs baseline recorded in EHR.',
          `Attending: ${newPatient.attendingPhysician} • Condition: ${newPatient.condition}`,
        ],
        time: timeNow,
        tag: timeNow,
      },
      {
        id: `init-${Date.now()}-2`,
        patientId: newPatient.id,
        category: 'FOLLOW-UP',
        title: 'Initial Shift Monitoring Protocol',
        details: [
          'Perform standard Q4 vital signs check',
          'Verify patient allergy band & EHR medical history',
        ],
        time: 'Action Required',
        tag: 'Action Required',
        isActionRequired: true,
      },
    ];

    setHandoverItems((prev) => [...initialItems, ...prev]);
  };

  // Delete Patient Record
  const handleDeletePatient = (patientId: string) => {
    setPatients((prev) => {
      const updated = prev.filter((p) => p.id !== patientId);
      if (currentPatient?.id === patientId) {
        setCurrentPatient(updated.length > 0 ? updated[0] : null);
      }
      return updated;
    });

    // Clean up flags and items for the deleted patient
    setFlags((prev) => prev.filter((f) => f.patientId !== patientId));
    setHandoverItems((prev) => prev.filter((i) => i.patientId !== patientId));
  };

  // Handlers
  const handleLoginSuccess = (nurseId: string, department: string) => {
    setIsAuthenticated(true);
    setShiftInfo((prev) => ({
      ...prev,
      nurseId,
      ward: department === 'icu' ? 'ICU West Wing' : department === 'er' ? 'Emergency Dept' : 'General Ward 4',
    }));
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentTab('login');
  };

  const handleResolveFlag = (flagId: string, note: string) => {
    setFlags((prev) =>
      prev.map((f) =>
        f.id === flagId
          ? { ...f, resolved: true, resolutionNote: note }
          : f
      )
    );

    // Also add to completed items
    const resolvedFlag = flags.find((f) => f.id === flagId);
    if (resolvedFlag) {
      const newItem: HandoverItem = {
        id: `resolved-${Date.now()}`,
        patientId: resolvedFlag.patientId,
        category: 'COMPLETED',
        title: `${resolvedFlag.title} Verified`,
        details: [note],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tag: 'Resolved',
      };
      setHandoverItems((prev) => [newItem, ...prev]);
    }
  };

  const handleGenerateDashboardFromVoice = (transcript: string) => {
    if (!currentPatient) return;
    // Dynamically parse or inject clinical items from the voice transcript
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add a completed item for the dictated note
    const newItem: HandoverItem = {
      id: `voice-${Date.now()}`,
      patientId: currentPatient.id,
      category: 'COMPLETED',
      title: `Voice Assessment Dictated (${timeNow})`,
      details: [
        transcript.slice(0, 120) + (transcript.length > 120 ? '...' : ''),
        'Vitals documented & parsed into clinical record',
      ],
      time: timeNow,
      tag: timeNow,
    };

    setHandoverItems((prev) => [newItem, ...prev]);
    setCurrentTab('dashboard');
  };

  const handleConfirmAndNext = () => {
    if (patients.length === 0) return;
    if (!currentPatient) {
      setCurrentPatient(patients[0]);
      return;
    }
    // Switch to next patient in array
    const currentIndex = patients.findIndex((p) => p.id === currentPatient.id);
    const nextIndex = (currentIndex + 1) % patients.length;
    setCurrentPatient(patients[nextIndex]);
  };

  const screenTitle = 
    currentTab === 'login'
      ? 'Login'
      : currentTab === 'voice-note'
      ? 'Voice Note'
      : currentTab === 'dashboard'
      ? 'Dashboard'
      : 'Export';

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col items-center">
      {/* Main Container */}
      {viewMode === 'mobile' ? (
        /* PHONE VIEWPORT SIMULATOR / CONTAINER */
        <div className="w-full max-w-[440px] min-h-[calc(100vh-36px)] bg-[#f7f9fb] shadow-2xl relative flex flex-col my-0 sm:my-3 sm:rounded-[36px] overflow-hidden border border-[#eceef0]">
          {/* Sticky Header */}
          <Header
            title={screenTitle}
            shiftInfo={shiftInfo}
            onLogout={handleLogout}
            onNavigate={(screen) => setCurrentTab(screen as ScreenTab)}
            onSwitchView={() => setViewMode((prev) => (prev === 'mobile' ? 'workstation' : 'mobile'))}
          />

          {/* Active Screen View */}
          <main className="flex-1 px-4 pt-4 pb-24 overflow-y-auto">
            {currentTab === 'login' && (
              <LoginScreen
                shiftInfo={shiftInfo}
                onLoginSuccess={handleLoginSuccess}
              />
            )}

            {currentTab === 'voice-note' && (
              <VoiceNoteScreen
                currentPatient={currentPatient}
                allPatients={patients}
                onSelectPatient={(p) => setCurrentPatient(p)}
                onGenerateDashboard={handleGenerateDashboardFromVoice}
                onNavigateBack={() => setCurrentTab('dashboard')}
                onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
              />
            )}

            {currentTab === 'dashboard' && (
              <DashboardScreen
                currentPatient={currentPatient}
                allPatients={patients}
                flags={flags}
                handoverItems={handoverItems}
                onSelectPatient={(p) => setCurrentPatient(p)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onResolveFlag={handleResolveFlag}
                onConfirmAndNext={handleConfirmAndNext}
                onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
                onOpenDeletePatient={(p) => setPatientToDelete(p)}
              />
            )}

            {currentTab === 'export' && (
              <ExportScreen
                currentPatient={currentPatient}
                allPatients={patients}
                shiftInfo={shiftInfo}
                items={handoverItems}
                flags={flags}
                onSelectPatient={(p) => setCurrentPatient(p)}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
                onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
                onOpenDeletePatient={(p) => setPatientToDelete(p)}
              />
            )}
          </main>

          {/* Fixed Bottom Navigation */}
          <BottomNav
            currentTab={currentTab}
            onTabChange={(tab) => setCurrentTab(tab)}
            pendingFlagsCount={pendingFlagsCount}
          />

          {/* Export Modal Overlay */}
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            currentPatient={currentPatient}
            shiftInfo={shiftInfo}
            items={handoverItems}
            flags={flags}
          />

          {/* Add Patient Modal */}
          <AddPatientModal
            isOpen={isAddPatientModalOpen}
            onClose={() => setIsAddPatientModalOpen(false)}
            onAddPatient={handleAddPatient}
            existingCount={patients.length}
          />

          {/* Delete Patient Confirmation Modal */}
          <DeletePatientConfirmModal
            isOpen={!!patientToDelete}
            patient={patientToDelete}
            onClose={() => setPatientToDelete(null)}
            onConfirmDelete={handleDeletePatient}
          />
        </div>
      ) : (
        /* EXPANDED CLINICAL WORKSTATION MULTI-COLUMN LAYOUT */
        <div className="w-full max-w-7xl px-4 py-6 flex-1 flex flex-col">
          {/* Workstation Header */}
          <Header
            title={`${screenTitle} · ICU West Wing Station`}
            shiftInfo={shiftInfo}
            onLogout={handleLogout}
            onNavigate={(screen) => setCurrentTab(screen as ScreenTab)}
            onSwitchView={() => setViewMode((prev) => (prev === 'mobile' ? 'workstation' : 'mobile'))}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
            {/* Left Column: Ward Patient Roster (3 cols) */}
            <aside aria-label="Ward Patient Roster" className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eceef0]">
                <div className="flex items-center justify-between pb-3 border-b border-[#eceef0]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006a61] text-[20px]">hotel</span>
                    <h2 className="text-sm font-bold text-[#191c1e]">Ward Patient Roster</h2>
                  </div>
                  <button
                    onClick={() => setIsAddPatientModalOpen(true)}
                    className="text-[11px] bg-[#000000] text-white hover:bg-neutral-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Bed</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-3">
                  {patients.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#76777d]">
                      No active beds in ward roster.
                    </div>
                  ) : (
                    patients.map((p) => {
                      const isSelected = currentPatient && p.id === currentPatient.id;
                      const pFlags = flags.filter((f) => f.patientId === p.id && !f.resolved);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setCurrentPatient(p)}
                          className={`text-left p-3 rounded-xl transition-all border flex flex-col gap-1.5 cursor-pointer relative group ${
                            isSelected
                              ? 'bg-[#dae2fd]/50 border-[#131b2e] shadow-xs'
                              : 'bg-[#f7f9fb] border-[#eceef0] hover:bg-[#eceef0]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-[#131b2e] text-[#dae2fd] text-xs font-bold flex items-center justify-center">
                                {p.avatarText}
                              </span>
                              <span className="font-bold text-xs text-[#191c1e]">{p.roomBed}</span>
                              <span className="text-[10px] text-[#45464d]">{p.id}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                p.acuity === 'critical' ? 'bg-[#86f2e4] text-[#006f66]' : 'bg-[#e0e3e5] text-[#45464d]'
                              }`}>
                                {p.acuity}
                              </span>
                              {/* Delete patient button in workstation list */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPatientToDelete(p);
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center text-[#76777d] hover:text-[#ba1a1a] hover:bg-black/5 transition-colors opacity-70 group-hover:opacity-100"
                                title={`Discharge / Delete ${p.roomBed}`}
                              >
                                <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-[#45464d] truncate">
                            {p.name} • {p.gender}, {p.age}y
                          </div>

                          {pFlags.length > 0 && (
                            <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                              <span className="material-symbols-outlined text-[13px] text-amber-600">warning</span>
                              <span>{pFlags.length} Check Pending</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Navigation Panel */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eceef0]">
                <h2 className="text-xs font-bold text-[#76777d] uppercase tracking-wider mb-2">Screen Navigation</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                      currentTab === 'dashboard' ? 'bg-[#000000] text-white' : 'bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentTab('voice-note')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                      currentTab === 'voice-note' ? 'bg-[#000000] text-white' : 'bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                    Voice Note
                  </button>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0]"
                  >
                    <span className="material-symbols-outlined text-[18px]">ios_share</span>
                    Export PDF
                  </button>
                  <button
                    onClick={() => setCurrentTab('login')}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                      currentTab === 'login' ? 'bg-[#000000] text-white' : 'bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                    Login / ID
                  </button>
                </div>
              </div>
            </aside>

            {/* Center Column: Active Mobile Screen View (6 cols) */}
            <main className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-[#eceef0] relative overflow-y-auto max-h-[820px]">
              {currentTab === 'login' && (
                <LoginScreen
                  shiftInfo={shiftInfo}
                  onLoginSuccess={handleLoginSuccess}
                />
              )}

              {currentTab === 'voice-note' && (
                <VoiceNoteScreen
                  currentPatient={currentPatient}
                  allPatients={patients}
                  onSelectPatient={(p) => setCurrentPatient(p)}
                  onGenerateDashboard={handleGenerateDashboardFromVoice}
                  onNavigateBack={() => setCurrentTab('dashboard')}
                  onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
                />
              )}

              {currentTab === 'dashboard' && (
                <DashboardScreen
                  currentPatient={currentPatient}
                  allPatients={patients}
                  flags={flags}
                  handoverItems={handoverItems}
                  onSelectPatient={(p) => setCurrentPatient(p)}
                  onOpenExportModal={() => setIsExportModalOpen(true)}
                  onResolveFlag={handleResolveFlag}
                  onConfirmAndNext={handleConfirmAndNext}
                  onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
                  onOpenDeletePatient={(p) => setPatientToDelete(p)}
                />
              )}

              {currentTab === 'export' && (
                <ExportScreen
                  currentPatient={currentPatient}
                  allPatients={patients}
                  shiftInfo={shiftInfo}
                  items={handoverItems}
                  flags={flags}
                  onSelectPatient={(p) => setCurrentPatient(p)}
                  onNavigateToDashboard={() => setCurrentTab('dashboard')}
                  onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
                  onOpenDeletePatient={(p) => setPatientToDelete(p)}
                />
              )}
            </main>

            {/* Right Column: Shift Telemetry & Clinical Feed (3 cols) */}
            <aside aria-label="Shift Handover Telemetry" className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eceef0]">
                <div className="flex items-center gap-2 pb-2 border-b border-[#eceef0]">
                  <span className="material-symbols-outlined text-[#006a61] text-[20px]">security</span>
                  <h2 className="text-sm font-bold text-[#191c1e]">HIPAA & Compliance</h2>
                </div>
                <div className="py-2 text-xs text-[#45464d] space-y-2">
                  <div className="p-2.5 bg-[#86f2e4]/30 rounded-xl text-[#006f66] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>AES-256 Shift Encryption Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Clinical handover data is retained in local encrypted cache for shift #402. Audio waveforms are processed securely according to hospital compliance standards.
                  </p>
                </div>
              </div>

              {/* Quick Shift Summary stats */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eceef0]">
                <h2 className="text-xs font-bold text-[#76777d] uppercase tracking-wider mb-3">Shift Status Summary</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#f2f4f6]">
                    <span className="text-[#45464d]">Pending Lab Results:</span>
                    <span className="font-bold text-[#ba1a1a]">
                      {handoverItems.filter((i) => i.category === 'PENDING').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#f2f4f6]">
                    <span className="text-[#45464d]">Action Required Items:</span>
                    <span className="font-bold text-amber-700">
                      {handoverItems.filter((i) => i.category === 'FOLLOW-UP').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#f2f4f6]">
                    <span className="text-[#45464d]">Completed Tasks:</span>
                    <span className="font-bold text-[#006a61]">
                      {handoverItems.filter((i) => i.category === 'COMPLETED').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#f2f4f6]">
                    <span className="text-[#45464d]">AI Verification Flags:</span>
                    <span className="font-bold text-amber-800">
                      {flags.filter((f) => !f.resolved).length} unverified
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full mt-4 h-11 bg-[#000000] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export Complete Shift Report
                </button>
              </div>
            </aside>
          </div>

          {/* Export Modal for Workstation */}
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            currentPatient={currentPatient}
            shiftInfo={shiftInfo}
            items={handoverItems}
            flags={flags}
          />

          {/* Add Patient Modal for Workstation */}
          <AddPatientModal
            isOpen={isAddPatientModalOpen}
            onClose={() => setIsAddPatientModalOpen(false)}
            onAddPatient={handleAddPatient}
            existingCount={patients.length}
          />

          {/* Delete Patient Confirmation Modal for Workstation */}
          <DeletePatientConfirmModal
            isOpen={!!patientToDelete}
            patient={patientToDelete}
            onClose={() => setPatientToDelete(null)}
            onConfirmDelete={handleDeletePatient}
          />
        </div>
      )}
    </div>
  );
}
