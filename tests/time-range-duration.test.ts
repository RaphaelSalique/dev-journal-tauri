import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateDurationFromTimeRange, formatTimeRangeInput } from '../src/utils/timeRange.ts';

test('formatTimeRangeInput formats a digit-only range into HH:MM-HH:MM', () => {
  assert.equal(formatTimeRangeInput('14001630'), '14:00-16:30');
});

test('calculateDurationFromTimeRange returns compact hours and minutes', () => {
  assert.equal(calculateDurationFromTimeRange('14:00-16:30'), '2h30');
});

test('calculateDurationFromTimeRange returns hours only when exact', () => {
  assert.equal(calculateDurationFromTimeRange('09:00-12:00'), '3h');
});

test('calculateDurationFromTimeRange returns minutes only for short ranges', () => {
  assert.equal(calculateDurationFromTimeRange('09:00-09:45'), '45min');
});

test('calculateDurationFromTimeRange rejects invalid or incomplete ranges', () => {
  assert.equal(calculateDurationFromTimeRange('14:00-'), null);
  assert.equal(calculateDurationFromTimeRange('16:30-14:00'), null);
  assert.equal(calculateDurationFromTimeRange('25:00-26:00'), null);
});
