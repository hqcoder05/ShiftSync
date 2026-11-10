import { MathUtils } from 'three';

const { clamp, smoothstep } = MathUtils;

export function motionEnvelope(value, start, riseEnd, fallStart, end) {
  return smoothstep(value, start, riseEnd) * (1 - smoothstep(value, fallStart, end));
}

/** A short toy performance with breathing space between each clear gesture. */
export function mascotMotion(time, engagement = 0, offset = 0, paired = false) {
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  const active = clamp(engagement, 0, 1);
  const cycle = (t + offset) % 12;
  // The paired scene reserves the middle of its cycle for the high-five.
  const stroll = paired
    ? motionEnvelope(cycle, 8.3, 8.8, 10.9, 11.8)
    : motionEnvelope(cycle, 2.8, 3.3, 5.2, 5.9);
  const hopBeat = paired
    ? motionEnvelope(cycle, 0.3, 0.7, 1.8, 2.3)
    : motionEnvelope(cycle, 6.3, 6.6, 7.7, 8.1);
  const wiggle = paired ? 0 : motionEnvelope(cycle, 8.7, 9.1, 10.4, 11.0);
  const step = Math.sin(t * 9 + offset * 2);
  const hopRhythm = Math.max(0, Math.sin(t * (active > 0.2 ? 7.2 : 6.2) + offset));
  const hop = hopRhythm ** 1.6 * (hopBeat * 0.14 + active * 0.11);
  const walk = stroll * (1 - active * 0.65);
  const sway = Math.sin(t * 2.2 + offset) * 0.045
    + wiggle * Math.sin(t * 7.8) * 0.10
    + active * Math.sin(t * 5.8 + offset) * 0.07;
  return {
    cycle, step, walk, hop, sway,
    travel: walk * Math.sin((cycle - (paired ? 8.3 : 2.8)) * 2.1) * 0.15,
    stride: step * walk * 0.48,
    footLift: Math.abs(step) * walk * 0.045,
    squash: hopBeat * Math.sin(t * 12.4 + offset * 2) * 0.035 + active * Math.sin(t * 14.4) * 0.025,
    nod: wiggle * Math.sin(t * 5.2) * 0.08,
    idleWave: motionEnvelope(cycle, 0.1, 0.65, 1.7, 2.5),
  };
}
