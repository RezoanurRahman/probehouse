import type {
  CreateStudyInput,
  DashboardData,
  Participant,
  Session,
  Study,
  StudyDetail,
  UpdateParticipantInput,
  UpdateSessionInput,
  UpdateStudyInput,
} from '../shared/types';

const API_BASE = '/api';

type RequestMethod = 'GET' | 'POST' | 'PATCH';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessageFrom(payload: unknown, response: Response): string {
  if (isRecord(payload) && typeof payload.error === 'string' && payload.error.trim() !== '') {
    return payload.error;
  }

  const statusText = response.statusText.trim();
  return statusText === ''
    ? `The Probehouse API responded with status ${response.status}.`
    : `The Probehouse API responded with status ${response.status} ${statusText}.`;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  let body: string | undefined;

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch {
    throw new ApiError(
      'Could not reach the Probehouse API. Check that the local server is running and try again.',
      0,
    );
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(errorMessageFrom(payload, response), response.status);
  }

  return payload as T;
}

export function fetchDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard');
}

export function fetchStudyDetail(id: string): Promise<StudyDetail> {
  return request<StudyDetail>(`/studies/${encodeURIComponent(id)}`);
}

export function createStudy(input: CreateStudyInput): Promise<Study> {
  return request<Study>('/studies', { method: 'POST', body: input });
}

export function updateStudy(id: string, input: UpdateStudyInput): Promise<Study> {
  return request<Study>(`/studies/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export function updateParticipant(id: string, input: UpdateParticipantInput): Promise<Participant> {
  return request<Participant>(`/participants/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function updateSession(id: string, input: UpdateSessionInput): Promise<Session> {
  return request<Session>(`/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}
