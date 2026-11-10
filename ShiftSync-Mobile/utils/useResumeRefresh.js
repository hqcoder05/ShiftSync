import { useEffect, useRef } from 'react';
import { subscribeResumeSync } from '../services/resumeSync';
export default function useResumeRefresh(navigation, refresh) {
  const latest = useRef(refresh); latest.current = refresh;
  useEffect(() => subscribeResumeSync(() => {
    if (navigation?.isFocused?.() !== false) Promise.resolve(latest.current()).catch(() => {});
  }), [navigation]);
}
