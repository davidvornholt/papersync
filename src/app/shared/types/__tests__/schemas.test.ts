import { Schema } from '@effect/schema';
import { describe, expect, it } from 'vitest';
import {
  AIProvider,
  AppConfig,
  ISODate,
  ISODateTime,
  OCRResponse,
  QRPayload,
  Subject,
  TaskAction,
  TaskEntry,
  VaultAccessMethod,
  WeekId,
  WeeklyNote,
} from '@/app/shared/types/schemas';

describe('WeekId Schema', () => {
  it('should accept valid week IDs', () => {
    expect(Schema.decodeUnknownSync(WeekId)('2026-W05')).toBe('2026-W05');
    expect(Schema.decodeUnknownSync(WeekId)('2024-W52')).toBe('2024-W52');
    expect(Schema.decodeUnknownSync(WeekId)('2025-W01')).toBe('2025-W01');
  });

  it('should reject invalid week IDs', () => {
    expect(() => Schema.decodeUnknownSync(WeekId)('2024-05')).toThrow();
    expect(() => Schema.decodeUnknownSync(WeekId)('W05-2024')).toThrow();
    expect(() => Schema.decodeUnknownSync(WeekId)('invalid')).toThrow();
  });
});

describe('ISODate Schema', () => {
  it('should accept valid ISO dates', () => {
    expect(Schema.decodeUnknownSync(ISODate)('2026-01-27')).toBe('2026-01-27');
    expect(Schema.decodeUnknownSync(ISODate)('2024-12-31')).toBe('2024-12-31');
  });

  it('should reject invalid ISO dates', () => {
    expect(() => Schema.decodeUnknownSync(ISODate)('27-01-2026')).toThrow();
    expect(() => Schema.decodeUnknownSync(ISODate)('2026/01/27')).toThrow();
    expect(() => Schema.decodeUnknownSync(ISODate)('invalid')).toThrow();
  });
});

describe('ISODateTime Schema', () => {
  it('should accept valid ISO date-times', () => {
    expect(Schema.decodeUnknownSync(ISODateTime)('2026-01-27T12:00:00')).toBe(
      '2026-01-27T12:00:00',
    );
    expect(Schema.decodeUnknownSync(ISODateTime)('2026-01-27T12:00:00Z')).toBe(
      '2026-01-27T12:00:00Z',
    );
  });
});

describe('Subject Schema', () => {
  it('should accept valid subjects with required fields', () => {
    const subject = Schema.decodeUnknownSync(Subject)({
      id: 'subj-123',
      name: 'Mathematics',
      color: '#3B82F6',
      order: 1,
    });

    expect(subject.id).toBe('subj-123');
    expect(subject.name).toBe('Mathematics');
    expect(subject.color).toBe('#3B82F6');
    expect(subject.order).toBe(1);
  });

  it('should allow optional color', () => {
    const subject = Schema.decodeUnknownSync(Subject)({
      id: 'subj-456',
      name: 'Physics',
      order: 2,
    });

    expect(subject.color).toBeUndefined();
    expect(subject.order).toBe(2);
  });

  it('should reject missing order', () => {
    expect(() =>
      Schema.decodeUnknownSync(Subject)({
        id: 'subj-789',
        name: 'Invalid',
        color: '#FF0000',
      }),
    ).toThrow();
  });
});

describe('TaskAction Schema', () => {
  it('should accept valid task actions', () => {
    expect(Schema.decodeUnknownSync(TaskAction)('add')).toBe('add');
    expect(Schema.decodeUnknownSync(TaskAction)('modify')).toBe('modify');
    expect(Schema.decodeUnknownSync(TaskAction)('complete')).toBe('complete');
  });

  it('should reject invalid task actions', () => {
    expect(() => Schema.decodeUnknownSync(TaskAction)('delete')).toThrow();
    expect(() => Schema.decodeUnknownSync(TaskAction)('invalid')).toThrow();
  });
});

describe('TaskEntry Schema', () => {
  it('should accept valid task entries', () => {
    const entry = Schema.decodeUnknownSync(TaskEntry)({
      day: 'Monday',
      subject: 'Math',
      content: 'Complete problem set',
      isTask: true,
      isCompleted: false,
      action: 'add',
    });

    expect(entry.day).toBe('Monday');
    expect(entry.subject).toBe('Math');
    expect(entry.content).toBe('Complete problem set');
    expect(entry.isCompleted).toBe(false);
    expect(entry.action).toBe('add');
  });
});

describe('OCRResponse Schema', () => {
  it('should accept valid OCR response', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      entries: [
        {
          day: 'Monday',
          subject: 'Math',
          content: 'Homework',
          isTask: true,
          isCompleted: false,
          action: 'add',
        },
      ],
      confidence: 0.95,
    });

    expect(response.entries).toHaveLength(1);
    expect(response.confidence).toBe(0.95);
  });

  it('should accept optional notes', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      entries: [],
      confidence: 0.8,
      notes: 'Partial extraction',
    });

    expect(response.notes).toBe('Partial extraction');
  });

  it('should clamp confidence to valid range', () => {
    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        entries: [],
        confidence: 1.5,
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        entries: [],
        confidence: -0.1,
      }),
    ).toThrow();
  });
});

describe('WeeklyNote Schema', () => {
  it('should accept valid weekly note', () => {
    const note = Schema.decodeUnknownSync(WeeklyNote)({
      week: '2026-W05',
      dateRange: {
        start: '2026-01-27',
        end: '2026-02-02',
      },
      days: [],
      generalTasks: [],
    });

    expect(note.week).toBe('2026-W05');
    expect(note.dateRange.start).toBe('2026-01-27');
    expect(note.days).toEqual([]);
    expect(note.generalTasks).toEqual([]);
  });

  it('should accept weekly note with day entries', () => {
    const note = Schema.decodeUnknownSync(WeeklyNote)({
      week: '2026-W05',
      dateRange: {
        start: '2026-01-27',
        end: '2026-02-02',
      },
      days: [
        {
          date: '2026-01-27',
          dayName: 'Monday',
          entries: [
            {
              subject: 'Mathematics',
              tasks: [{ content: 'Problem set 7', isCompleted: false }],
            },
          ],
        },
      ],
      generalTasks: [{ content: 'Buy supplies', isCompleted: false }],
    });

    expect(note.days).toHaveLength(1);
    expect(note.days[0].entries[0].subject).toBe('Mathematics');
    expect(note.generalTasks).toHaveLength(1);
  });
});

describe('QRPayload Schema', () => {
  it('should accept valid QR payload', () => {
    const payload = Schema.decodeUnknownSync(QRPayload)({
      week: '2026-W05',
      checksum: 'abc123',
      version: 1,
    });

    expect(payload.week).toBe('2026-W05');
    expect(payload.checksum).toBe('abc123');
    expect(payload.version).toBe(1);
  });

  it('should reject invalid version', () => {
    expect(() =>
      Schema.decodeUnknownSync(QRPayload)({
        week: '2026-W05',
        checksum: 'abc',
        version: 2,
      }),
    ).toThrow();
  });

  it('should require valid week ID format', () => {
    expect(() =>
      Schema.decodeUnknownSync(QRPayload)({
        week: 'invalid-week',
        checksum: 'abc123',
        version: 1,
      }),
    ).toThrow();
  });
});

describe('AppConfig Schema', () => {
  it('should accept valid app config', () => {
    const config = Schema.decodeUnknownSync(AppConfig)({
      vaultPath: '/path/to/vault',
      vaultAccessMethod: 'local',
      aiProvider: 'google',
      subjectsPerDay: 4,
    });

    expect(config.vaultPath).toBe('/path/to/vault');
    expect(config.vaultAccessMethod).toBe('local');
    expect(config.aiProvider).toBe('google');
    expect(config.subjectsPerDay).toBe(4);
  });

  it('should accept github vault method with tokens', () => {
    const config = Schema.decodeUnknownSync(AppConfig)({
      vaultPath: '/vault',
      vaultAccessMethod: 'github',
      aiProvider: 'ollama',
      githubToken: 'ghp_xxx',
      githubRepo: 'user/vault',
      ollamaEndpoint: 'http://localhost:11434',
      subjectsPerDay: 5,
    });

    expect(config.vaultAccessMethod).toBe('github');
    expect(config.githubToken).toBe('ghp_xxx');
  });

  it('should validate subjectsPerDay range (3-6)', () => {
    expect(() =>
      Schema.decodeUnknownSync(AppConfig)({
        vaultPath: '/vault',
        vaultAccessMethod: 'local',
        aiProvider: 'google',
        subjectsPerDay: 2, // Below minimum
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(AppConfig)({
        vaultPath: '/vault',
        vaultAccessMethod: 'local',
        aiProvider: 'google',
        subjectsPerDay: 7, // Above maximum
      }),
    ).toThrow();
  });
});

describe('AIProvider Schema', () => {
  it('should accept valid providers', () => {
    expect(Schema.decodeUnknownSync(AIProvider)('google')).toBe('google');
    expect(Schema.decodeUnknownSync(AIProvider)('ollama')).toBe('ollama');
  });

  it('should reject invalid providers', () => {
    expect(() => Schema.decodeUnknownSync(AIProvider)('openai')).toThrow();
  });
});

describe('VaultAccessMethod Schema', () => {
  it('should accept valid access methods', () => {
    expect(Schema.decodeUnknownSync(VaultAccessMethod)('local')).toBe('local');
    expect(Schema.decodeUnknownSync(VaultAccessMethod)('github')).toBe(
      'github',
    );
  });

  it('should reject invalid access methods', () => {
    expect(() =>
      Schema.decodeUnknownSync(VaultAccessMethod)('cloud'),
    ).toThrow();
  });
});
