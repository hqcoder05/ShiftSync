/**
 * workstationOccupancy.test.js
 * Unit Test Suite for PHASE 2B: Workstation Occupancy & Staff Visualization
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWorkstationOccupancies,
  OCCUPANCY_STATES,
} from './workstationOccupancy.js';

describe('PHASE 2B: Workstation Occupancy & Staff Visualization Engine', () => {
  const mockWorkstations = [
    {
      id: 'ws-pos-1',
      name: 'Máy POS Thu Ngân 01',
      code: 'WS-POS-1',
      workstationType: 'COUNTER',
      zoneId: 'zone-cashier',
      capacity: 1,
    },
    {
      id: 'ws-barista-1',
      name: 'Máy Pha Espresso #1',
      code: 'WS-ESP-1',
      workstationType: 'EQUIPMENT',
      zoneId: 'zone-barista',
      capacity: 1,
    },
    {
      id: 'ws-barista-2',
      name: 'Máy Pha Espresso #2',
      code: 'WS-ESP-2',
      workstationType: 'EQUIPMENT',
      zoneId: 'zone-barista',
      capacity: 1,
    },
    {
      id: 'ws-empty',
      name: 'Quầy Phục Vụ 01',
      code: 'WS-SRV-1',
      workstationType: 'GENERIC_COUNTER',
      zoneId: 'zone-service',
      capacity: 1,
    },
  ];

  const mockShift = {
    id: 'shift-morning-1',
    shiftDate: '2026-10-14',
    startTime: '08:00',
    endTime: '16:00',
  };

  test('1. Workstation with direct valid staff assignment resolves to ASSIGNED', () => {
    const assignments = [
      {
        id: 'assign-1',
        staffId: 'user-bich',
        staffName: 'Trần Thị Bích',
        skillName: 'Thu ngân',
        workstationId: 'ws-pos-1',
        zoneId: 'zone-cashier',
      },
    ];

    const result = resolveWorkstationOccupancies(
      mockWorkstations,
      assignments,
      [],
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
    );

    const posOccupancy = result.get('ws-pos-1');
    assert.ok(posOccupancy);
    assert.equal(posOccupancy.state, OCCUPANCY_STATES.ASSIGNED);
    assert.equal(posOccupancy.occupancyCount, 1);
    assert.equal(posOccupancy.assignedStaff[0].staffId, 'user-bich');
    assert.equal(posOccupancy.assignedStaff[0].staffName, 'Trần Thị Bích');
    assert.equal(posOccupancy.assignedStaff[0].isDirectMapping, true);
    assert.equal(posOccupancy.assignedStaff[0].isPresent, false); // No attendance yet
    assert.match(posOccupancy.statusReason, /theo lịch/);
  });

  test('2. Workstation with no staff assignment resolves to UNASSIGNED when data loaded successfully', () => {
    const assignments = [
      {
        id: 'assign-1',
        staffId: 'user-bich',
        staffName: 'Trần Thị Bích',
        workstationId: 'ws-pos-1',
        zoneId: 'zone-cashier',
      },
    ];

    const result = resolveWorkstationOccupancies(
      mockWorkstations,
      assignments,
      [],
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
    );

    const emptyWs = result.get('ws-empty');
    assert.ok(emptyWs);
    assert.equal(emptyWs.state, OCCUPANCY_STATES.UNASSIGNED);
    assert.equal(emptyWs.occupancyCount, 0);
    assert.equal(emptyWs.assignedStaff.length, 0);
    assert.match(emptyWs.statusReason, /Trống/);
  });

  test('3. Distinguishes Scheduled Assignment from Actual Presence (Attendance check-in)', () => {
    const assignments = [
      {
        id: 'assign-an',
        staffId: 'user-an',
        staffName: 'Nguyễn Văn An',
        skillName: 'Barista',
        workstationId: 'ws-barista-1',
        zoneId: 'zone-barista',
      },
    ];

    // Case 3a: Staff has checked in and is actively working
    const attendanceRecordsActive = [
      {
        id: 'att-1',
        shiftAssignmentId: 'assign-an',
        staffId: 'user-an',
        workstationId: 'ws-barista-1',
        checkInTime: '2026-10-14T07:58:00Z',
        checkOutTime: null, // Active
        status: 'ON_TIME',
      },
    ];

    const resultActive = resolveWorkstationOccupancies(
      mockWorkstations,
      assignments,
      attendanceRecordsActive,
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
    );

    const activeOccupancy = resultActive.get('ws-barista-1');
    assert.equal(activeOccupancy.state, OCCUPANCY_STATES.ASSIGNED);
    assert.equal(activeOccupancy.assignedStaff[0].isPresent, true);
    assert.equal(activeOccupancy.assignedStaff[0].attendanceStatus, 'ON_TIME');
    assert.match(activeOccupancy.statusReason, /Đang trực \(1\/1 có mặt\)/);

    // Case 3b: Staff has checked out (shift ended)
    const attendanceRecordsCheckedOut = [
      {
        id: 'att-1',
        shiftAssignmentId: 'assign-an',
        staffId: 'user-an',
        workstationId: 'ws-barista-1',
        checkInTime: '2026-10-14T07:58:00Z',
        checkOutTime: '2026-10-14T16:02:00Z',
        status: 'ON_TIME',
      },
    ];

    const resultCheckedOut = resolveWorkstationOccupancies(
      mockWorkstations,
      assignments,
      attendanceRecordsCheckedOut,
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
    );

    const checkedOutOccupancy = resultCheckedOut.get('ws-barista-1');
    assert.equal(checkedOutOccupancy.state, OCCUPANCY_STATES.ASSIGNED);
    assert.equal(checkedOutOccupancy.assignedStaff[0].isPresent, false);
    assert.match(checkedOutOccupancy.statusReason, /theo lịch/);
  });

  test('4. Zone-only assignments must not invent a workstation binding', () => {
    // Legacy / AutoScheduled assignments that only have zoneId
    const assignments = [
      {
        id: 'assign-legacy-1',
        staffId: 'user-cuong',
        staffName: 'Lê Văn Cường',
        skillName: 'Barista',
        zoneId: 'zone-barista',
        workstationId: null, // No explicit workstation
      },
    ];

    const result = resolveWorkstationOccupancies(
      mockWorkstations,
      assignments,
      [],
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
    );

    assert.equal(result.get('ws-barista-1').state, OCCUPANCY_STATES.UNASSIGNED);
    assert.equal(result.get('ws-barista-2').state, OCCUPANCY_STATES.UNASSIGNED);
  });

  test('5. Crucial rule: Never treats API error or loading as UNASSIGNED — must be UNKNOWN', () => {
    // 5a. API Error state
    const apiError = new Error('500 Internal Server Error: Could not fetch shift assignments');
    const resultError = resolveWorkstationOccupancies(
      mockWorkstations,
      [], // Empty list from failed call
      [],
      { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: apiError }
    );

    mockWorkstations.forEach((ws) => {
      const occ = resultError.get(ws.id);
      assert.equal(occ.state, OCCUPANCY_STATES.UNKNOWN, 'Must NOT be UNASSIGNED on error');
      assert.match(occ.statusReason, /Lỗi tải dữ liệu/);
    });

    // 5b. Loading state
    const resultLoading = resolveWorkstationOccupancies(
      mockWorkstations,
      [],
      [],
      { currentShift: mockShift, hasShiftSelected: true, isLoading: true, error: null }
    );

    mockWorkstations.forEach((ws) => {
      const occ = resultLoading.get(ws.id);
      assert.equal(occ.state, OCCUPANCY_STATES.UNKNOWN, 'Must NOT be UNASSIGNED while loading');
      assert.match(occ.statusReason, /Đang tải dữ liệu/);
    });

    // 5c. No shift selected
    const resultNoShift = resolveWorkstationOccupancies(
      mockWorkstations,
      [],
      [],
      { currentShift: null, hasShiftSelected: false, isLoading: false, error: null }
    );

    mockWorkstations.forEach((ws) => {
      const occ = resultNoShift.get(ws.id);
      assert.equal(occ.state, OCCUPANCY_STATES.UNKNOWN, 'Must be UNKNOWN when no shift is selected');
    });
  });

  test('6. Handles corrupted or empty staff objects safely without throw', () => {
    const corruptedAssignments = [
      null,
      undefined,
      {},
      { id: 'assign-broken' }, // No staffId or name
    ];

    assert.doesNotThrow(() => {
      const result = resolveWorkstationOccupancies(
        mockWorkstations,
        corruptedAssignments,
        [],
        { currentShift: mockShift, hasShiftSelected: true, isLoading: false, error: null }
      );
      assert.ok(result);
    });
  });
});

test('Attendance from a different employee or assignment cannot mark a station employee present', () => {
 const ws = [{ id: 'w' }];
 const assignments = [{ id: 'a', staffId: 's', workstationId: 'w' }];
 for (const record of [
  { staffId: 'other', workstationId: 'w', checkInTime: 'now' },
  { staffId: 's', shiftAssignmentId: 'another', checkInTime: 'now' },
 ]) {
  const result = resolveWorkstationOccupancies(ws, assignments, [record], { currentShift: { id: 'shift' } });
  assert.equal(result.get('w').assignedStaff[0].isPresent, false);
 }
});
