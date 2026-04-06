# Admin Screen Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin modals with a unified in-screen form flow inside the `Administration` tab for projects, tags, and activity types.

**Architecture:** Keep the current CRUD handlers in `src/App.tsx`, but replace modal state with a small admin navigation state describing `list` vs `form`, target entity, mode, and initial data. Render a single reusable admin form component during `form` mode, and remove modal components/CSS once no longer referenced.

**Tech Stack:** React 19, TypeScript, Vite, Tauri 2

---

### Task 1: Replace modal navigation with an admin screen state

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/AdminEntityForm.tsx`

- [ ] Add an `adminView` state in `src/App.tsx` for `list` / `form`, target entity type, mode, and initial data.
- [ ] Create `src/components/AdminEntityForm.tsx` to render a unified form for `project`, `tag`, and `activityType`.
- [ ] Wire `Nouveau ...` and `Éditer` buttons to switch the `Administration` tab into `form` mode instead of opening modals.
- [ ] Wire `Retour à la liste` and successful save to restore `list` mode.

### Task 2: Remove obsolete modal code and keep admin list actions intact

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/ProjectModal.tsx`
- Delete: `src/components/TagModal.tsx`
- Delete: `src/components/ActivityTypeModal.tsx`
- Modify: `src/App.css`

- [ ] Remove modal imports, modal state, modal anchor logic, and modal render blocks from `src/App.tsx`.
- [ ] Keep delete / activate / deactivate actions only in the list view.
- [ ] Remove obsolete modal CSS from `src/App.css` and add any styles needed for the in-screen admin form.

### Task 3: Verify and commit

**Files:**
- Modify only if verification reveals a real issue

- [ ] Run `npm run build` from `/home/raphaelsalique/Public/dev-journal-tauri`.
- [ ] Run `cargo check` from `/home/raphaelsalique/Public/dev-journal-tauri/src-tauri`.
- [ ] Commit the implementation with a focused message once both checks pass.
