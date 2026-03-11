import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { EventLog, EventFilter, EventType } from '@brainule/core';
import { logger } from '@brainule/shared';
import { EventLogRepository } from '../repositories/eventLog';

const SHEET_CACHE_FILE = path.resolve(process.cwd(), '.brainule-sheets-id');

const HEADERS = [
  'eventId', 'eventType', 'studentId', 'courseId', 'leafTopicId',
  'sessionId', 'policyAssignmentId', 'promptName', 'promptHash',
  'llmProvider', 'llmModel', 'createdAt', 'payload',
];

export interface GoogleSheetsConfig {
  /** Pre-existing spreadsheet ID. If supplied, auto-create is skipped. */
  spreadsheetId?: string;
  /** Course title (or async resolver) used when naming the auto-created sheet. */
  courseTitle?: string | (() => Promise<string>);
  /** Optional email address to share the auto-created sheet with (as editor). */
  shareWithEmail?: string;
}

export class GoogleSheetsEventLogRepository implements EventLogRepository {
  private resolvedSpreadsheetId: string | null = null;

  constructor(private readonly cfg: GoogleSheetsConfig = {}) {
    // Seed from config if provided
    if (cfg.spreadsheetId) {
      this.resolvedSpreadsheetId = cfg.spreadsheetId;
    }
  }

  // ── Auth ────────────────────────────────────────────────────

  private makeAuth(scopes: string[]) {
    // Supports GOOGLE_APPLICATION_CREDENTIALS (file path) and
    // GOOGLE_SERVICE_ACCOUNT_KEY (inline JSON) env vars automatically
    // via googleapis' Application Default Credentials.
    return new google.auth.GoogleAuth({ scopes });
  }

  // ── Sheet lifecycle ──────────────────────────────────────────

  private async ensureSheet(): Promise<string> {
    if (this.resolvedSpreadsheetId) return this.resolvedSpreadsheetId;

    // Check local cache file
    if (fs.existsSync(SHEET_CACHE_FILE)) {
      const cached = fs.readFileSync(SHEET_CACHE_FILE, 'utf-8').trim();
      if (cached) {
        this.resolvedSpreadsheetId = cached;
        logger.info('GoogleSheets: resuming cached event log', { spreadsheetId: cached });
        return cached;
      }
    }

    // Auto-create a new spreadsheet
    const resolvedTitle = typeof this.cfg.courseTitle === 'function'
      ? await this.cfg.courseTitle()
      : this.cfg.courseTitle;
    const sheetTitle = resolvedTitle
      ? `Brainule Event Log — ${resolvedTitle}`
      : `Brainule Event Log — ${new Date().toISOString().slice(0, 10)}`;

    const auth = this.makeAuth([
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ]);
    const sheets = google.sheets({ version: 'v4', auth });

    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: sheetTitle },
        sheets: [{ properties: { title: 'Events', gridProperties: { frozenRowCount: 1 } } }],
      },
    });

    const newId = createRes.data.spreadsheetId!;
    const url = `https://docs.google.com/spreadsheets/d/${newId}`;

    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: newId,
      range: 'Events!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });

    // Bold the header row for readability
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: newId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        }],
      },
    });

    // Optionally share with email
    if (this.cfg.shareWithEmail) {
      try {
        const drive = google.drive({ version: 'v3', auth });
        await drive.permissions.create({
          fileId: newId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: this.cfg.shareWithEmail,
          },
          sendNotificationEmail: false,
        });
        logger.info('GoogleSheets: shared with', { email: this.cfg.shareWithEmail });
      } catch (shareErr) {
        logger.warn('GoogleSheets: could not share sheet', { error: String(shareErr) });
      }
    }

    // Cache to disk so the same sheet is reused across server restarts
    try {
      fs.writeFileSync(SHEET_CACHE_FILE, newId, 'utf-8');
    } catch (cacheErr) {
      logger.warn('GoogleSheets: could not cache sheet ID', { error: String(cacheErr) });
    }

    this.resolvedSpreadsheetId = newId;

    // Log prominently so the instructor knows where to look
    logger.info('GoogleSheets: created new event log spreadsheet', { url });
    console.log('\n' + '─'.repeat(60));
    console.log(`📊  Brainule Event Log spreadsheet created!`);
    console.log(`    ${url}`);
    if (this.cfg.shareWithEmail) {
      console.log(`    Shared with: ${this.cfg.shareWithEmail}`);
    }
    console.log('─'.repeat(60) + '\n');

    return newId;
  }

  // ── Public interface ─────────────────────────────────────────

  async logEvent(event: EventLog): Promise<void> {
    const id = await this.ensureSheet();
    const auth = this.makeAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      event.eventId,
      event.eventType,
      event.studentId,
      event.courseId,
      event.leafTopicId,
      event.sessionId,
      event.policyAssignmentId ?? '',
      event.promptName ?? '',
      event.promptHash ?? '',
      event.llmProvider ?? '',
      event.llmModel ?? '',
      event.createdAt,
      JSON.stringify(event.payload),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: 'Events!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  }

  async getEvents(filter: EventFilter): Promise<EventLog[]> {
    const id = await this.ensureSheet();
    const auth = this.makeAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: 'Events!A2:M',
    });

    const rows = res.data.values ?? [];
    let events: EventLog[] = rows
      .filter((row) => row[0]) // skip empty rows
      .map((row) => ({
        eventId: row[0] ?? '',
        eventType: (row[1] ?? 'lesson_generated') as EventType,
        studentId: row[2] ?? '',
        courseId: row[3] ?? '',
        leafTopicId: row[4] ?? '',
        sessionId: row[5] ?? '',
        policyAssignmentId: row[6] || undefined,
        promptName: row[7] || undefined,
        promptHash: row[8] || undefined,
        llmProvider: row[9] || undefined,
        llmModel: row[10] || undefined,
        createdAt: row[11] ?? '',
        payload: (() => { try { return JSON.parse(row[12] || '{}'); } catch { return {}; } })(),
      }));

    if (filter.studentId) events = events.filter((e) => e.studentId === filter.studentId);
    if (filter.leafTopicId) events = events.filter((e) => e.leafTopicId === filter.leafTopicId);
    if (filter.eventType) events = events.filter((e) => e.eventType === filter.eventType);
    if (filter.fromDate) events = events.filter((e) => e.createdAt >= filter.fromDate!);
    if (filter.limit) events = events.slice(-filter.limit);

    return events;
  }
}
