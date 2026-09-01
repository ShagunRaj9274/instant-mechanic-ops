import { describe, expect, it } from 'vitest';
import {
  ACTIVE_STATUSES,
  canTransition,
  nextStatus,
  STATUS_FLOW,
} from '../src/lib/booking-status';

describe('dispatch state machine', () => {
  it('walks a booking through the happy path', () => {
    let status = 'PENDING' as const satisfies keyof typeof STATUS_FLOW;
    const path: string[] = [status];
    let current: string | null = status;
    while (current && nextStatus(current as never)) {
      current = nextStatus(current as never);
      if (current) path.push(current);
    }
    expect(path).toEqual(['PENDING', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED']);
  });

  it('rejects jumps that skip a step', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(false);
  });

  it('allows cancelling anything that has not finished', () => {
    for (const status of ACTIVE_STATUSES) {
      expect(canTransition(status, 'CANCELLED')).toBe(true);
    }
  });

  it('treats completed and cancelled as terminal', () => {
    expect(STATUS_FLOW.COMPLETED).toHaveLength(0);
    expect(STATUS_FLOW.CANCELLED).toHaveLength(0);
    expect(nextStatus('COMPLETED')).toBeNull();
  });
});
