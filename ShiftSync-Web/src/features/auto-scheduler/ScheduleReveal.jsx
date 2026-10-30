import {useLayoutEffect, useRef} from 'react';

// Adapted from React Bits AnimatedList's pop pose and spring easing.
// https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/AnimatedList/AnimatedList.jsx
// Copyright (c) 2026 David Haz. See react-bits-LICENSE.md in this directory.
// The schedule adds a flight from demand to employee before the spring settle.
const spring = 'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

export default function ScheduleReveal({active, replayKey, motionMode = 'system', children}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!active || !element?.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMode === 'reduced' || (motionMode === 'system' && preference.matches)) return;
    const easing = CSS.supports('animation-timing-function', spring)
      ? spring : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
    // Keep the flight outside table overflow and sticky cell stacking contexts.
    const cell = element.closest('td');
    const table = element.closest('table');
    const source = table?.querySelector('.sch-demand-summary-row')?.cells[cell?.cellIndex]
      || table?.tHead?.rows[0]?.cells[cell?.cellIndex];
    const initialTarget = element.getBoundingClientRect();
    if (initialTarget.bottom > window.innerHeight - 24 || initialTarget.top < 130) {
      element.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});
    }
    const target = element.getBoundingClientRect();
    const origin = source?.getBoundingClientRect();
    const startX = origin ? origin.left + (origin.width - target.width) / 2 : target.left;
    const startY = Math.max(140, Math.min(origin?.top ?? target.top - 150, window.innerHeight - target.height - 24));
    const dx = startX - target.left;
    const dy = startY - target.top;
    const ghost = element.cloneNode(true);
    ghost.className = 'sch-replay-flying-card';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');
    ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    Object.assign(ghost.style, {position: 'fixed', left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, zIndex: '10000', pointerEvents: 'none'});
    document.body.appendChild(ghost);
    element.style.visibility = 'hidden';
    source?.classList.add('sch-replay-source-active');
    let settle;
    const move = ghost.animate([
      {transform: `translate(${dx}px, ${dy}px) scale(.72) rotate(-4deg)`, opacity: 0},
      {transform: `translate(${dx}px, ${dy - 12}px) scale(.92) rotate(-3deg)`, opacity: 1, offset: .2},
      {transform: `translate(${dx * .45 + 32}px, ${dy * .5 - 25}px) scale(1.04) rotate(2deg)`, opacity: 1, offset: .55},
      {transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1}
    ], {duration: 1000, easing: 'cubic-bezier(.22,.65,.3,1)', fill: 'both'});
    move.onfinish = () => {
      ghost.remove();
      element.style.visibility = '';
      source?.classList.remove('sch-replay-source-active');
      settle = element.animate([{transform: 'scale(.94)'}, {transform: 'scale(1)'}], {duration: 320, easing});
    };
    const cancel = () => {
      move.cancel(); settle?.cancel(); ghost.remove();
      element.style.visibility = '';
      source?.classList.remove('sch-replay-source-active');
    };
    if (motionMode === 'system') preference.addEventListener('change', cancel);
    return () => {cancel(); preference.removeEventListener('change', cancel);};
  }, [active, replayKey, motionMode]);
  return <div ref={ref} className="sch-bits-reveal" data-active={active || undefined}>{children}</div>;
}
