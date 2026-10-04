import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  PARTICIPANT_STATUSES,
  SESSION_STATUSES,
  STUDY_STATUSES,
  type CreateStudyInput,
  type DashboardData,
  type Participant,
  type ParticipantStatus,
  type Session,
  type SessionStatus,
  type Study,
  type StudyDetail,
  type StudyStatus,
  type UpdateParticipantInput,
  type UpdateSessionInput,
  type UpdateStudyInput,
} from '../shared/types.js';
import { createStore, type Store } from './store.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isStudyStatus(value: string): value is StudyStatus {
  return (STUDY_STATUSES as readonly string[]).includes(value);
}

function isParticipantStatus(value: string): value is ParticipantStatus {
  return (PARTICIPANT_STATUSES as readonly string[]).includes(value);
}

function isSessionStatus(value: string): value is SessionStatus {
  return (SESSION_STATUSES as readonly string[]).includes(value);
}

function sendError(reply: FastifyReply, statusCode: number, error: string): { error: string } {
  reply.code(statusCode);
  return { error };
}

function parseCreateStudy(body: unknown): { value: CreateStudyInput } | { error: string } {
  if (!isRecord(body)) return { error: 'Request body must be a JSON object.' };
  const title = readString(body.title);
  if (title === undefined) return { error: 'title is required.' };
  const objective = readString(body.objective);
  if (objective === undefined) return { error: 'objective is required.' };
  const owner = readString(body.owner);
  if (owner === undefined) return { error: 'owner is required.' };
  const targetParticipants = body.targetParticipants;
  if (
    typeof targetParticipants !== 'number' ||
    !Number.isFinite(targetParticipants) ||
    targetParticipants <= 0
  ) {
    return { error: 'targetParticipants must be a positive number.' };
  }
  const value: CreateStudyInput = {
    title,
    objective,
    owner,
    targetParticipants,
  };
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== 'string')) {
      return { error: 'tags must be an array of strings.' };
    }
    value.tags = body.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
  return { value };
}

function parseUpdateStudy(body: unknown): { value: UpdateStudyInput } | { error: string } {
  if (!isRecord(body)) return { error: 'Request body must be a JSON object.' };
  const value: UpdateStudyInput = {};
  if (body.title !== undefined) {
    const title = readString(body.title);
    if (title === undefined) return { error: 'title must be a non-empty string.' };
    value.title = title;
  }
  if (body.objective !== undefined) {
    const objective = readString(body.objective);
    if (objective === undefined) {
      return { error: 'objective must be a non-empty string.' };
    }
    value.objective = objective;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !isStudyStatus(body.status)) {
      return {
        error: `Invalid status. Expected one of: ${STUDY_STATUSES.join(', ')}.`,
      };
    }
    value.status = body.status;
  }
  return { value };
}

function parseUpdateParticipant(
  body: unknown,
): { value: UpdateParticipantInput } | { error: string } {
  if (!isRecord(body)) return { error: 'Request body must be a JSON object.' };
  const value: UpdateParticipantInput = {};
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !isParticipantStatus(body.status)) {
      return {
        error: `Invalid status. Expected one of: ${PARTICIPANT_STATUSES.join(', ')}.`,
      };
    }
    value.status = body.status;
  }
  if (body.consented !== undefined) {
    if (typeof body.consented !== 'boolean') {
      return { error: 'consented must be a boolean.' };
    }
    value.consented = body.consented;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      return { error: 'notes must be a string.' };
    }
    value.notes = body.notes;
  }
  return { value };
}

function parseUpdateSession(body: unknown): { value: UpdateSessionInput } | { error: string } {
  if (!isRecord(body)) return { error: 'Request body must be a JSON object.' };
  const value: UpdateSessionInput = {};
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !isSessionStatus(body.status)) {
      return {
        error: `Invalid status. Expected one of: ${SESSION_STATUSES.join(', ')}.`,
      };
    }
    value.status = body.status;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      return { error: 'notes must be a string.' };
    }
    value.notes = body.notes;
  }
  return { value };
}

export function registerRoutes(app: FastifyInstance, store: Store = createStore()): void {
  app.get('/api/health', async (): Promise<{ ok: true; service: 'probehouse' }> => {
    return { ok: true, service: 'probehouse' };
  });

  app.get('/api/dashboard', async (): Promise<DashboardData> => {
    return store.getDashboard();
  });

  app.get<{ Querystring: { status?: string } }>(
    '/api/studies',
    async (request, reply): Promise<Study[] | { error: string }> => {
      const status = request.query.status?.trim();
      if (status === undefined || status.length === 0) return store.listStudies();
      if (!isStudyStatus(status)) {
        return sendError(
          reply,
          400,
          `Invalid status. Expected one of: ${STUDY_STATUSES.join(', ')}.`,
        );
      }
      return store.listStudies(status);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/studies/:id',
    async (request, reply): Promise<StudyDetail | { error: string }> => {
      const detail = store.getStudyDetail(request.params.id);
      if (detail === undefined) return sendError(reply, 404, 'Study not found');
      return detail;
    },
  );

  app.post<{ Body: unknown }>(
    '/api/studies',
    async (request, reply): Promise<Study | { error: string }> => {
      const parsed = parseCreateStudy(request.body);
      if ('error' in parsed) return sendError(reply, 400, parsed.error);
      reply.code(201);
      return store.createStudy(parsed.value);
    },
  );

  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/studies/:id',
    async (request, reply): Promise<Study | { error: string }> => {
      const parsed = parseUpdateStudy(request.body);
      if ('error' in parsed) return sendError(reply, 400, parsed.error);
      const study = store.updateStudy(request.params.id, parsed.value);
      if (study === undefined) return sendError(reply, 404, 'Study not found');
      return study;
    },
  );

  app.get('/api/activity', async () => {
    return store.listActivity();
  });

  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/participants/:id',
    async (request, reply): Promise<Participant | { error: string }> => {
      const parsed = parseUpdateParticipant(request.body);
      if ('error' in parsed) return sendError(reply, 400, parsed.error);
      const participant = store.updateParticipant(request.params.id, parsed.value);
      if (participant === undefined) {
        return sendError(reply, 404, 'Participant not found');
      }
      return participant;
    },
  );

  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/sessions/:id',
    async (request, reply): Promise<Session | { error: string }> => {
      const parsed = parseUpdateSession(request.body);
      if ('error' in parsed) return sendError(reply, 400, parsed.error);
      const session = store.updateSession(request.params.id, parsed.value);
      if (session === undefined) return sendError(reply, 404, 'Session not found');
      return session;
    },
  );
}
