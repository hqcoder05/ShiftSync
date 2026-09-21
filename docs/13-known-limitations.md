# Known Limitations and Verification Gaps

1. Documentation cannot observe a live database; row counts and production assignments are `[NOT VERIFIED]`.
2. Controller annotations prove route shape, not that every deployed reverse proxy route is configured.
3. Entity/migration details must be rechecked after schema changes; migrations are authoritative for deployed schema.
4. Mobile and Web runtime parity requires manual accounts and a running backend.
5. Optional CP-SAT benchmarks are not the default scheduling engine and require their Maven profile.
6. 3D visualization is client presentation; only backend spatial service calls prove persisted allocation.
7. Test/diagnostic controllers should be disabled or isolated in production.
8. Existing markdown may contain stale endpoint names; controller source and DTOs take precedence.
