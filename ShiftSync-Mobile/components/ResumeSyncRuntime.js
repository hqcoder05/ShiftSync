import { useEffect } from 'react';
import { startResumeSync } from '../services/resumeSync';
export default function ResumeSyncRuntime() {
  useEffect(() => startResumeSync(), []);
  return null;
}
