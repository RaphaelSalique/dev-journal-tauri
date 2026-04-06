const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DISPLAY_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function parseIsoDateParts(value: string): Date | undefined {
  if (!ISO_DATE_PATTERN.test(value)) {
    return undefined;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

export function isIsoDateString(value: string): boolean {
  return parseIsoDateParts(value) !== undefined;
}

export function isoDateToLocalDate(value: string): Date | undefined {
  return parseIsoDateParts(value);
}

export function localDateToIsoDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const yearNumber = date.getFullYear();
  if (yearNumber < 0 || yearNumber > 9999) {
    return '';
  }

  const year = String(yearNumber).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatIsoDateForDisplay(value: string): string {
  const date = isoDateToLocalDate(value);

  return date ? DISPLAY_FORMATTER.format(date) : '';
}
