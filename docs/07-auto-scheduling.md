# Auto Scheduling

## Source

Primary implementation: `shift/service/AutoScheduleService.java`; supporting validation/assignment services and DTOs `AutoScheduleResult`, `FeasibilityDiagnosticsDTO`, `ShortageDetailDTO`, `RequirementCoverageDTO`. Entry point is `ShiftController` `/auto-schedule`.

## Pipeline

```text
request/date/store
 -> load shifts, templates, staff, employment, skills, availability, leave and config
 -> generate candidates
 -> hard-constraint filtering
 -> score/rank candidates
 -> deterministic tie-break
 -> mutate assignment state
 -> repair/diagnostics/shortage result
 -> transaction commit or rollback
```

## Hard constraints

Skill and expiry, active employment/store access, availability/blackout, leave, overlap, rest and contract/working-hour constraints are validated before assignment. A candidate failing a hard rule is removed rather than penalized.

## Soft objectives

Scheduler configuration and fairness weights influence ranking. Tests `SchedulingQualityAndFairnessTest`, `SchedulingPhase51ForensicVerificationTest`, `SchedulingPhase52WeightedOptimizationTest`, `SchedulingPhase53BackendClosureTest` and `SchedulingProductionHardeningTest` document expected fairness/determinism behavior.

## Failure handling

Unfilled requirements are returned as shortage/coverage diagnostics. Transactional mutation must not leave partial assignments when the operation fails. Benchmark CP-SAT classes are a separate optional profile, not the default production path.

## Pseudocode

```text
for shift in deterministicShiftOrder:
  candidates = activeStaff(shift.store)
  candidates = candidates.filter(hardConstraints)
  ranked = candidates.sort(score, fairness, deterministicTieBreak)
  assign best candidate while requirement remains
return assignments + coverage + shortages
```

The exact numerical weights and repair bounds must be read from the current service/config; this document intentionally does not invent constants.
