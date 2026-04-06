import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'react-day-picker/locale';
import {
  formatIsoDateForDisplay,
  isIsoDateString,
  isoDateToLocalDate,
  localDateToIsoDate,
} from '../utils/datePicker';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  id,
  name,
  placeholder = 'Sélectionner une date',
  disabled = false,
  required = false,
}: DatePickerFieldProps) {
  const generatedId = useId();
  const triggerId = id ?? `date-picker-field-${generatedId}`;
  const popoverId = `${triggerId}-popover`;
  const valueId = `${triggerId}-value`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = isIsoDateString(value) ? isoDateToLocalDate(value) : undefined;
  const displayValue = value ? formatIsoDateForDisplay(value) : '';

  const restoreFocusToTrigger = () => {
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || !containerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      restoreFocusToTrigger();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      const focusTarget = popoverRef.current?.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-current="date"], button:not([disabled])',
      );
      focusTarget?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    const nextValue = localDateToIsoDate(date);
    if (nextValue) {
      onChange(nextValue);
    }
    setIsOpen(false);
    restoreFocusToTrigger();
  };

  return (
    <div className="date-picker-field" ref={containerRef}>
      <label id={`${triggerId}-label`} htmlFor={triggerId}>
        {label}
      </label>
      <div className="date-picker-control">
        <div className={`date-picker-display ${displayValue ? 'date-picker-display-filled' : 'date-picker-display-empty'}`}>
          <span
            id={valueId}
            className={displayValue ? 'date-picker-value' : 'date-picker-placeholder'}
          >
            {displayValue || placeholder}
          </span>
        </div>
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          className="date-picker-trigger"
          aria-label={`Ouvrir le calendrier pour ${label}`}
          aria-describedby={valueId}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          disabled={disabled}
          onClick={() => {
            setIsOpen((currentOpen) => !currentOpen);
          }}
        >
          <span aria-hidden="true" className="date-picker-trigger-icon">
            📅
          </span>
        </button>
      </div>
      {name ? (
        <input
          className="date-picker-native-proxy"
          tabIndex={-1}
          type="text"
          name={name}
          value={value}
          onChange={() => {}}
          required={required}
          aria-hidden="true"
        />
      ) : null}
      {isOpen ? (
        <div
          id={popoverId}
          ref={popoverRef}
          className="date-picker-popover"
          role="dialog"
          aria-modal="false"
          aria-label={`${label} calendar`}
        >
          <DayPicker
            mode="single"
            locale={fr}
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            autoFocus
            showOutsideDays
            fixedWeeks
            onSelect={handleSelect}
          />
        </div>
      ) : null}
    </div>
  );
}
