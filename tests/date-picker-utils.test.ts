import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  formatIsoDateForDisplay,
  isIsoDateString,
  isoDateToLocalDate,
  localDateToIsoDate,
} from '../src/utils/datePicker.ts';

test('isIsoDateString accepts valid YYYY-MM-DD values', () => {
  assert.equal(isIsoDateString('2026-04-06'), true);
  assert.equal(isIsoDateString('0099-12-31'), true);
  assert.equal(isIsoDateString('2026-4-6'), false);
  assert.equal(isIsoDateString('06-04-2026'), false);
  assert.equal(isIsoDateString('2026-99-99'), false);
  assert.equal(isIsoDateString('2026-02-29'), false);
});

test('isoDateToLocalDate returns a Date for a valid ISO string', () => {
  const value = isoDateToLocalDate('2026-04-06');
  assert.equal(value?.getFullYear(), 2026);
  assert.equal(value?.getMonth(), 3);
  assert.equal(value?.getDate(), 6);
});

test('isoDateToLocalDate preserves years below 0100', () => {
  const value = isoDateToLocalDate('0099-12-31');
  assert.equal(value?.getFullYear(), 99);
  assert.equal(value?.getMonth(), 11);
  assert.equal(value?.getDate(), 31);
  assert.equal(value && localDateToIsoDate(value), '0099-12-31');
});

test('localDateToIsoDate returns YYYY-MM-DD in local calendar terms', () => {
  const value = localDateToIsoDate(new Date(2026, 3, 6));
  assert.equal(value, '2026-04-06');
});

test('localDateToIsoDate rejects years outside the ISO four-digit range', () => {
  assert.equal(localDateToIsoDate(new Date(10000, 0, 1)), '');
  assert.equal(localDateToIsoDate(new Date(-1, 0, 1)), '');
});

test('localDateToIsoDate returns an empty string for an invalid Date', () => {
  assert.equal(localDateToIsoDate(new Date('invalid')), '');
  assert.equal(localDateToIsoDate(new Date(NaN)), '');
});

test('formatIsoDateForDisplay returns a readable French label and hides invalid values', () => {
  const value = formatIsoDateForDisplay('2026-04-06');
  assert.match(value, /6 avril 2026/i);
  assert.equal(formatIsoDateForDisplay('2026-99-99'), '');
  assert.equal(formatIsoDateForDisplay('not-a-date'), '');
});

test('App journal selector uses DatePickerField instead of a native date input', () => {
  const source = readFileSync(resolve('src/App.tsx'), 'utf8');

  assert.match(source, /import DatePickerField from '\.\/components\/DatePickerField';/);
  assert.match(source, /<DatePickerField[\s\S]*label="Sélectionner une date"[\s\S]*value=\{currentDate\}[\s\S]*onChange=\{\(nextValue\) => loadJournal\(nextValue\)\}/);
  assert.doesNotMatch(source, /<input\s+type="date"\s+value=\{currentDate\}/);
});

test('App analytics report dates use DatePickerField and keep YYYY-MM-DD state handlers', () => {
  const source = readFileSync(resolve('src/App.tsx'), 'utf8');

  assert.match(source, /<DatePickerField[\s\S]*label="Date de début"[\s\S]*value=\{reportStartDate\}[\s\S]*onChange=\{\(nextValue\) => setReportStartDate\(nextValue\)\}/);
  assert.match(source, /<DatePickerField[\s\S]*label="Date de fin"[\s\S]*value=\{reportEndDate\}[\s\S]*onChange=\{\(nextValue\) => setReportEndDate\(nextValue\)\}/);
  assert.doesNotMatch(source, /<input\s+type="date"\s+value=\{reportStartDate\}/);
  assert.doesNotMatch(source, /<input\s+type="date"\s+value=\{reportEndDate\}/);
});

test('JournalEntryForm uses DatePickerField for the journal entry date field', () => {
  const source = readFileSync(resolve('src/components/JournalEntryForm.tsx'), 'utf8');

  assert.match(source, /import DatePickerField from '\.\/DatePickerField';/);
  assert.match(source, /selectedDate\?: string;/);
  assert.match(source, /date: initialData\.date \|\| selectedDate \|\| new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/);
  assert.match(source, /if \(selectedDate && selectedDate !== entry\.date\)/);
  assert.match(source, /<DatePickerField[\s\S]*label="Date"[\s\S]*name="date"[\s\S]*value=\{entry\.date\}[\s\S]*onChange=\{\(nextValue\) => setEntry\(\{ \.\.\.entry, date: nextValue \}\)\}[\s\S]*required/);
  assert.doesNotMatch(source, /<input\s+type="date"\s+name="date"\s+value=\{entry\.date\}/);
  assert.doesNotMatch(source, /<label>Date:<\/label>/);
});

test('App submits journal entries using the selected entry date and keeps the form in sync', () => {
  const source = readFileSync(resolve('src/App.tsx'), 'utf8');

  assert.match(source, /const targetDate = entry\.date \|\| currentDate;/);
  assert.match(source, /save_journal_entry_cmd', \{ date: targetDate, entry \}/);
  assert.match(source, /load_journal_file_cmd', \{ date: targetDate \}/);
  assert.match(source, /setCurrentDate\(targetDate\);/);
  assert.match(source, /<JournalEntryForm[\s\S]*selectedDate=\{currentDate\}/);
});
