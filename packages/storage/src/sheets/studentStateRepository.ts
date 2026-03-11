import { google } from 'googleapis';
import { StudentState } from '@brainule/core';
import { logger } from '@brainule/shared';
import { StudentStateRepository } from '../repositories/studentState';

const SHEET_NAME = 'Students';
const HEADERS = ['studentId', 'stateJson'];

export class SheetsStudentStateRepository implements StudentStateRepository {
  private sheetsReady = false;

  constructor(
    private readonly spreadsheetId: string,
    private readonly sheetName: string = SHEET_NAME,
  ) {}

  private makeAuth() {
    return new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  private async ensureSheet(): Promise<void> {
    if (this.sheetsReady) return;

    const auth = this.makeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      // Check if our sheet tab exists
      const meta = await sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const sheetNames = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? '');

      if (!sheetNames.includes(this.sheetName)) {
        // Add the sheet tab
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: this.sheetName } } }],
          },
        });
        // Write header row
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [HEADERS] },
        });
        logger.info('SheetsStudentState: created sheet tab', { sheetName: this.sheetName });
      }

      this.sheetsReady = true;
    } catch (err) {
      logger.warn('SheetsStudentState: ensureSheet failed', { error: String(err) });
    }
  }

  async getStudentState(studentId: string): Promise<StudentState | null> {
    await this.ensureSheet();
    const auth = this.makeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:B`,
      });

      const rows = res.data.values ?? [];
      const row = rows.find((r) => r[0] === studentId);
      if (!row || !row[1]) return null;

      return JSON.parse(row[1]) as StudentState;
    } catch (err) {
      logger.warn('SheetsStudentState: getStudentState failed', { studentId, error: String(err) });
      return null;
    }
  }

  async saveStudentState(state: StudentState): Promise<void> {
    await this.ensureSheet();
    const auth = this.makeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      // Find existing row
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:B`,
      });

      const rows = res.data.values ?? [];
      const rowIndex = rows.findIndex((r) => r[0] === state.studentId);
      const stateJson = JSON.stringify(state);

      if (rowIndex >= 0) {
        // Update existing row (row index 0 = row 2 in sheet because header is row 1)
        const sheetRow = rowIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A${sheetRow}:B${sheetRow}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[state.studentId, stateJson]] },
        });
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A1`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [[state.studentId, stateJson]] },
        });
      }
    } catch (err) {
      logger.warn('SheetsStudentState: saveStudentState failed', { studentId: state.studentId, error: String(err) });
    }
  }
}
