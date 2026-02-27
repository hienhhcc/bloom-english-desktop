# Drag Title Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a thin draggable title bar at the top of every page so users can move the window, with double-click to toggle maximize.

**Architecture:** CSS `webkit-app-region: drag` handles window dragging natively in Electron. An IPC channel `window:toggleMaximize` is wired through preload → main to handle double-click maximize toggle. The bar is added to the root layout so it appears on every page.

**Tech Stack:** Electron IPC, Next.js layout, React, Tailwind CSS

---

### Task 1: Add IPC handler in main.js

**Files:**
- Modify: `electron/main.js`

**Step 1: Add toggleMaximize IPC handler**

In `electron/main.js`, after the existing `ipcMain.handle("puter:login", ...)` block, add:

```js
ipcMain.handle("window:toggleMaximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
```

**Step 2: Verify syntax**

Open `electron/main.js` and confirm no syntax errors (no red underlines or lint errors).

**Step 3: Commit**

```bash
git add electron/main.js
git commit -m "feat: add window:toggleMaximize IPC handler"
```

---

### Task 2: Expose IPC in preload.js

**Files:**
- Modify: `electron/preload.js`

**Step 1: Add windowControls to contextBridge**

The current preload exposes `puterAuth`. Add a second `contextBridge.exposeInMainWorld` call:

```js
contextBridge.exposeInMainWorld("windowControls", {
  toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
});
```

**Step 2: Commit**

```bash
git add electron/preload.js
git commit -m "feat: expose windowControls.toggleMaximize via preload"
```

---

### Task 3: Create TitleBar component

**Files:**
- Create: `components/TitleBar.tsx`

**Step 1: Create the component**

```tsx
"use client";

export function TitleBar() {
  const handleDoubleClick = () => {
    if (typeof window !== "undefined" && (window as any).windowControls) {
      (window as any).windowControls.toggleMaximize();
    }
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      className="fixed top-0 left-0 right-0 h-9 z-50 select-none"
    />
  );
}
```

Note: `WebkitAppRegion: "drag"` makes the entire bar draggable in Electron. The bar is transparent (no background) so it's invisible but functional. `h-9` = 36px. `fixed` + `z-50` ensures it's always on top.

**Step 2: Commit**

```bash
git add components/TitleBar.tsx
git commit -m "feat: add TitleBar component with drag and double-click maximize"
```

---

### Task 4: Add TitleBar to root layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Import TitleBar**

Add to the imports in `app/layout.tsx`:

```tsx
import { TitleBar } from "@/components/TitleBar";
```

**Step 2: Render TitleBar inside body**

Inside the `<body>` tag, before `<ThemeProvider>` or as the first child inside it:

```tsx
<body ...>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TitleBar />
    {children}
  </ThemeProvider>
</body>
```

**Step 3: Add top padding to prevent content hiding under the bar**

In `app/globals.css` (or via a wrapper), ensure page content isn't hidden under the 36px bar. The easiest approach: wrap `{children}` in a div with `pt-9`, OR add `pt-9` to the body. Actually, since `titleBarStyle: "hiddenInset"` on macOS already reserves ~28px for traffic lights, and our bar is 36px, add a small top padding to the main content.

In `app/layout.tsx`, change:
```tsx
<TitleBar />
{children}
```
to:
```tsx
<TitleBar />
<div className="pt-9">
  {children}
</div>
```

**Step 4: Build and manually test**

```bash
npm run electron:dev
```

Verify:
- Drag the top bar → window moves
- Double-click the top bar → window maximizes / restores
- Page content is not hidden under the bar

**Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add TitleBar to root layout with pt-9 content offset"
```
