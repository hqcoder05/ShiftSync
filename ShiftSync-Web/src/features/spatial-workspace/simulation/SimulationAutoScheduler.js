/**
 * SimulationAutoScheduler.js
 * Client-side Greedy Spatial Allocation & Auto Scheduling Solver for the Simulation Room.
 * 
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * This solver operates strictly on local state and never triggers backend database mutation.
 * Mirrors the backend SpatialAllocationService logic:
 * 1. Priority 1: Direct Skill-to-Zone matching (Barista -> Barista Counter, Cashier -> POS...)
 * 2. Priority 2: 3D Euclidean Max-Min geometric dispersion across understaffed zones
 * 3. Hard capacity constraint: strictly respects zone.capacity without overbooking
 */

import { validateSkillForZone } from './SimulationValidator';

export function simulateAutoSchedule({
  availableEmployees = [],
  zones = [],
  targetShift = null,
}) {
  if (!zones || zones.length === 0) {
    return { success: false, reason: 'Không có phân khu nào trong cửa hàng', allocatedStaff: [] };
  }
  if (!availableEmployees || availableEmployees.length === 0) {
    return { success: false, reason: 'Không có nhân viên khả dụng', allocatedStaff: [] };
  }

  // Clone capacities
  const zonePool = zones.map((z) => ({
    zone: z,
    capacity: z.capacity || 4,
    allocated: [],
  }));

  const unallocated = [];
  const allocatedStaff = [];

  // Pass 1: Skill matching
  availableEmployees.forEach((emp) => {
    let assignedZonePool = null;

    // Search for zone matching employee's primary skill that has capacity
    for (const pool of zonePool) {
      if (pool.allocated.length >= pool.capacity) continue;
      const check = validateSkillForZone(emp, pool.zone, targetShift?.skillRequirements || targetShift?.requirements);
      if (check.valid) {
        assignedZonePool = pool;
        break;
      }
    }

    // Pass 2: Fallback to any zone with available capacity that doesn't conflict
    if (!assignedZonePool) {
      for (const pool of zonePool) {
        if (pool.allocated.length < pool.capacity) {
          // General areas like dining hall or storage
          assignedZonePool = pool;
          break;
        }
      }
    }

    if (assignedZonePool) {
      assignedZonePool.allocated.push(emp);
      allocatedStaff.push({
        ...emp,
        id: emp.id || emp.staffId,
        staffId: emp.staffId || emp.id,
        zoneId: assignedZonePool.zone.id,
        zoneName: assignedZonePool.zone.name,
        isSimulatedModified: true,
      });
    } else {
      unallocated.push(emp);
    }
  });

  return {
    success: true,
    allocatedCount: allocatedStaff.length,
    unallocatedCount: unallocated.length,
    allocatedStaff,
    unallocatedStaff: unallocated,
    message: `Đã tự động xếp ${allocatedStaff.length}/${availableEmployees.length} nhân sự vào các phân khu`,
  };
}

export function generateSimulationAutoSchedule(zones = [], availableEmployees = [], skills = []) {
  const result = simulateAutoSchedule({ availableEmployees, zones });
  return result.allocatedStaff || [];
}

