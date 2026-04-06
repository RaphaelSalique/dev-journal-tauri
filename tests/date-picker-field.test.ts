import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { Window } from 'happy-dom';
import DatePickerField from '../src/components/DatePickerField.tsx';

const browserWindow = new Window({ url: 'http://localhost/' });

Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLDivElement: browserWindow.HTMLDivElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  Node: browserWindow.Node,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  FocusEvent: browserWindow.FocusEvent,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(callback, 0),
  cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  IS_REACT_ACT_ENVIRONMENT: true,
});

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: browserWindow.navigator,
});

function getDisplayField(container: HTMLElement): HTMLElement {
  const field = container.querySelector('.date-picker-display');
  assert.ok(field instanceof HTMLElement);
  return field;
}

function getCalendarButton(container: HTMLElement): HTMLButtonElement {
  const trigger = container.querySelector('button[aria-label="Ouvrir le calendrier pour Date"]');
  assert.ok(trigger instanceof HTMLButtonElement);
  return trigger;
}

function getPopover(): HTMLElement | null {
  return document.querySelector('.date-picker-popover');
}

test('DatePickerField manages focus, exposes calendar action semantics, and updates when controlled value changes', async () => {
  const container = document.createElement('div');
  document.body.innerHTML = '';
  document.body.append(container);
  const unrelatedInput = document.createElement('input');
  unrelatedInput.type = 'text';
  document.body.append(unrelatedInput);

  const root = ReactDOM.createRoot(container);
  const changes: string[] = [];
  let currentValue = '2026-04-06';

  const renderField = async () => {
    await act(async () => {
      root.render(
        React.createElement(DatePickerField, {
          label: 'Date',
          value: currentValue,
          onChange: (nextValue: string) => {
            changes.push(nextValue);
          },
        }),
      );
    });
  };

  await renderField();

  const displayField = getDisplayField(container);
  const trigger = getCalendarButton(container);
  const triggerDescriptionId = trigger.getAttribute('aria-describedby');

  assert.equal(displayField.textContent?.includes('lundi 6 avril 2026'), true);
  assert.equal(displayField.getAttribute('role'), null);
  assert.equal(trigger.getAttribute('aria-label'), 'Ouvrir le calendrier pour Date');
  assert.ok(triggerDescriptionId);
  assert.equal(document.getElementById(triggerDescriptionId)?.textContent?.includes('lundi 6 avril 2026'), true);

  await act(async () => {
    trigger.click();
  });

  const popover = getPopover();
  assert.ok(popover);
  assert.ok(document.activeElement instanceof HTMLElement);
  assert.notEqual(document.activeElement, trigger);
  assert.equal(popover.contains(document.activeElement), true);

  await act(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });

  assert.equal(getPopover(), null);
  assert.equal(document.activeElement, trigger);

  await act(async () => {
    trigger.click();
  });

  const popoverAfterReopen = getPopover();
  assert.ok(popoverAfterReopen);

  const dayButton = Array.from(popoverAfterReopen.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
    return button.textContent?.trim() === '10' && !button.disabled;
  });

  assert.ok(dayButton);

  await act(async () => {
    dayButton.focus();
    dayButton.click();
  });

  assert.deepEqual(changes, ['2026-04-10']);
  assert.equal(getPopover(), null);
  assert.equal(document.activeElement, trigger);

  currentValue = changes[0];
  await renderField();
  assert.equal(getDisplayField(container).textContent?.includes('vendredi 10 avril 2026'), true);
  assert.equal(document.getElementById(triggerDescriptionId)?.textContent?.includes('vendredi 10 avril 2026'), true);

  await act(async () => {
    trigger.click();
  });

  assert.ok(getPopover());

  await act(async () => {
    unrelatedInput.focus();
    unrelatedInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });

  assert.equal(document.activeElement, unrelatedInput);
  assert.ok(getPopover());

  await act(async () => {
    trigger.click();
  });

  assert.equal(getPopover(), null);

  currentValue = '';
  await renderField();
  const placeholderDescriptionId = getCalendarButton(container).getAttribute('aria-describedby');
  assert.ok(placeholderDescriptionId);
  assert.equal(
    document.getElementById(placeholderDescriptionId)?.textContent?.includes('Sélectionner une date'),
    true,
  );

  await act(async () => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });

  assert.equal(getPopover(), null);

  await act(async () => {
    root.unmount();
  });
});

test('DatePickerField provides browser-valid required semantics through its proxy input', async () => {
  const container = document.createElement('div');
  document.body.innerHTML = '';
  document.body.append(container);

  const root = ReactDOM.createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(
        'form',
        null,
        React.createElement(DatePickerField, {
          label: 'Date',
          name: 'date',
          value: '',
          required: true,
          onChange: () => {},
        }),
      ),
    );
  });

  const form = container.querySelector('form');
  assert.ok(form instanceof HTMLFormElement);
  assert.equal(form.checkValidity(), false);

  const proxyInput = container.querySelector('input[name="date"]');
  assert.ok(proxyInput instanceof HTMLInputElement);
  assert.equal(proxyInput.required, true);
  assert.equal(proxyInput.value, '');

  await act(async () => {
    root.render(
      React.createElement(
        'form',
        null,
        React.createElement(DatePickerField, {
          label: 'Date',
          name: 'date',
          value: '2026-04-06',
          required: true,
          onChange: () => {},
        }),
      ),
    );
  });

  const updatedForm = container.querySelector('form');
  assert.ok(updatedForm instanceof HTMLFormElement);
  assert.equal(updatedForm.checkValidity(), true);

  await act(async () => {
    root.unmount();
  });
});
