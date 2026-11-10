import { useCallback, useEffect, useRef, useState } from 'react';

export default function useActionGuard() {
  const locks = useRef(new Set());
  const mounted = useRef(true);
  const [busy, setBusy] = useState({});
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const runAction = useCallback(async (key, action) => {
    if (locks.current.has(key)) return;
    locks.current.add(key);
    if (mounted.current) setBusy((prev) => ({ ...prev, [key]: true }));
    const started = Date.now();
    try { return await action(); } finally {
      const remaining = Math.max(0, 1500 - (Date.now() - started));
      if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
      locks.current.delete(key);
      if (mounted.current) setBusy((prev) => ({ ...prev, [key]: false }));
    }
  }, []);
  return { runAction, busy };
}
