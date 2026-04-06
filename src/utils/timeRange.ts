export function formatTimeRangeInput(rawValue: string): string {
  let value = rawValue.replace(/\D/g, '');

  if (value.length <= 4) {
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}:${value.slice(2)}`;
    }
    return value;
  }

  const firstTime = value.slice(0, 4);
  const secondTime = value.slice(4, 8);

  let formatted = `${firstTime.slice(0, 2)}:${firstTime.slice(2)}`;
  if (secondTime.length > 0) {
    formatted += '-';
    if (secondTime.length >= 3) {
      formatted += `${secondTime.slice(0, 2)}:${secondTime.slice(2)}`;
    } else {
      formatted += secondTime;
    }
  }

  return formatted;
}

function parseTimeSegment(segment: string): number | null {
  const match = segment.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateDurationFromTimeRange(timeRange: string): string | null {
  const match = timeRange.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) {
    return null;
  }

  const startMinutes = parseTimeSegment(match[1]);
  const endMinutes = parseTimeSegment(match[2]);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${minutes.toString().padStart(2, '0')}`;
}
