# Admin Return To Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return the admin list to the originating section after saving a project, tag, or activity type.

**Architecture:** Extend the existing `adminView` state with a `returnToSection` field, attach refs to each admin list section, and trigger `scrollIntoView` after the form closes and the list view has been restored.

**Tech Stack:** React 19, TypeScript, Vite

---

### Task 1: Track the source section and scroll back after save

**Files:**
- Modify: `src/App.tsx`

- [ ] Extend `adminView` with `returnToSection`.
- [ ] Add refs for project, tag, and activity type sections.
- [ ] Pass the correct section into `openAdminForm(...)`.
- [ ] After successful save, close the form and scroll to the stored section.

### Task 2: Verify and commit

**Files:**
- Modify only if verification reveals an issue

- [ ] Run `npm run build`.
- [ ] Commit the change if verification passes.
