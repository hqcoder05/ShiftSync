// Dependency injection keeps lifecycle ordering testable without a native device.
export function createResumeCoordinator({ readSession, validate, syncShifts, isOnline, isActive, publish, onError = () => {} }) {
  let stopped = false, running = false, pending = false, epoch = 0;
  const eligible = () => !stopped && isOnline() && isActive();
  async function request() {
    if (!eligible()) return;
    pending = true;
    if (running) return;
    running = true;
    try {
      while (pending && eligible()) {
        pending = false;
        const revision = epoch;
        try {
          const owner = await readSession();
          if (!owner?.email || !owner?.token || !eligible()) continue;
          await validate(owner.email); // Shared API layer refreshes or revokes an expired token.
          const current = await readSession();
          if (revision !== epoch || !eligible() || current.email !== owner.email || !current.token) continue;
          await syncShifts(owner.email);
          const after = await readSession();
          if (revision === epoch && eligible() && after.email === owner.email && after.token) publish({ email: owner.email, syncedAt: Date.now() });
        } catch (error) { if (!stopped) onError(error); }
      }
    } finally { running = false; }
  }
  return { request, suspend() { epoch += 1; pending = false; }, stop() { stopped = true; epoch += 1; pending = false; } };
}
