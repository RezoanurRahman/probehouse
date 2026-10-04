import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../server.js';
import {
  ACTIVITY_KINDS,
  ACTIVITY_TONES,
  PARTICIPANT_STATUSES,
  SESSION_FORMATS,
  SESSION_STATUSES,
  STUDY_STATUSES,
  type ActivityItem,
  type DashboardData,
  type Participant,
  type Session,
  type Study,
  type StudyDetail,
} from '../shared/types.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

function requireItem<T>(item: T | undefined, description: string): T {
  if (item === undefined) {
    throw new Error(`Expected ${description} to exist`);
  }
  return item;
}

async function getDashboard(): Promise<DashboardData> {
  const response = await app.inject({ method: 'GET', url: '/api/dashboard' });
  expect(response.statusCode).toBe(200);
  return response.json<DashboardData>();
}

async function listStudies(status?: string): Promise<Study[]> {
  const url = status === undefined ? '/api/studies' : `/api/studies?status=${status}`;
  const response = await app.inject({ method: 'GET', url });
  expect(response.statusCode).toBe(200);
  const body = response.json<Study[]>();
  expect(Array.isArray(body)).toBe(true);
  return body;
}

async function listActivity(): Promise<ActivityItem[]> {
  const response = await app.inject({ method: 'GET', url: '/api/activity' });
  expect(response.statusCode).toBe(200);
  const body = response.json<ActivityItem[]>();
  expect(Array.isArray(body)).toBe(true);
  return body;
}

const validStudy = {
  title: 'Pricing page comprehension test',
  objective: 'Check whether the three plans are understood without guidance.',
  owner: 'Rae Kim',
  targetParticipants: 9,
  tags: ['pricing', 'comprehension'],
};

describe('Probehouse API', () => {
  it('serves the health check contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ ok: true, service: 'probehouse' });
  });

  it('returns a dashboard with stats and seeded research data', async () => {
    const dashboard = await getDashboard();

    expect(dashboard.studies.length).toBeGreaterThanOrEqual(4);
    expect(dashboard.participants.length).toBeGreaterThanOrEqual(8);
    expect(dashboard.sessions.length).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(dashboard.activity)).toBe(true);
    expect(dashboard.activity.length).toBeGreaterThanOrEqual(1);

    for (const value of Object.values(dashboard.stats)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(dashboard.stats.activeStudies).toBe(
      dashboard.studies.filter((study) => study.status !== 'complete').length,
    );
    expect(dashboard.stats.upcomingSessions).toBe(
      dashboard.sessions.filter((session) => session.status === 'scheduled').length,
    );

    const study = requireItem(dashboard.studies[0], 'a seeded study');
    expect(study).toMatchObject({
      id: expect.any(String),
      code: expect.any(String),
      title: expect.any(String),
      objective: expect.any(String),
      owner: expect.any(String),
      targetParticipants: expect.any(Number),
    });
    for (const seededStudy of dashboard.studies) {
      expect(STUDY_STATUSES).toContain(seededStudy.status);
      expect(seededStudy.createdAt).toEqual(expect.any(String));
    }

    for (const participant of dashboard.participants) {
      expect(PARTICIPANT_STATUSES).toContain(participant.status);
      expect(participant.name.length).toBeGreaterThan(0);
      expect(participant.studyId).toMatch(/^study-\d+$/);
    }

    for (const session of dashboard.sessions) {
      expect(SESSION_STATUSES).toContain(session.status);
      expect(SESSION_FORMATS).toContain(session.format);
      expect(session.durationMinutes).toBeGreaterThan(0);
    }
  });

  it('filters studies by status and rejects unknown statuses', async () => {
    const allStudies = await listStudies();
    expect(allStudies.length).toBeGreaterThanOrEqual(4);

    const recruiting = await listStudies('recruiting');
    expect(recruiting.length).toBeGreaterThanOrEqual(1);
    expect(recruiting.every((study) => study.status === 'recruiting')).toBe(true);
    expect(recruiting.map((study) => study.id).sort()).toEqual(
      allStudies
        .filter((study) => study.status === 'recruiting')
        .map((study) => study.id)
        .sort(),
    );

    const invalid = await app.inject({
      method: 'GET',
      url: '/api/studies?status=archived',
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json<{ error: string }>().error).toMatch(/status/i);
  });

  it('returns study detail with participants and sessions', async () => {
    const dashboard = await getDashboard();
    const target = requireItem(
      dashboard.studies.find(
        (study) =>
          dashboard.participants.some((participant) => participant.studyId === study.id) &&
          dashboard.sessions.some((session) => session.studyId === study.id),
      ),
      'a seeded study with participants and sessions',
    );

    const response = await app.inject({
      method: 'GET',
      url: `/api/studies/${target.id}`,
    });
    expect(response.statusCode).toBe(200);

    const detail = response.json<StudyDetail>();
    expect(detail.study).toEqual(target);
    expect(detail.participants.length).toBeGreaterThanOrEqual(1);
    expect(detail.sessions.length).toBeGreaterThanOrEqual(1);
    expect(detail.participants.every((participant) => participant.studyId === target.id)).toBe(
      true,
    );
    expect(detail.sessions.every((session) => session.studyId === target.id)).toBe(true);
    expect(Array.isArray(detail.activity)).toBe(true);
  });

  it('returns 404 for an unknown study id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/studies/study-does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: string }>().error).toBe('Study not found');
  });

  it('creates a planning study and lists it with the seed studies', async () => {
    const before = await getDashboard();

    const response = await app.inject({
      method: 'POST',
      url: '/api/studies',
      payload: validStudy,
    });
    expect(response.statusCode).toBe(201);

    const created = response.json<Study>();
    expect(created).toMatchObject({
      title: validStudy.title,
      objective: validStudy.objective,
      owner: validStudy.owner,
      targetParticipants: validStudy.targetParticipants,
      tags: validStudy.tags,
      status: 'planning',
    });
    expect(created.id).toMatch(/^study-\d+$/);
    expect(created.code).toMatch(/^NEW-\d+$/);
    expect(created.createdAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    expect(before.studies.some((study) => study.id === created.id)).toBe(false);

    const after = await getDashboard();
    expect(after.studies.length).toBe(before.studies.length + 1);
    const listed = requireItem(
      after.studies.find((study) => study.id === created.id),
      'the created study in the dashboard',
    );
    expect(listed).toEqual(created);
  });

  const invalidStudyPayloads: Array<[string, Record<string, unknown>]> = [
    [
      'a missing title',
      {
        objective: validStudy.objective,
        owner: validStudy.owner,
        targetParticipants: validStudy.targetParticipants,
      },
    ],
    ['a blank title', { ...validStudy, title: '   ' }],
    [
      'a missing objective',
      {
        title: validStudy.title,
        owner: validStudy.owner,
        targetParticipants: validStudy.targetParticipants,
      },
    ],
    [
      'a missing owner',
      {
        title: validStudy.title,
        objective: validStudy.objective,
        targetParticipants: validStudy.targetParticipants,
      },
    ],
    [
      'a missing target',
      {
        title: validStudy.title,
        objective: validStudy.objective,
        owner: validStudy.owner,
      },
    ],
    ['a zero target', { ...validStudy, targetParticipants: 0 }],
    ['a negative target', { ...validStudy, targetParticipants: -4 }],
    ['a non-numeric target', { ...validStudy, targetParticipants: 'many' }],
    ['non-string tags', { ...validStudy, tags: 'pricing' }],
  ];

  it.each(invalidStudyPayloads)('rejects a study payload with %s', async (_label, payload) => {
    const before = await getDashboard();

    const response = await app.inject({
      method: 'POST',
      url: '/api/studies',
      payload,
    });
    expect(response.statusCode).toBe(400);
    const body = response.json<{ error?: string }>();
    expect(typeof body.error).toBe('string');
    expect(requireItem(body.error, 'an error message').length).toBeGreaterThan(0);

    const after = await getDashboard();
    expect(after.studies.length).toBe(before.studies.length);
  });

  it('moves a study status and reflects it in the filtered list and detail', async () => {
    const before = await getDashboard();
    const target = requireItem(
      before.studies.find((study) => study.status === 'planning'),
      'a seeded planning study',
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/studies/${target.id}`,
      payload: { status: 'recruiting' },
    });
    expect(response.statusCode).toBe(200);

    const updated = response.json<Study>();
    expect(updated.status).toBe('recruiting');
    expect(updated.title).toBe(target.title);
    expect(updated.owner).toBe(target.owner);

    const recruiting = await listStudies('recruiting');
    expect(recruiting.some((study) => study.id === target.id)).toBe(true);

    const afterDashboard = await getDashboard();
    expect(
      requireItem(
        afterDashboard.studies.find((study) => study.id === target.id),
        'the updated study in the dashboard',
      ).status,
    ).toBe('recruiting');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/studies/${target.id}`,
    });
    expect(detail.json<StudyDetail>().study.status).toBe('recruiting');

    const unknown = await app.inject({
      method: 'PATCH',
      url: '/api/studies/study-does-not-exist',
      payload: { status: 'recruiting' },
    });
    expect(unknown.statusCode).toBe(404);

    const invalid = await app.inject({
      method: 'PATCH',
      url: `/api/studies/${target.id}`,
      payload: { status: 'shipping' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json<{ error: string }>().error).toMatch(/status/i);
  });

  it('updates a participant status and reflects it in stats and study detail', async () => {
    const before = await getDashboard();
    const target = requireItem(
      before.participants.find((participant) => participant.status === 'screening'),
      'a seeded screening participant',
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/participants/${target.id}`,
      payload: { status: 'confirmed' },
    });
    expect(response.statusCode).toBe(200);

    const updated = response.json<Participant>();
    expect(updated.status).toBe('confirmed');
    expect(updated.name).toBe(target.name);
    expect(updated.consented).toBe(target.consented);

    const after = await getDashboard();
    expect(after.stats.readyParticipants).toBe(before.stats.readyParticipants + 1);
    expect(
      requireItem(
        after.participants.find((participant) => participant.id === target.id),
        'the updated participant in the dashboard',
      ).status,
    ).toBe('confirmed');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/studies/${target.studyId}`,
    });
    expect(detail.statusCode).toBe(200);
    const detailBody = detail.json<StudyDetail>();
    expect(
      requireItem(
        detailBody.participants.find((participant) => participant.id === target.id),
        'the updated participant in study detail',
      ).status,
    ).toBe('confirmed');

    const unknown = await app.inject({
      method: 'PATCH',
      url: '/api/participants/participant-does-not-exist',
      payload: { status: 'confirmed' },
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('updates a session status and reflects it in stats and study detail', async () => {
    const before = await getDashboard();
    const target = requireItem(
      before.sessions.find((session) => session.status === 'scheduled'),
      'a seeded scheduled session',
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${target.id}`,
      payload: { status: 'completed' },
    });
    expect(response.statusCode).toBe(200);

    const updated = response.json<Session>();
    expect(updated.status).toBe('completed');
    expect(updated.title).toBe(target.title);
    expect(updated.studyId).toBe(target.studyId);

    const after = await getDashboard();
    expect(after.stats.upcomingSessions).toBe(before.stats.upcomingSessions - 1);
    expect(
      requireItem(
        after.sessions.find((session) => session.id === target.id),
        'the updated session in the dashboard',
      ).status,
    ).toBe('completed');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/studies/${target.studyId}`,
    });
    expect(detail.statusCode).toBe(200);
    const detailBody = detail.json<StudyDetail>();
    expect(
      requireItem(
        detailBody.sessions.find((session) => session.id === target.id),
        'the updated session in study detail',
      ).status,
    ).toBe('completed');

    const unknown = await app.inject({
      method: 'PATCH',
      url: '/api/sessions/session-does-not-exist',
      payload: { status: 'completed' },
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('returns activity items and records new study activity', async () => {
    const before = await listActivity();
    expect(before.length).toBeGreaterThanOrEqual(1);
    for (const entry of before) {
      expect(entry.id).toEqual(expect.any(String));
      expect(ACTIVITY_KINDS).toContain(entry.kind);
      expect(ACTIVITY_TONES).toContain(entry.tone);
      expect(entry.message.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
    }

    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/studies',
        payload: validStudy,
      })
    ).json<Study>();

    const after = await listActivity();
    expect(after.length).toBe(before.length + 1);
    const newest = requireItem(after[0], 'the newest activity item');
    expect(newest.kind).toBe('study');
    expect(newest.message).toContain(validStudy.title);
    expect(newest.message).toContain(created.code);
    expect(new Set(after.map((entry) => entry.id)).size).toBe(after.length);
  });
});
