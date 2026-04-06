import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('admin action buttons are explicit non-submit buttons', () => {
  const requiredSnippets = [
    'className="btn-create"\n                    type="button"',
    'className="btn-create"\n                    style={{ background: \'linear-gradient(135deg, #28a745 0%, #20c997 100%)\' }}\n                    type="button"',
    'className="btn-create"\n                    style={{ background: \'linear-gradient(135deg, #fd7e14 0%, #ffc107 100%)\' }}\n                    type="button"',
    'className="btn-sm btn-edit"\n                              type="button"',
    'className="btn-sm btn-delete"\n                              type="button"',
    'className="btn-sm"\n                              type="button"',
  ];

  for (const snippet of requiredSnippets) {
    assert.match(
      appSource,
      new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `Expected snippet not found: ${snippet}`,
    );
  }
});

test('admin deletions use controlled inline confirmation instead of native confirm', () => {
  assert.match(appSource, /const \[pendingDeletion, setPendingDeletion\] = useState<\{ entityType: AdminEntityType; id: number \} \| null>\(null\);/);
  assert.match(appSource, /requestDelete\('project', project\.id\)/);
  assert.match(appSource, /requestDelete\('tag', tag\.id\)/);
  assert.match(appSource, /requestDelete\('activityType', activityType\.id\)/);
  assert.match(appSource, /Confirmer la suppression de ce projet \?/);
  assert.match(appSource, /Confirmer la suppression de ce tag \?/);
  assert.match(appSource, /Confirmer la suppression de ce type d'activité \?/);
  assert.match(appSource, /onClick=\{\(\) => confirmDelete\('project', project\.id\)\}/);
  assert.match(appSource, /onClick=\{\(\) => confirmDelete\('tag', tag\.id\)\}/);
  assert.match(appSource, /onClick=\{\(\) => confirmDelete\('activityType', activityType\.id\)\}/);
  assert.doesNotMatch(appSource, /confirm\('Êtes-vous sûr de vouloir supprimer ce projet \?'\)/);
  assert.doesNotMatch(appSource, /confirm\('Êtes-vous sûr de vouloir supprimer ce tag \?'\)/);
  assert.doesNotMatch(appSource, /confirm\("Êtes-vous sûr de vouloir supprimer ce type d'activité \?"\)/);
});
