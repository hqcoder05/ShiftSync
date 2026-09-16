/**
 * simulationStore.js
 * Dedicated Zustand Store for the 3D Workforce Simulation Room (Phòng thử nghiệm).
 * 
 * CRITICAL ARCHITECTURAL RULE:
 * This store operates completely isolated from production state (React Query / server state).
 * Edits made in this store MUST NEVER directly call production mutation APIs.
 */

import { create } from 'zustand';

const MAX_HISTORY = 30;

export const useSimulationStore = create((set, get) => ({
  // State flags
  isSimulating: false,
  viewMode: 'after', // 'before' (production snapshot) | 'after' (simulated scenario)
  
  // Snapshots from Server
  productionSnapshot: {
    staff: [],
    zones: [],
    shifts: [],
    skills: [],
    timestamp: null,
    version: null,
  },

  // Active Scenario & Scenario List
  activeScenarioId: 'scenario-default',
  scenarios: [
    {
      id: 'scenario-default',
      name: 'Kịch bản thử nghiệm chính',
      description: 'Mô phỏng điều chuyển và cân đối định biên',
      simulatedStaff: [],
      diffList: [],
    },
  ],

  // Active Working State
  simulatedStaff: [],
  simulatedDiff: [],

  // Undo / Redo History Stacks
  history: [], // [{ staff, diff }]
  future: [],  // [{ staff, diff }]

  // ── Helper: Save current state to history stack ──
  _pushHistory: () => {
    const { simulatedStaff, simulatedDiff, history } = get();
    const newEntry = {
      staff: JSON.parse(JSON.stringify(simulatedStaff)),
      diff: JSON.parse(JSON.stringify(simulatedDiff)),
    };
    const nextHistory = [...history, newEntry].slice(-MAX_HISTORY);
    set({
      history: nextHistory,
      future: [], // Clear redo stack on new action
    });
  },

  // ── Actions ──
  
  /**
   * Enter Simulation Room: creates a deep-cloned snapshot of production data.
   */
  enterSimulation: (productionData = {}) => {
    const rawStaff = productionData.staff || [];
    const clonedStaff = JSON.parse(JSON.stringify(rawStaff));

    const defaultScenario = {
      id: 'scenario-default',
      name: 'Kịch bản thử nghiệm chính',
      description: 'Mô phỏng điều chuyển và cân đối định biên',
      simulatedStaff: clonedStaff,
      diffList: [],
    };

    set({
      isSimulating: true,
      viewMode: 'after',
      productionSnapshot: {
        staff: JSON.parse(JSON.stringify(rawStaff)),
        zones: productionData.zones || [],
        shifts: productionData.shifts || [],
        skills: productionData.skills || [],
        timestamp: Date.now(),
        version: productionData.version ?? null,
      },
      activeScenarioId: 'scenario-default',
      scenarios: [defaultScenario],
      simulatedStaff: clonedStaff,
      simulatedDiff: [],
      history: [],
      future: [],
    });
  },

  /**
   * Exit Simulation Room: discards all temporary simulation states.
   */
  exitSimulation: () => {
    set({
      isSimulating: false,
      viewMode: 'after',
      productionSnapshot: {
        staff: [],
        zones: [],
        shifts: [],
        skills: [],
        timestamp: null,
        version: null,
      },
      simulatedStaff: [],
      simulatedDiff: [],
      scenarios: [],
      history: [],
      future: [],
    });
  },

  /**
   * Toggle between Before (production) and After (simulated).
   */
  setViewMode: (mode) => {
    set({ viewMode: mode === 'before' ? 'before' : 'after' });
  },

  /**
   * Undo the last simulation action.
   */
  undo: () => {
    const { history, future, simulatedStaff, simulatedDiff, activeScenarioId, scenarios } = get();
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    const currentSnapshot = {
      staff: JSON.parse(JSON.stringify(simulatedStaff)),
      diff: JSON.parse(JSON.stringify(simulatedDiff)),
    };
    const newFuture = [currentSnapshot, ...future].slice(0, MAX_HISTORY);

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: previousState.staff, diffList: previousState.diff };
      }
      return sc;
    });

    set({
      simulatedStaff: previousState.staff,
      simulatedDiff: previousState.diff,
      history: newHistory,
      future: newFuture,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Redo the previously undone action.
   */
  redo: () => {
    const { history, future, simulatedStaff, simulatedDiff, activeScenarioId, scenarios } = get();
    if (future.length === 0) return;

    const nextState = future[0];
    const newFuture = future.slice(1);

    const currentSnapshot = {
      staff: JSON.parse(JSON.stringify(simulatedStaff)),
      diff: JSON.parse(JSON.stringify(simulatedDiff)),
    };
    const newHistory = [...history, currentSnapshot].slice(-MAX_HISTORY);

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextState.staff, diffList: nextState.diff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextState.staff,
      simulatedDiff: nextState.diff,
      history: newHistory,
      future: newFuture,
      scenarios: updatedScenarios,
    });
  },

  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,

  /**
   * Switch between multiple scenarios.
   */
  switchScenario: (scenarioId) => {
    const { scenarios } = get();
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    set({
      activeScenarioId: scenarioId,
      simulatedStaff: JSON.parse(JSON.stringify(target.simulatedStaff)),
      simulatedDiff: JSON.parse(JSON.stringify(target.diffList)),
      history: [],
      future: [],
    });
  },

  /**
   * Create a new temporary scenario cloned from current state or snapshot.
   */
  createScenario: (name, description = '') => {
    const { scenarios, productionSnapshot } = get();
    const newId = 'scenario-' + Date.now();
    const clonedStaff = JSON.parse(JSON.stringify(productionSnapshot.staff || []));

    const newScenario = {
      id: newId,
      name: name || ('Kịch bản ' + (scenarios.length + 1)),
      description,
      simulatedStaff: clonedStaff,
      diffList: [],
    };

    set({
      scenarios: [...scenarios, newScenario],
      activeScenarioId: newId,
      simulatedStaff: clonedStaff,
      simulatedDiff: [],
      history: [],
      future: [],
    });
  },

  /**
   * Transfer an employee from one zone to another in simulation.
   */
  transferStaff: (staffId, targetZone) => {
    const { simulatedStaff, simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();
    const staffMember = simulatedStaff.find((s) => (s.id || s.staffId) === staffId);
    if (!staffMember) return;

    const fromZoneId = staffMember.zoneId || staffMember.zone?.id;
    const fromZoneName = staffMember.zoneName || staffMember.zone?.name || 'Chưa phân khu';

    if (fromZoneId === targetZone.id) return; // No change

    _pushHistory();

    const nextStaff = simulatedStaff.map((s) => {
      if ((s.id || s.staffId) === staffId) {
        return {
          ...s,
          zoneId: targetZone.id,
          zoneName: targetZone.name,
          isSimulatedModified: true,
        };
      }
      return s;
    });

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'TRANSFER',
      staffId,
      staffName: staffMember.staffName || staffMember.fullName || 'Nhân viên',
      fromZoneId,
      fromZoneName,
      toZoneId: targetZone.id,
      toZoneName: targetZone.name,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextStaff, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextStaff,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Swap two employees between their respective zones.
   */
  swapStaff: (staffAId, staffBId) => {
    const { simulatedStaff, simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();
    const staffA = simulatedStaff.find((s) => (s.id || s.staffId) === staffAId);
    const staffB = simulatedStaff.find((s) => (s.id || s.staffId) === staffBId);
    if (!staffA || !staffB) return;

    const zoneAId = staffA.zoneId || staffA.zone?.id;
    const zoneAName = staffA.zoneName || staffA.zone?.name || 'Phân khu A';
    const zoneBId = staffB.zoneId || staffB.zone?.id;
    const zoneBName = staffB.zoneName || staffB.zone?.name || 'Phân khu B';

    _pushHistory();

    const nextStaff = simulatedStaff.map((s) => {
      const sid = s.id || s.staffId;
      if (sid === staffAId) {
        return { ...s, zoneId: zoneBId, zoneName: zoneBName, isSimulatedModified: true };
      }
      if (sid === staffBId) {
        return { ...s, zoneId: zoneAId, zoneName: zoneAName, isSimulatedModified: true };
      }
      return s;
    });

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'SWAP',
      staffAId,
      staffAName: staffA.staffName || staffA.fullName || 'Nhân viên A',
      staffBId,
      staffBName: staffB.staffName || staffB.fullName || 'Nhân viên B',
      zoneAId,
      zoneAName,
      zoneBId,
      zoneBName,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextStaff, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextStaff,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Simulate employee absence due to approved leave.
   */
  simulateLeaveAbsence: (staffId, leaveReason = 'Nghỉ phép phê duyệt') => {
    const { simulatedStaff, simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();
    const staffMember = simulatedStaff.find((s) => (s.id || s.staffId) === staffId);
    if (!staffMember) return;

    const fromZoneId = staffMember.zoneId || staffMember.zone?.id;
    const fromZoneName = staffMember.zoneName || staffMember.zone?.name || 'Phân khu';

    _pushHistory();

    const nextStaff = simulatedStaff.map((s) => {
      if ((s.id || s.staffId) === staffId) {
        return {
          ...s,
          zoneId: null,
          zoneName: 'Đang nghỉ phép',
          isOnLeave: true,
          leaveReason,
          isSimulatedModified: true,
        };
      }
      return s;
    });

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'LEAVE_ABSENCE',
      staffId,
      staffName: staffMember.staffName || staffMember.fullName || 'Nhân viên',
      fromZoneId,
      fromZoneName,
      leaveReason,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextStaff, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextStaff,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Remove employee assignment in simulation (does not delete real employee).
   */
  removeSimulatedStaff: (staffId) => {
    const { simulatedStaff, simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();
    const staffMember = simulatedStaff.find((s) => (s.id || s.staffId) === staffId);
    if (!staffMember) return;

    const fromZoneId = staffMember.zoneId || staffMember.zone?.id;
    const fromZoneName = staffMember.zoneName || staffMember.zone?.name || 'Phân khu';

    _pushHistory();

    const nextStaff = simulatedStaff.filter((s) => (s.id || s.staffId) !== staffId);

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'REMOVE',
      staffId,
      staffName: staffMember.staffName || staffMember.fullName || 'Nhân viên',
      fromZoneId,
      fromZoneName,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextStaff, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextStaff,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Assign an unassigned employee to a zone in simulation.
   */
  addSimulatedStaff: (employee, targetZone) => {
    const { simulatedStaff, simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();
    const existing = simulatedStaff.find((s) => (s.id || s.staffId) === (employee.id || employee.staffId));
    if (existing) return;

    _pushHistory();

    const newStaff = {
      ...employee,
      id: employee.id || employee.staffId,
      staffId: employee.staffId || employee.id,
      zoneId: targetZone.id,
      zoneName: targetZone.name,
      isSimulatedModified: true,
    };

    const nextStaff = [...simulatedStaff, newStaff];

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'ASSIGN',
      staffId: newStaff.id,
      staffName: newStaff.staffName || newStaff.fullName || 'Nhân viên',
      toZoneId: targetZone.id,
      toZoneName: targetZone.name,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: nextStaff, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: nextStaff,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Apply a simulated Auto Schedule result across all zones in the active scenario.
   */
  applyAutoScheduleSimulation: (allocatedStaffList = [], description = 'Tự động xếp ca tối ưu') => {
    const { simulatedDiff, activeScenarioId, scenarios, _pushHistory } = get();

    _pushHistory();

    const diffEntry = {
      id: 'diff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'AUTO_SCHEDULE',
      description,
      allocatedCount: allocatedStaffList.length,
      timestamp: Date.now(),
    };

    const nextDiff = [...simulatedDiff, diffEntry];

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: allocatedStaffList, diffList: nextDiff };
      }
      return sc;
    });

    set({
      simulatedStaff: allocatedStaffList,
      simulatedDiff: nextDiff,
      scenarios: updatedScenarios,
    });
  },

  /**
   * Reset the active scenario back to initial production snapshot.
   */
  resetCurrentScenario: () => {
    const { productionSnapshot, activeScenarioId, scenarios, _pushHistory } = get();
    const resetStaff = JSON.parse(JSON.stringify(productionSnapshot.staff || []));

    _pushHistory();

    const updatedScenarios = scenarios.map((sc) => {
      if (sc.id === activeScenarioId) {
        return { ...sc, simulatedStaff: resetStaff, diffList: [] };
      }
      return sc;
    });

    set({
      simulatedStaff: resetStaff,
      simulatedDiff: [],
      scenarios: updatedScenarios,
    });
  },
}));
