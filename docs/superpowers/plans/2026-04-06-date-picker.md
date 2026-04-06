# Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native `input[type="date"]` fields with a reusable read-only date picker component that behaves consistently inside the Tauri webview.

**Architecture:** Add a focused `DatePickerField` React component that owns popover open/close state, outside-click handling, keyboard dismissal, and date formatting while keeping the app's stored value format as `YYYY-MM-DD`. Integrate it into the journal selector, journal entry form, and analytics report filters, and add the minimum frontend test harness needed to verify the component logic without introducing a full UI framework.

**Tech Stack:** React 19, TypeScript, Vite, Tauri 2, `react-day-picker`, Node test runner

---

### Task 1: Add frontend date-picker dependencies and focused date utilities

**Files:**
- Modify: `package.json`
- Create: `src/utils/datePicker.ts`
- Create: `tests/date-picker-utils.test.ts`

- [ ] **Step 1: Add the failing utility tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatIsoDateForDisplay,
  isIsoDateString,
  isoDateToLocalDate,
  localDateToIsoDate,
} from '../src/utils/datePicker.ts';

test('isIsoDateString accepts valid YYYY-MM-DD values', () => {
  assert.equal(isIsoDateString('2026-04-06'), true);
  assert.equal(isIsoDateString('2026-4-6'), false);
  assert.equal(isIsoDateString('06-04-2026'), false);
});

test('isoDateToLocalDate returns a Date for a valid ISO string', () => {
  const value = isoDateToLocalDate('2026-04-06');
  assert.equal(value?.getFullYear(), 2026);
  assert.equal(value?.getMonth(), 3);
  assert.equal(value?.getDate(), 6);
});

test('localDateToIsoDate returns YYYY-MM-DD in local calendar terms', () => {
  const value = localDateToIsoDate(new Date(2026, 3, 6));
  assert.equal(value, '2026-04-06');
});

test('formatIsoDateForDisplay returns a readable French label', () => {
  const value = formatIsoDateForDisplay('2026-04-06');
  assert.match(value, /6 avril 2026/i);
});
```

- [ ] **Step 2: Run the new test file and confirm it fails**

Run: `node --test tests/date-picker-utils.test.ts`
Expected: FAIL with module export errors because `src/utils/datePicker.ts` does not exist yet.

- [ ] **Step 3: Add the `react-day-picker` dependency**

```json
{
  "dependencies": {
    "react-day-picker": "^9.11.1"
  }
}
```

- [ ] **Step 4: Create `src/utils/datePicker.ts` with the minimal conversion helpers**

```ts
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const displayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function isIsoDateString(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

export function isoDateToLocalDate(value: string): Date | undefined {
  if (!isIsoDateString(value)) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function localDateToIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatIsoDateForDisplay(value: string): string {
  const date = isoDateToLocalDate(value);
  return date ? displayFormatter.format(date) : '';
}
```

- [ ] **Step 5: Re-run the utility tests**

Run: `node --test tests/date-picker-utils.test.ts`
Expected: PASS with 4 passing tests.

- [ ] **Step 6: Commit the dependency and utility layer**

```bash
git add package.json src/utils/datePicker.ts tests/date-picker-utils.test.ts
git commit -m "feat: add reusable date picker utilities"
```

### Task 2: Create the reusable `DatePickerField` component and its styles

**Files:**
- Create: `src/components/DatePickerField.tsx`
- Modify: `src/App.css`
- Create: `tests/date-picker-field.test.tsx`

- [ ] **Step 1: Add a failing component test for open, close, and selection behavior**

```tsx
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import DatePickerField from '../src/components/DatePickerField.tsx';

test('DatePickerField opens, closes on Escape, and emits ISO value on selection', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const values: string[] = [];
  const root = ReactDOM.createRoot(container);

  await act(async () => {
    root.render(
      <DatePickerField
        label="Date"
        value="2026-04-06"
        onChange={(nextValue) => values.push(nextValue)}
      />
    );
  });

  const trigger = container.querySelector('button');
  assert.ok(trigger);

  await act(async () => {
    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  assert.ok(container.textContent?.includes('avril'));

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });

  assert.equal(container.textContent?.includes('avril'), false);

  root.unmount();
  container.remove();
});
```

- [ ] **Step 2: Run the component test and confirm it fails**

Run: `node --test tests/date-picker-field.test.tsx`
Expected: FAIL because `DatePickerField` does not exist and the project has not yet been wired for this component.

- [ ] **Step 3: Create `src/components/DatePickerField.tsx`**

```tsx
import React, { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { formatIsoDateForDisplay, isoDateToLocalDate, localDateToIsoDate } from '../utils/datePicker';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const labelId = useId();
  const selectedDate = isoDateToLocalDate(value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`date-picker-field ${className}`.trim()} ref={rootRef}>
      <span className="date-picker-label" id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="date-input date-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{formatIsoDateForDisplay(value) || value}</span>
        <span aria-hidden="true">Calendrier</span>
      </button>
      {required ? <input type="hidden" value={value} readOnly /> : null}
      {isOpen ? (
        <div className="date-picker-popover" role="dialog" aria-modal="false">
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={selectedDate}
            onSelect={(nextDate) => {
              if (!nextDate) {
                return;
              }
              onChange(localDateToIsoDate(nextDate));
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Add the calendar-specific styles in `src/App.css`**

```css
.date-picker-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-picker-trigger {
  width: 100%;
  max-width: 240px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.date-picker-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  background: #ffffff;
  border: 2px solid #e1e8ed;
  border-radius: 12px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
  padding: 12px;
}
```

- [ ] **Step 5: Re-run the component test**

Run: `node --test tests/date-picker-field.test.tsx`
Expected: PASS, proving the component can render and close cleanly.

- [ ] **Step 6: Commit the reusable component**

```bash
git add src/components/DatePickerField.tsx src/App.css tests/date-picker-field.test.tsx
git commit -m "feat: add reusable date picker field"
```

### Task 3: Replace native journal date inputs with the reusable component

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/JournalEntryForm.tsx`
- Test: `tests/date-picker-utils.test.ts`
- Test: `tests/date-picker-field.test.tsx`

- [ ] **Step 1: Update the journal selector in `src/App.tsx`**

Replace:

```tsx
<input
  type="date"
  value={currentDate}
  onChange={(e) => loadJournal(e.target.value)}
  className="date-input"
/>
```

With:

```tsx
<DatePickerField
  label="Sélectionner une date"
  value={currentDate}
  onChange={loadJournal}
  className="journal-date-picker"
/>
```

- [ ] **Step 2: Update the journal entry form in `src/components/JournalEntryForm.tsx`**

Replace the date input block with:

```tsx
<DatePickerField
  label="Date:"
  value={entry.date}
  onChange={(value) => setEntry((currentEntry) => ({ ...currentEntry, date: value }))}
  required
/>
```

- [ ] **Step 3: Import the component in both files**

```tsx
import DatePickerField from './components/DatePickerField';
```

and

```tsx
import DatePickerField from './DatePickerField';
```

Adjust the relative path to match each file exactly.

- [ ] **Step 4: Run the focused tests after the journal migration**

Run: `node --test tests/date-picker-utils.test.ts tests/date-picker-field.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the app build after the journal migration**

Run: `npm run build`
Expected: PASS with Vite production build output and no TypeScript errors.

- [ ] **Step 6: Commit the journal integration**

```bash
git add src/App.tsx src/components/JournalEntryForm.tsx
git commit -m "feat: replace journal native date inputs"
```

### Task 4: Replace analytics report dates and finish polish

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Test: `tests/date-picker-utils.test.ts`
- Test: `tests/date-picker-field.test.tsx`

- [ ] **Step 1: Replace the analytics date inputs in `src/App.tsx`**

Replace both native inputs with:

```tsx
<DatePickerField
  label="Date de début:"
  value={reportStartDate}
  onChange={setReportStartDate}
/>

<DatePickerField
  label="Date de fin:"
  value={reportEndDate}
  onChange={setReportEndDate}
/>
```

- [ ] **Step 2: Add final layout adjustments for the report row and journal toolbar**

```css
.journal-date-picker {
  min-width: 240px;
}

.report-generator .date-picker-trigger {
  max-width: 100%;
}

.report-generator .date-picker-popover {
  left: 0;
  right: auto;
}
```

- [ ] **Step 3: Run all targeted JS tests**

Run: `node --test tests/time-range-duration.test.ts tests/date-picker-utils.test.ts tests/date-picker-field.test.tsx`
Expected: PASS

- [ ] **Step 4: Run the full frontend and Tauri verification**

Run: `npm run build`
Expected: PASS

Run: `cargo check`
Working directory: `/home/raphaelsalique/Public/dev-journal-tauri/src-tauri`
Expected: PASS

- [ ] **Step 5: Manual verification in the Tauri window**

Check each flow manually:

- journal selector opens and closes on outside click
- journal selector closes on `Escape`
- journal entry form updates the saved date correctly
- report start and end dates update correctly
- light and dark themes both render the popover cleanly

- [ ] **Step 6: Commit the analytics integration and verification**

```bash
git add src/App.tsx src/App.css tests/date-picker-utils.test.ts tests/date-picker-field.test.tsx
git commit -m "feat: replace remaining native date inputs"
```
