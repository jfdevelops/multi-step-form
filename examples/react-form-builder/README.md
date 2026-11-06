# react-form-builder

A minimal drag-and-drop form builder made with
[`@jfdevelops/react-multi-step-form-builder`](../../packages/builder-react/README.md).

- Click a field type, or drag it onto the canvas or a step tab.
- Drag fields by their handle to reorder them.
- Select a field (or nothing, for the step) to edit it on the right.
- Undo/redo from the toolbar or with ⌘/Ctrl+Z.
- Open **Generated code** to see the form as `defineMultiStepForm` source.

All of the UI is in [`src/App.tsx`](src/App.tsx); the builder components are headless, so the
styling is plain CSS keyed off their `data-*` attributes.

```bash
pnpm build:builder   # from the repo root, once
pnpm --filter react-form-builder dev
```
