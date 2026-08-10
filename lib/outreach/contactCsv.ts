import type { ContactStatus } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxCsvBytes = 1024 * 1024;
export const maxImportedContacts = 500;

export interface ContactImportRow {
  email: string;
  displayName: string;
  salutation: string;
  language: string;
  company: string;
  mediaName: string;
  role: string;
  country: string;
  tags: string[];
  notes: string;
  status: ContactStatus;
}

export interface ContactImportIssue {
  row: number;
  message: string;
}

export interface ContactImportPreview {
  headers: string[];
  totalRows: number;
  validRows: number;
  rows: ContactImportRow[];
  issues: ContactImportIssue[];
}

const headerAliases: Record<keyof ContactImportRow, string[]> = {
  email: ['email', 'emailaddress', 'e-mail'],
  displayName: ['displayname', 'name', 'fullname', 'contactname'],
  salutation: ['salutation', 'greeting'],
  language: ['language', 'lang'],
  company: ['company', 'organization', 'organisation', 'org'],
  mediaName: ['medianame', 'media', 'publication', 'outlet'],
  role: ['role', 'title', 'jobtitle'],
  country: ['country', 'region'],
  tags: ['tags', 'tag'],
  notes: ['notes', 'note'],
  status: ['status'],
};

export function parseContactCsv(csv: string): ContactImportPreview {
  if (Buffer.byteLength(csv, 'utf8') > maxCsvBytes) {
    return { headers: [], totalRows: 0, validRows: 0, rows: [], issues: [{ row: 0, message: 'CSV file is larger than 1 MB.' }] };
  }

  let records: string[][];
  try {
    records = parseRecords(csv);
  } catch (error) {
    return { headers: [], totalRows: 0, validRows: 0, rows: [], issues: [{ row: 0, message: error instanceof Error ? error.message : 'CSV could not be parsed.' }] };
  }

  const nonEmptyRecords = records.filter((record) => record.some((value) => value.trim() !== ''));
  if (nonEmptyRecords.length === 0) {
    return { headers: [], totalRows: 0, validRows: 0, rows: [], issues: [{ row: 0, message: 'CSV file is empty.' }] };
  }

  const rawHeaders = nonEmptyRecords[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  const headerIndexes = resolveHeaders(rawHeaders);
  const issues: ContactImportIssue[] = [];
  if (headerIndexes.email === undefined) issues.push({ row: 1, message: 'CSV must include an email column.' });

  const rows: ContactImportRow[] = [];
  const seenEmails = new Set<string>();
  const dataRecords = nonEmptyRecords.slice(1);
  if (dataRecords.length > maxImportedContacts) {
    issues.push({ row: 0, message: `CSV may contain at most ${maxImportedContacts} contacts per import.` });
  }

  dataRecords.slice(0, maxImportedContacts).forEach((record, index) => {
    const rowNumber = index + 2;
    const email = valueAt(record, headerIndexes.email).toLowerCase();
    if (!emailPattern.test(email)) {
      issues.push({ row: rowNumber, message: 'A valid email address is required.' });
      return;
    }
    if (seenEmails.has(email)) {
      issues.push({ row: rowNumber, message: `Duplicate email in CSV: ${email}.` });
      return;
    }
    seenEmails.add(email);

    const statusValue = valueAt(record, headerIndexes.status).toLowerCase() || 'active';
    if (!isContactStatus(statusValue)) {
      issues.push({ row: rowNumber, message: 'Status must be active, inactive, or blocked.' });
      return;
    }

    rows.push({
      email,
      displayName: valueAt(record, headerIndexes.displayName),
      salutation: valueAt(record, headerIndexes.salutation),
      language: valueAt(record, headerIndexes.language) || 'en',
      company: valueAt(record, headerIndexes.company),
      mediaName: valueAt(record, headerIndexes.mediaName),
      role: valueAt(record, headerIndexes.role),
      country: valueAt(record, headerIndexes.country),
      tags: splitTags(valueAt(record, headerIndexes.tags)),
      notes: valueAt(record, headerIndexes.notes),
      status: statusValue,
    });
  });

  return { headers: rawHeaders, totalRows: dataRecords.length, validRows: rows.length, rows, issues };
}

function resolveHeaders(headers: string[]): Partial<Record<keyof ContactImportRow, number>> {
  const indexes: Partial<Record<keyof ContactImportRow, number>> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    (Object.keys(headerAliases) as Array<keyof ContactImportRow>).some((field) => {
      if (headerAliases[field].some((alias) => normalizeHeader(alias) === normalized)) {
        if (indexes[field] === undefined) indexes[field] = index;
        return true;
      }
      return false;
    });
  });
  return indexes;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, '');
}

function valueAt(record: string[], index: number | undefined): string {
  return index === undefined ? '' : (record[index] ?? '').trim();
}

function splitTags(value: string): string[] {
  return value.split(/[;|]/).map((tag) => tag.trim()).filter(Boolean);
}

function isContactStatus(value: string): value is ContactStatus {
  return value === 'active' || value === 'inactive' || value === 'blocked';
}

function parseRecords(csv: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      record.push(field);
      field = '';
      if (record.some((value) => value.trim() !== '')) records.push(record);
      record = [];
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    if (record.some((value) => value.trim() !== '')) records.push(record);
  }
  return records;
}
