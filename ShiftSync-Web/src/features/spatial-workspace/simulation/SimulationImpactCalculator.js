/**
 * SimulationImpactCalculator.js
 * Computes live operational workforce analytics, coverage SLA,
 * understaffed/overstaffed zones, and skill compatibility before and after simulation.
 * 
 * Traceable to BA W2.1:
 * - FR-07: Shift Requirements by Skill
 * - BR-15: Staffing allocation vs requirements
 * - FR-39: Coverage SLA & Utilization KPIs
 */

import { validateSkillForZone } from './SimulationValidator';

export function calculateWorkforceMetrics(staffList = [], zones = [], shiftRequirements = []) {
  const staffByZone = {};
  staffList.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  let totalCapacity = 0;
  let totalRequired = 0;
  let coveredPositions = 0;
  let understaffedCount = 0;
  let overstaffedCount = 0;
  let optimalCount = 0;
  let emptyCount = 0;
  let skillIssueCount = 0;

  const zoneDetails = zones.map((z) => {
    const count = (staffByZone[z.id] || []).length;
    const capacity = z.capacity || 4;

    // Requirement: use zone-specific requirement or default to half capacity (min 1)
    const required = z.requiredStaff || z.requiredCount || Math.max(1, Math.floor(capacity * 0.5));
    const missing = Math.max(0, required - count);

    totalCapacity += capacity;
    totalRequired += required;
    coveredPositions += Math.min(count, required);

    let status = 'OPTIMAL';
    if (count === 0) {
      status = 'EMPTY';
      emptyCount++;
      understaffedCount++;
    } else if (count < required) {
      status = 'UNDERSTAFFED';
      understaffedCount++;
    } else if (count > capacity) {
      status = 'OVERSTAFFED';
      overstaffedCount++;
    } else {
      optimalCount++;
    }

    // Check skill compatibility of assigned staff
    const assignedStaff = staffByZone[z.id] || [];
    const skillIssuesInZone = [];
    assignedStaff.forEach((emp) => {
      const check = validateSkillForZone(emp, z);
      if (!check.valid) {
        skillIssueCount++;
        skillIssuesInZone.push({
          empName: emp.staffName || emp.fullName || 'Nhân sự',
          reason: check.reason,
        });
      }
    });

    return {
      zoneId: z.id,
      zoneName: z.name,
      count,
      required,
      missing,
      capacity,
      status,
      assignedStaff,
      skillIssues: skillIssuesInZone,
    };
  });

  const coveragePercent = totalRequired > 0
    ? Math.min(100, Math.round((coveredPositions / totalRequired) * 100))
    : 100;

  return {
    totalStaff: staffList.length,
    totalCapacity,
    totalRequired,
    coveredPositions,
    coveragePercent,
    understaffedCount,
    overstaffedCount,
    optimalCount,
    emptyCount,
    skillIssueCount,
    zoneDetails,
  };
}

/**
 * Compare before (production snapshot) and after (simulated state)
 */
export function compareSimulationImpact(beforeStaff = [], afterStaff = [], zones = [], shiftRequirements = []) {
  const beforeMetrics = calculateWorkforceMetrics(beforeStaff, zones, shiftRequirements);
  const afterMetrics = calculateWorkforceMetrics(afterStaff, zones, shiftRequirements);

  const coverageDelta = afterMetrics.coveragePercent - beforeMetrics.coveragePercent;
  const understaffedDelta = afterMetrics.understaffedCount - beforeMetrics.understaffedCount;
  const skillIssueDelta = afterMetrics.skillIssueCount - beforeMetrics.skillIssueCount;

  // Calculate affected employees
  const beforeStaffMap = new Map(beforeStaff.map((s) => [s.id || s.staffId, s]));
  let affectedEmployeesCount = 0;
  const changedZones = new Set();

  afterStaff.forEach((s) => {
    const sid = s.id || s.staffId;
    const old = beforeStaffMap.get(sid);
    const oldZid = old?.zoneId || old?.zone?.id;
    const newZid = s.zoneId || s.zone?.id;
    if (oldZid !== newZid || s.isSimulatedModified) {
      affectedEmployeesCount++;
      if (oldZid) changedZones.add(oldZid);
      if (newZid) changedZones.add(newZid);
    }
  });

  return {
    before: beforeMetrics,
    after: afterMetrics,
    delta: {
      coverageDelta,
      understaffedDelta,
      skillIssueDelta,
      affectedEmployeesCount,
      affectedZonesCount: changedZones.size,
    },
    isImproved: coverageDelta >= 0 && afterMetrics.understaffedCount <= beforeMetrics.understaffedCount,
  };
}
