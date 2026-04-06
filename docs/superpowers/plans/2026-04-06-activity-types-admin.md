# Activity Types Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full administration for activity types, wire them into journal create/edit flows, and make the Administration tab show active and inactive reference data.

**Architecture:** Extend the existing Tauri JSON-store CRUD pattern used for projects and tags with a new `ActivityType` entity backed by `activity-types.json`. Then load activity types in the React app, add a dedicated admin modal and table section, and replace hard-coded activity type selects with dynamic active-only options while preserving compatibility for legacy entry values during editing.

**Tech Stack:** React 19 + TypeScript + Vite, Tauri 2, Rust, `@tauri-apps/plugin-store`

---

## File Structure

### Files to modify

- `src-tauri/src/database.rs`
  - Add the `ActivityType` struct alongside `Project` and `Tag`.
- `src-tauri/src/lib.rs`
  - Import `ActivityType`.
  - Add Tauri commands for activity types.
  - Register the new commands in `generate_handler!`.
- `src/App.tsx`
  - Add `activityTypes` state.
  - Split admin loading from form loading so Administration can show inactive items while forms stay active-only.
  - Add CRUD handlers and render the new admin section/modal.
  - Pass `activityTypes` into create/edit components.
- `src/components/JournalEntryForm.tsx`
  - Accept `activityTypes` prop and render dynamic active-only options.
- `src/components/JournalEntriesList.tsx`
  - Accept `activityTypes` prop and render dynamic options during edit, preserving the current value if it is inactive or missing.

### Files to create

- `src/components/ActivityTypeModal.tsx`
  - Modal matching existing project/tag admin behavior.

### Verification entry points

- `package.json`
  - Use `npm run build` for TypeScript/Vite verification.
- `src-tauri/src/main.rs`
  - Check only if command registration patterns require it.

## Task 1: Add the backend activity type model and commands

**Files:**
- Modify: `src-tauri/src/database.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the `ActivityType` model to the shared Rust data types**

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityType {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
```

Place it in `src-tauri/src/database.rs` next to `Project` and `Tag` so the admin reference data types remain grouped in one file.

- [ ] **Step 2: Import `ActivityType` in the Tauri command module**

Update the import block in `src-tauri/src/lib.rs` from:

```rust
use crate::database::{Project, Tag};
```

to:

```rust
use crate::database::{ActivityType, Project, Tag};
```

- [ ] **Step 3: Write the default activity type seed data in the new command section**

Use this exact default list so the app preserves existing user-visible choices:

```rust
let default_activity_types = vec![
    ActivityType {
        id: Some(1),
        name: "debug".to_string(),
        description: Some("Investigation et correction de probleme".to_string()),
        color: "#dc3545".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(2),
        name: "développement".to_string(),
        description: Some("Implementation de fonctionnalites".to_string()),
        color: "#007bff".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(3),
        name: "documentation".to_string(),
        description: Some("Redaction et mise a jour de documentation".to_string()),
        color: "#17a2b8".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(4),
        name: "formation".to_string(),
        description: Some("Apprentissage et montee en competence".to_string()),
        color: "#6f42c1".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(5),
        name: "infrastructure".to_string(),
        description: Some("Outillage, CI, environnements et operations".to_string()),
        color: "#6c757d".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(6),
        name: "réunion".to_string(),
        description: Some("Synchronisation, atelier ou point d'equipe".to_string()),
        color: "#ffc107".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(7),
        name: "revue de code".to_string(),
        description: Some("Lecture et validation de modifications".to_string()),
        color: "#28a745".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
    ActivityType {
        id: Some(8),
        name: "veille technologique".to_string(),
        description: Some("Exploration et suivi technique".to_string()),
        color: "#fd7e14".to_string(),
        active: true,
        created_at: None,
        updated_at: None,
    },
];
```

- [ ] **Step 4: Implement `get_all_activity_types`**

Mirror the project/tag storage pattern with `activity-types.json` and the `activity_types` key:

```rust
#[tauri::command]
async fn get_all_activity_types(
    app: tauri::AppHandle,
    include_inactive: Option<bool>,
) -> Result<Vec<ActivityType>, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("activity-types.json").map_err(|e| e.to_string())?;

    let mut activity_types: Vec<ActivityType> = match store.get("activity_types") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_else(|_| default_activity_types.clone()),
        None => {
            store.set("activity_types", serde_json::to_value(&default_activity_types).unwrap());
            store.save().map_err(|e| e.to_string())?;
            default_activity_types.clone()
        }
    };

    if !include_inactive.unwrap_or(false) {
        activity_types.retain(|activity_type| activity_type.active);
    }

    Ok(activity_types)
}
```

Define `default_activity_types` inside the function before the `match`, matching the established store bootstrap behavior.

- [ ] **Step 5: Implement `create_activity_type`**

Follow the tag/project ID allocation and store-save pattern:

```rust
#[tauri::command]
async fn create_activity_type(
    app: tauri::AppHandle,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<ActivityType, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("activity-types.json").map_err(|e| e.to_string())?;

    let mut activity_types: Vec<ActivityType> = match store.get("activity_types") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };

    let next_id = activity_types.iter().map(|a| a.id.unwrap_or(0)).max().unwrap_or(0) + 1;

    let new_activity_type = ActivityType {
        id: Some(next_id),
        name,
        description,
        color: color.unwrap_or("#6c757d".to_string()),
        active: true,
        created_at: None,
        updated_at: None,
    };

    activity_types.push(new_activity_type.clone());
    store.set("activity_types", serde_json::to_value(&activity_types).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    Ok(new_activity_type)
}
```

- [ ] **Step 6: Implement `update_activity_type`, `delete_activity_type`, and `toggle_activity_type_status`**

Use the same shape and timestamp update logic already used for projects and tags:

```rust
#[tauri::command]
async fn update_activity_type(
    app: tauri::AppHandle,
    id: i64,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<(), String> { /* mirror update_tag */ }

#[tauri::command]
async fn delete_activity_type(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> { /* mirror delete_tag */ }

#[tauri::command]
async fn toggle_activity_type_status(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> { /* mirror toggle_tag_status */ }
```

Concrete requirements:

- search in the in-memory vector by `id`
- update `name`, `description`, and `color` when provided
- set `updated_at` to the current UNIX timestamp string
- save back to `activity_types`
- return `"Type d'activité non trouvé"` on missing ID

- [ ] **Step 7: Register the new commands in the Tauri handler**

Add these command names in the `tauri::generate_handler![ ... ]` list in `src-tauri/src/lib.rs`:

```rust
get_all_activity_types,
create_activity_type,
update_activity_type,
delete_activity_type,
toggle_activity_type_status,
```

- [ ] **Step 8: Run the frontend build once to catch TypeScript regressions before touching React**

Run: `npm run build`

Expected: current build still passes, since no TypeScript files have changed yet. If it fails now, stop and inspect whether the failure is pre-existing.

- [ ] **Step 9: Commit the backend scaffolding**

```bash
git add src-tauri/src/database.rs src-tauri/src/lib.rs
git commit -m "feat: add activity type backend administration"
```

## Task 2: Add the activity type admin modal and application state

**Files:**
- Create: `src/components/ActivityTypeModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `ActivityTypeModal.tsx` by mirroring the tag modal structure**

Use this component shape:

```tsx
import React, { useEffect, useState } from 'react';

interface ActivityType {
  id?: number;
  name: string;
  description?: string;
  color: string;
  active: boolean;
}

interface ActivityTypeModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (activityTypeData: Omit<ActivityType, 'id' | 'active'>) => void;
  activityType?: ActivityType | null;
}

export default function ActivityTypeModal({
  show,
  onClose,
  onSave,
  activityType,
}: ActivityTypeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6c757d',
  });

  useEffect(() => {
    if (activityType) {
      setFormData({
        name: activityType.name,
        description: activityType.description || '',
        color: activityType.color,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6c757d',
      });
    }
  }, [activityType, show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* same form structure as TagModal */}
      </div>
    </div>
  );
}
```

Keep the form fields aligned with project/tag admin: name, description, color, cancel/save actions.

- [ ] **Step 2: Add activity type state to `App.tsx`**

Add these state declarations near the existing project/tag admin state:

```tsx
const [activityTypes, setActivityTypes] = useState<any[]>([]);
const [showActivityTypeModal, setShowActivityTypeModal] = useState(false);
const [editingActivityType, setEditingActivityType] = useState<any>(null);
```

- [ ] **Step 3: Split admin loading from form loading**

Replace the current single-reference loader with two functions:

```tsx
const loadFormReferenceData = async () => {
  const [loadedProjects, loadedTags, loadedActivityTypes] = await Promise.all([
    invoke<any[]>('get_all_projects', { includeInactive: false }),
    invoke<any[]>('get_all_tags', { includeInactive: false }),
    invoke<any[]>('get_all_activity_types', { includeInactive: false }),
  ]);

  setProjects(loadedProjects);
  setTags(loadedTags);
  setActivityTypes(loadedActivityTypes);
};

const loadAdminReferenceData = async () => {
  const [loadedProjects, loadedTags, loadedActivityTypes] = await Promise.all([
    invoke<any[]>('get_all_projects', { includeInactive: true }),
    invoke<any[]>('get_all_tags', { includeInactive: true }),
    invoke<any[]>('get_all_activity_types', { includeInactive: true }),
  ]);

  setProjects(loadedProjects);
  setTags(loadedTags);
  setActivityTypes(loadedActivityTypes);
};
```

Then:

- call `loadFormReferenceData()` in the initial `useEffect`
- call `loadAdminReferenceData()` inside `handleTabChange('admin')`
- call `loadFormReferenceData()` inside `handleTabChange('journal')`

This preserves active-only options in forms while showing inactive items in Administration.

- [ ] **Step 4: Add activity type save, delete, and toggle handlers**

Create handlers parallel to the existing tag/project ones:

```tsx
const handleDeleteActivityType = async (id: number) => {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce type d'activité ?")) {
    await invoke('delete_activity_type', { id });
    if (activeTab === 'admin') {
      await loadAdminReferenceData();
    } else {
      await loadFormReferenceData();
    }
  }
};

const handleToggleActivityTypeStatus = async (id: number) => {
  await invoke('toggle_activity_type_status', { id });
  if (activeTab === 'admin') {
    await loadAdminReferenceData();
  } else {
    await loadFormReferenceData();
  }
};

const handleSaveActivityType = async (activityTypeData: any) => {
  if (editingActivityType) {
    await invoke('update_activity_type', {
      id: editingActivityType.id,
      name: activityTypeData.name,
      description: activityTypeData.description,
      color: activityTypeData.color,
    });
  } else {
    await invoke('create_activity_type', {
      name: activityTypeData.name,
      description: activityTypeData.description,
      color: activityTypeData.color,
    });
  }

  await loadAdminReferenceData();
  setShowActivityTypeModal(false);
  setEditingActivityType(null);
};
```

- [ ] **Step 5: Import and mount the new modal**

Add the import:

```tsx
import ActivityTypeModal from './components/ActivityTypeModal';
```

Add the modal near `ProjectModal` and `TagModal`:

```tsx
<ActivityTypeModal
  show={showActivityTypeModal}
  onClose={() => {
    setShowActivityTypeModal(false);
    setEditingActivityType(null);
  }}
  onSave={handleSaveActivityType}
  activityType={editingActivityType}
/>
```

- [ ] **Step 6: Run the frontend build to verify the new state shape compiles**

Run: `npm run build`

Expected: PASS. If it fails, fix missing imports/props before moving on.

- [ ] **Step 7: Commit the state and modal work**

```bash
git add src/components/ActivityTypeModal.tsx src/App.tsx
git commit -m "feat: add activity type admin modal and state"
```

## Task 3: Render the Administration section and wire form props

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/JournalEntryForm.tsx`
- Modify: `src/components/JournalEntriesList.tsx`

- [ ] **Step 1: Add the new Administration table section in `App.tsx`**

Render a third section after tags using the same structure:

```tsx
<div className="admin-section">
  <div className="admin-header">
    <h3>Types d'activité ({activityTypes.length})</h3>
    <button
      className="btn-create"
      onClick={() => {
        setEditingActivityType(null);
        setShowActivityTypeModal(true);
      }}
    >
      Nouveau Type d'activité
    </button>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nom</th>
        <th>Description</th>
        <th>Couleur</th>
        <th>Actif</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {activityTypes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((activityType) => (
          <tr key={activityType.id}>
            {/* same rendering pattern as projects/tags */}
          </tr>
        ))}
    </tbody>
  </table>
</div>
```

Inside the row actions, wire:

- edit -> `setEditingActivityType(activityType)` and `setShowActivityTypeModal(true)`
- delete -> `handleDeleteActivityType(activityType.id)`
- toggle -> `handleToggleActivityTypeStatus(activityType.id)`

- [ ] **Step 2: Pass `activityTypes` into the journal create and edit components**

Update the two component calls in `App.tsx`:

```tsx
<JournalEntryForm
  onSubmit={handleSubmit}
  projects={projects.filter((project) => project.active)}
  tags={tags.filter((tag) => tag.active)}
  activityTypes={activityTypes.filter((activityType) => activityType.active)}
  availableJiraTickets={jiraTickets}
/>

<JournalEntriesList
  key={entriesRefreshKey}
  date={currentDate}
  onRefresh={loadJournalDates}
  projects={projects.filter((project) => project.active)}
  tags={tags.filter((tag) => tag.active)}
  activityTypes={activityTypes}
  availableJiraTickets={jiraTickets}
/>
```

Pass all activity types to edit mode so it can preserve inactive current values if needed.

- [ ] **Step 3: Extend `JournalEntryForm.tsx` props and initial entry default**

Update the props interface:

```tsx
interface JournalEntryFormProps {
  onSubmit: (entry: JournalEntry) => void;
  initialData?: Partial<JournalEntry>;
  projects?: Array<{id: number, name: string}>;
  tags?: Array<{id: number, name: string, color?: string}>;
  activityTypes?: Array<{id: number, name: string, color?: string, active?: boolean}>;
  availableJiraTickets?: Array<{key: string, fields: {summary: string}}>;
}
```

Update the function signature defaults:

```tsx
export default function JournalEntryForm({
  onSubmit,
  initialData = {},
  projects = [],
  tags = [],
  activityTypes = [],
  availableJiraTickets = [],
}: JournalEntryFormProps) {
```

Keep the default initial type:

```tsx
entry_type: initialData.entry_type || 'développement',
```

- [ ] **Step 4: Replace the hard-coded create-form select with dynamic options**

In `JournalEntryForm.tsx`, replace the current activity type select body with:

```tsx
<select name="entry_type" value={entry.entry_type} onChange={handleChange}>
  {activityTypes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((activityType) => (
      <option key={activityType.id} value={activityType.name}>
        {activityType.name}
      </option>
    ))}
</select>
```

If `activityTypes.length === 0`, keep a fallback option so the field is still usable:

```tsx
<select name="entry_type" value={entry.entry_type} onChange={handleChange}>
  <option value="développement">Développement</option>
</select>
```

- [ ] **Step 5: Extend `JournalEntriesList.tsx` props and build edit options safely**

Add the prop:

```tsx
interface JournalEntriesListProps {
  date: string;
  onRefresh: () => void;
  projects: Array<{id: number, name: string}>;
  tags: Array<{id: number, name: string, color?: string}>;
  activityTypes: Array<{id: number, name: string, color?: string, active?: boolean}>;
  availableJiraTickets: Array<{key: string, fields: {summary: string}}>;
}
```

Update the component signature to receive it:

```tsx
export default function JournalEntriesList({
  date,
  onRefresh,
  projects,
  tags: _tags,
  activityTypes,
  availableJiraTickets: _availableJiraTickets,
}: JournalEntriesListProps) {
```

Create the edit option list before the return:

```tsx
const activityTypeOptions = activityTypes
  .filter((activityType) => activityType.active !== false)
  .map((activityType) => activityType.name);

const selectedEditActivityType = editForm?.entry_type;
const editActivityTypeOptions = selectedEditActivityType && !activityTypeOptions.includes(selectedEditActivityType)
  ? [...activityTypeOptions, selectedEditActivityType].sort((a, b) => a.localeCompare(b))
  : activityTypeOptions.slice().sort((a, b) => a.localeCompare(b));
```

- [ ] **Step 6: Replace the hard-coded edit-form select with `editActivityTypeOptions`**

Use:

```tsx
<select
  value={editForm?.entry_type || ''}
  onChange={(e) => handleFormChange('entry_type', e.target.value)}
>
  {editActivityTypeOptions.map((activityTypeName) => (
    <option key={activityTypeName} value={activityTypeName}>
      {activityTypeName}
    </option>
  ))}
</select>
```

- [ ] **Step 7: Run the frontend build to verify prop and JSX changes**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit the admin rendering and form wiring**

```bash
git add src/App.tsx src/components/JournalEntryForm.tsx src/components/JournalEntriesList.tsx
git commit -m "feat: wire activity types into admin and journal forms"
```

## Task 4: Verify end-to-end behavior and stabilize any integration issues

**Files:**
- Modify: `src/App.tsx` (only if fixes are needed)
- Modify: `src/components/ActivityTypeModal.tsx` (only if fixes are needed)
- Modify: `src/components/JournalEntryForm.tsx` (only if fixes are needed)
- Modify: `src/components/JournalEntriesList.tsx` (only if fixes are needed)
- Modify: `src-tauri/src/lib.rs` (only if fixes are needed)

- [ ] **Step 1: Run a final build after all changes**

Run: `npm run build`

Expected: PASS with Vite production build output.

- [ ] **Step 2: Run a Tauri Rust check**

Run: `cargo check`

Working directory: `src-tauri`

Expected: PASS without Rust compile errors.

- [ ] **Step 3: Manually verify the Administration data loading rules in the running app**

Run: `npm run tauri dev`

Expected manual checks:

- Administration shows active and inactive projects
- Administration shows active and inactive tags
- Administration shows active and inactive activity types
- An inactive item still displays its row and can be reactivated
- Journal create form only shows active projects, tags, and activity types

- [ ] **Step 4: Manually verify create/edit behavior for legacy and inactive activity types**

Use this checklist in the running app:

- create a new activity type from Administration and confirm it appears in the journal create form
- deactivate an activity type and confirm it disappears from the create form
- edit an existing journal entry that already uses an inactive activity type and confirm the current value remains selectable
- save the edited entry and confirm `entry_type` is preserved

- [ ] **Step 5: Commit any final integration fixes**

```bash
git add src/App.tsx src/components/ActivityTypeModal.tsx src/components/JournalEntryForm.tsx src/components/JournalEntriesList.tsx src-tauri/src/database.rs src-tauri/src/lib.rs
git commit -m "fix: finalize activity type administration integration"
```

- [ ] **Step 6: Prepare the branch for review**

Run:

```bash
git status --short
git log --oneline -5
```

Expected:

- clean working tree
- recent commits for backend, UI state/modal, form wiring, and final fixes
