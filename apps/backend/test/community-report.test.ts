import assert from 'node:assert/strict';
import test from 'node:test';
import type { CommunityReport } from '@saferoute/shared-types';
import { decayWeight, summariseReports } from '../src/models/community-report.model.js';

const NOW = new Date('2026-10-23T21:00:00Z').getTime();
const daysAgo = (days: number): string => new Date(NOW - days * 86_400_000).toISOString();

const report = (overrides: Partial<CommunityReport> = {}): CommunityReport => ({
  id: Math.random().toString(36).slice(2),
  position: [90.4125, 23.8103],
  tags: [],
  rating: 4,
  createdAt: daysAgo(1),
  validated: true,
  ...overrides,
});

test('report influence halves every 60 days', () => {
  assert.ok(Math.abs(decayWeight(daysAgo(60), NOW) - 0.5) < 0.001);
  assert.ok(decayWeight(daysAgo(365), NOW) < 0.02);
});

test('nearby reports aggregate into one cell, distant ones do not', () => {
  const together = summariseReports(
    [report(), report({ position: [90.41255, 23.81035] })],
    NOW,
  );
  const apart = summariseReports([report(), report({ position: [90.5, 23.9] })], NOW);

  assert.equal(together.length, 1);
  assert.equal(together[0]!.reportCount, 2);
  assert.equal(apart.length, 2);
});

test('confidence grows with corroboration', () => {
  const single = summariseReports([report()], NOW)[0]!;
  const many = summariseReports(Array.from({ length: 6 }, () => report()), NOW)[0]!;

  assert.ok(many.confidence > single.confidence);
  assert.ok(many.confidence <= 1);
});

test('unvalidated reports count for less than validated ones', () => {
  const validated = summariseReports([report({ rating: 5 })], NOW)[0]!;
  const unvalidated = summariseReports([report({ rating: 5, validated: false })], NOW)[0]!;

  assert.ok(unvalidated.confidence < validated.confidence);
  // Sentiment itself is unchanged — only how much the cell is trusted.
  assert.equal(unvalidated.sentiment, validated.sentiment);
});

test('ratings map onto a signed sentiment around neutral', () => {
  const good = summariseReports([report({ rating: 5 })], NOW)[0]!;
  const neutral = summariseReports([report({ rating: 3 })], NOW)[0]!;
  const bad = summariseReports([report({ rating: 1 })], NOW)[0]!;

  assert.equal(good.sentiment, 1);
  assert.equal(neutral.sentiment, 0);
  assert.equal(bad.sentiment, -1);
});
