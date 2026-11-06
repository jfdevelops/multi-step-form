# Draft 003: Headless form builder UI API

> **Status**: IN PROGRESS. The first slice is implemented in `packages/builder-core`,
> `packages/builder-zod` and `packages/builder-react`. Decisions made during implementation:
>
> - Each validator library is its own package (`@jfdevelops/multi-step-form-builder-zod`, …), not
>   a subpath, so consumers only install what they use.
> - Steps have no stored key. Core treats `step{number}` as the step's position (progress uses it),
>   so a step compiles to `step{index + 1}` and is renumbered when reordered. `steps.add()` /
>   `<AddStepButton>` just append a step.
> - Builder packages reuse core helpers instead of copying them (e.g. `changeCasing` for field
>   keys).
> - Field `type` uses core's vocabulary (`string.email`, `boolean.switch`, …); the segment before
>   `.` is the value type.
> - Drag and drop uses `@dnd-kit/react` in the React package; `builder-core` only exposes
>   `canDrop`/`drop`.
> - Not built yet: conditions/branching (§7), preview runtime (§9), vanilla DOM bindings, nested
>   group/repeater fields.

## Goal

Ship the **logic of a drag-and-drop form builder** without its UI. You bring the components and
styles (Tailwind, shadcn, MUI, plain CSS, any framework). The library provides:

- the state of the form being edited (steps, fields, logic) as serializable JSON
- the interactions: palette, canvas, drag and drop, selection, keyboard, clipboard, undo/redo
- an inspector model, so property panels are generated from field-type metadata
- a condition/branching editor model
- live preview, powered by the existing multi-step-form runtime
- accessibility: ARIA roles, focus management, live-region announcements for drag and drop

The pattern is the one used by Downshift, React Aria, TanStack Table, and dnd-kit: a framework-free
store plus **prop getters** that you spread onto your own elements. Thin adapters cover React,
Vue, Svelte, and vanilla DOM/web components, so the builder can be embedded on any site.

## Architecture

```
                     ┌───────────────────────── @jfdevelops/form-builder-core (no DOM framework) ──────────────────────────┐
                     │                                                                                                      │
  FormRegistry ─────►│  BuilderStore ──► document (FormDefinition) · selection · drag · history · issues · mode          │
  (field types,      │      ▲                                                                                               │
   rules, inspector  │      │ commands                                                                                      │
   schemas)          │  ┌───┴─────┬──────────┬────────────┬────────────┬──────────────┬─────────────┬───────────────┐    │
                     │  │ palette │ canvas   │ dnd engine │ selection  │ inspector    │ logic editor│ preview       │    │
                     │  │         │ (tree)   │ ptr + kbd  │ + keyboard │ (props model)│ (conditions)│ (FormRuntime) │    │
                     │  └───┬─────┴────┬─────┴─────┬──────┴─────┬──────┴──────┬───────┴──────┬──────┴───────┬───────┘    │
                     └──────┼──────────┼───────────┼────────────┼─────────────┼──────────────┼──────────────┼────────────┘
                            ▼          ▼           ▼            ▼             ▼              ▼              ▼
                     prop getters + snapshots ─► adapters: react · vue · svelte · vanilla/<msf-builder> ─► YOUR components
```

| Package | Contents |
| --- | --- |
| `@jfdevelops/form-builder-core` | Store, commands, modules, framework-neutral prop getters |
| `@jfdevelops/form-builder-react` | `useFormBuilder`, `useBuilderSelector`, `usePalette`, `useCanvasNode`, `useInspector`, … |
| `@jfdevelops/form-builder-vue` / `-svelte` | Composables and stores over the same core |
| `@jfdevelops/form-builder-dom` | Vanilla bindings (`bind*` helpers) and an optional `<msf-builder>` custom element shell for no-build sites |
| `@jfdevelops/multi-step-form-definition` | `FormDefinition` types, JSON Schema, migrations, `compileDefinition` (definition → core config) |

---

## 1. The document: `FormDefinition`

The builder edits a JSON document. The builder only produces it; rendering the finished form is
the runtime's job (see §9).

```ts
export interface FormDefinition {
  schemaVersion: 1;
  id: string;
  revision: number;
  meta?: { title?: string; description?: string };
  steps: StepDefinition[];
  navigation?: NavigationRule[];          // branching: { from, to | '$submit', when }
  submit?: SubmitDefinition;
  settings?: { validateOn?: 'change' | 'blur' | 'next' | 'submit'; persistence?: 'none' | 'local' | 'session' };
}

export interface StepDefinition {
  id: string; key: string; title?: string; description?: string;
  fields: FieldDefinition[];
  visibleWhen?: ConditionJSON;
  validation?: StepValidation;            // see §1.1; omitted = step is always complete
}

export interface FieldDefinition {
  id: string; key: string; type: string;  // registered field type
  label?: string; description?: string; placeholder?: string;
  required?: boolean; defaultValue?: JsonValue;
  props?: Record<string, JsonValue>;      // type-specific props (options, min, rows…), described by the registry
  rules?: RuleRef[];                      // { rule: 'minLength', value: 3, message? }
  visibleWhen?: ConditionJSON;
  disabledWhen?: ConditionJSON;
  fields?: FieldDefinition[];             // container types: 'group', 'repeater', 'columns'
}

export type ConditionJSON =
  | boolean
  | { and: ConditionJSON[] } | { or: ConditionJSON[] } | { not: ConditionJSON }
  | { field: string /* "step.field" */; op: ComparisonOp; value?: JsonValue }
  | { custom: string; args?: JsonValue };
```

Conditions compile to the existing `and`/`or` `ConditionExpression` in
`packages/core/src/conditions.ts`.

### 1.1 Step validation: pick a Standard Schema library per step

Core already decides completeness with this fallback: `isComplete` → `validateFields` (any
Standard Schema) → always complete. The builder never generates `isComplete`. It generates
`validateFields`, and completeness follows from that.

Validators are code objects, so the document stores **library-agnostic rules plus the library
the author chose**. A per-library adapter compiles them into a real Standard Schema validator at
runtime, or into source code on export.

```ts
export type StepValidation =
  | { kind: 'required' }                       // built-in, zero deps: complete when required fields are filled
  | {
      kind: 'schema';
      library: 'builtin' | 'zod' | 'valibot' | 'arktype' | (string & {});
      fields: Record<string /* field key */, FieldSchemaSpec>;
      refinements?: { ref: string; args?: JsonValue; message?: string }[];   // cross-field, registered (§2)
    }
  | { kind: 'code'; ref: string };             // validator written in app code: shown, not editable

export interface FieldSchemaSpec {
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';
  optional?: boolean;
  checks?: FieldCheck[];
  items?: FieldSchemaSpec;                              // arrays
  shape?: Record<string, FieldSchemaSpec>;              // groups
}

export type FieldCheck = { message?: string } & (
  | { check: 'minLength' | 'maxLength' | 'length'; value: number }
  | { check: 'min' | 'max'; value: number | string }
  | { check: 'email' | 'url' | 'uuid' | 'integer' }
  | { check: 'pattern'; value: string; flags?: string }
  | { check: 'oneOf'; values: JsonValue[] }
  | { check: 'equalsField'; field: string }            // "confirm password"
);
```

The builder fills in sensible defaults from each field: `isRequired` → not optional, a
`string.email` type → an `email` check, select options → `oneOf`. Authors refine them in the
step's **Validation** inspector section (library picker + per-field rules).

**Adapters** live in separate packages so apps only install the library they use. Each adapter
has a peer dependency on its library:

```ts
interface ValidatorAdapter {
  library: string;
  compile(step: StepDefinition, ctx: { registry: FormRegistry }): StandardSchemaV1;  // runtime + preview
  emit(step: StepDefinition): { imports: string[]; code: string };                    // code export
  supports(spec: FieldSchemaSpec): true | string;                                     // e.g. a check it can't express
}

import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';
import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';   // not built yet
createRegistry({ validators: [zodAdapter, valibotAdapter] });   // the builder only offers registered libraries
```

`builtin` is a small Standard Schema implementation with no dependencies. It's the default when
the author doesn't care which library is used.

Code export for a `zod` step (builder site → paste into an app):

```ts
step1: {
  title: 'Personal Information',
  fields: { email: { defaultValue: '', type: 'string.email', isRequired: true } },
  validateFields: z.object({
    email: z.string().email('Enter a valid email'),
    age: z.number().int().min(18).optional(),
  }),
},
```

Constraints:

- **Synchronous only.** Core rejects async Standard Schema results
  (`packages/core/src/utils/validator.ts`), so adapters must not emit async refinements.
  Server-side checks (for example "username taken") belong in a separate async rule type later.
- **Cross-field logic** (`equalsField`, registered refinements) compiles to the library's
  object-level refine (`superRefine`, `v.forward(v.check())`, `.narrow()`). Refinements are
  registered per library, because each refinement is code.
- Switching a step's library keeps the rules. Only the compile target changes. `supports()` flags
  any check the new library can't express before the switch is applied.

---

## 2. Registry: field types drive the palette and the inspector

Each field type describes itself once. The palette, canvas drop rules, inspector, logic editor,
and preview all read from it, so adding a new field type needs no builder UI changes.

```ts
const registry = createRegistry()
  .fieldType('text', {
    palette: { label: 'Short text', icon: 'type', category: 'Basic', keywords: ['input', 'string'] },
    defaults: { label: 'Untitled', props: { maxLength: undefined } },
    valueType: 'string',                       // drives logic-editor operators + preview coercion
    inspector: [
      section('General', [
        prop.text('label', { label: 'Label', required: true }),
        prop.text('placeholder', { label: 'Placeholder' }),
        prop.switch('required', { label: 'Required' }),
      ]),
      section('Validation', [
        prop.number('props.maxLength', { label: 'Max length', min: 1 }),
        prop.rules('rules', { allowed: ['minLength', 'maxLength', 'pattern', 'email'] }),
      ]),
      section('Logic', [prop.condition('visibleWhen', { label: 'Show when' })]),
    ],
  })
  .fieldType('select', {
    palette: { label: 'Dropdown', icon: 'list', category: 'Choice' },
    defaults: { props: { options: [{ value: 'a', label: 'Option A' }] } },
    valueType: 'enum',
    inspector: [section('Options', [prop.options('props.options', { reorderable: true })]), /* … */],
  })
  .fieldType('group', {
    palette: { label: 'Group', icon: 'box', category: 'Layout' },
    container: { accepts: (type) => type !== 'repeater', maxDepth: 2 },   // drop rules
    valueType: 'object',
  })
  .rule('postalCode', { label: 'Postal code', args: [prop.select('country', { options: ['US', 'CA'] })] })
  .condition('isBusinessHours', { label: 'During business hours' });
```

`prop.*` builders produce `PropertyDescriptor`s. They are data, so the inspector can be rendered
by any framework (see §6).

```ts
type ControlKind =
  | 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color'
  | 'options'      // editable list of { value, label }
  | 'rules'        // validation rule list
  | 'condition'    // opens the logic editor (§7)
  | 'key'          // data key with slug + uniqueness validation
  | (string & {}); // custom controls you render yourself

interface PropertyDescriptor {
  path: string;                       // dot path inside the node, e.g. "props.maxLength"
  control: ControlKind;
  label: string; description?: string;
  required?: boolean;
  visibleWhen?: (node: FieldDefinition) => boolean;   // e.g. hide "rows" unless multiline
  validate?: (value: unknown, node: FieldDefinition) => string | undefined;
  [config: string]: unknown;          // min, max, options, …
}
```

---

## 3. Builder store

```ts
const builder = createFormBuilder({
  registry,
  initial?: FormDefinition,
  idGenerator?: () => string,
  history?: { limit?: number; mergeWindowMs?: number },  // coalesce rapid typing into one undo step
  storage?: BuilderStorage,                              // autosave adapter (§8)
  onChange?: (definition, patches) => void,
});

builder.getSnapshot(): BuilderSnapshot;
builder.subscribe(listener): () => void;
builder.select<T>(selector, listener, equals?): () => void;   // fine-grained subscriptions
builder.destroy(): void;

interface BuilderSnapshot {
  definition: FormDefinition;
  mode: 'edit' | 'preview';
  activeStepId: string | null;                 // step shown on the canvas
  selection: { ids: string[]; anchorId: string | null; focusId: string | null };
  hoverId: string | null;
  drag: DragState | null;                      // see §5
  issues: DefinitionIssue[];                   // dangling refs, duplicate keys, cyclic branches…
  history: { canUndo: boolean; canRedo: boolean };
  status: { dirty: boolean; saving: boolean; lastSavedAt?: number; error?: unknown };
}
```

### Commands

Every UI action calls a command. You can call them directly too, for example from a CLI, tests,
or an AI assistant.

```ts
builder.steps.add(input?, at?) / update(id, patch) / remove(id) / move(id, index) / setActive(id)
builder.nodes.add(type, { parentId, index }, overrides?) → id
builder.nodes.update(id, patch) / remove(ids) / move(ids, { parentId, index }) / duplicate(ids)
builder.nodes.wrap(ids, containerType) / unwrap(id)
builder.logic.setCondition(id, slot, cond | null) / setNavigation(rules)
builder.history.undo() / redo() / transaction(label, fn)
builder.clipboard.copy(ids) / cut(ids) / paste({ parentId, index }?)   // remaps ids + keys on paste
builder.setMode('edit' | 'preview')
builder.load(definition) / toJSON()
builder.validate(): DefinitionIssue[]
```

Integrity rules are enforced inside commands. Renaming a field `key` rewrites every condition
and `matchesField` reference that points at it, in the same transaction. Deleting a field that
conditions reference produces an issue (or optionally a `confirm` hook) instead of silently
breaking logic.

---

## 4. Palette

```ts
const palette = builder.palette({ search?: string });

palette.getSnapshot(): {
  categories: { name: string; items: PaletteItem[] }[];   // filtered by search + keywords
  search: string;
};
palette.setSearch(query);

palette.getSearchProps();            // role=searchbox, value, onInput, aria-controls
palette.getListProps();              // role=listbox
palette.getItemProps(item);          // role=option, draggable, tabIndex (roving),
                                     // onPointerDown (starts drag), onClick (append to selection's parent),
                                     // onKeyDown (Enter = insert, Space = pick up for keyboard drag)
```

Palette items can also be **saved snippets**: `registry.snippet('Address block', fragment)`
inserts a prebuilt group of fields.

---

## 5. Canvas and drag & drop

The canvas is a tree: steps → fields → nested container children. The library computes the
tree, drop targets, insertion indicators, and keyboard moves. You render the boxes.

```ts
const canvas = builder.canvas();

canvas.getSnapshot(): {
  step: StepDefinition;                      // active step
  tree: CanvasNode[];                        // { id, type, depth, parentId, index, children, def, isSelected,
                                             //   isHovered, isDragging, issues }
  dropIndicator: { parentId: string; index: number; edge: 'before' | 'after' | 'inside' } | null;
};

canvas.getRootProps();                       // role=tree, aria-label, onKeyDown (navigation, shortcuts),
                                             // onPointerMove/Up (drag tracking), auto-scroll container
canvas.getNodeProps(node);                   // role=treeitem, aria-selected/level/setsize/posinset,
                                             // tabIndex (roving), data-* state attrs, onClick (select),
                                             // onPointerEnter/Leave (hover), ref (measurement)
canvas.getDragHandleProps(node);             // onPointerDown, aria-roledescription="draggable", aria-describedby
canvas.getDropZoneProps(parentId);           // for empty containers / empty steps
canvas.getStepTabProps(step);                // role=tab, also a drop target (drop field onto another step)
```

### Drag and drop (built on `@dnd-kit/dom`)

**Decision:** we don't build our own drag engine. `@dnd-kit/dom` has no framework dependency and
has official React, Vue, Svelte, and Solid adapters. It already provides pointer and keyboard
sensors, collision detection, auto-scroll, and screen-reader announcements. The builder owns the
**model**: what may be dropped where, the resulting commands, and the drop indicator state.

- **Sources**: palette items (create), canvas nodes (move), and multi-selection (move many).
- **Wiring**: `getNodeProps` / `getDragHandleProps` / `getDropZoneProps` register the matching
  dnd-kit draggables and droppables, so consumers never touch dnd-kit directly unless they want to.
- **Keyboard**: dnd-kit's keyboard sensor (Space picks up, arrows move, Enter drops, Escape
  cancels). Announcements use builder-provided text ("Moved Email into Contact, position 2 of 4")
  that can be overridden through `messages`.
- **Rules**: `container.accepts`, `maxDepth`, and an optional global
  `canDrop({ source, target }) => boolean | string` (a string explains why it's blocked, for a
  tooltip). Blocked targets are filtered out before dnd-kit's collision detection runs.
- **Results** always go through `nodes.add` / `nodes.move`, so they are undoable and validated.

```ts
type DragState = {
  source: { kind: 'palette'; type: string } | { kind: 'nodes'; ids: string[] };
  pointer: { x: number; y: number } | null;   // null during keyboard drags
  target: { parentId: string; index: number } | null;
  blockedReason?: string;
};
```

You render your own "ghost" from `snapshot.drag`, so it can be any component.

---

## 6. Selection, keyboard, and inspector

### Selection

Click selects; Shift-click selects a range within a parent; Cmd/Ctrl-click toggles one node;
Escape clears. Focus follows selection with a roving `tabIndex`.

### Default shortcuts (overridable)

| Keys | Action |
| --- | --- |
| ↑ / ↓ | Move focus |
| Alt + ↑ / ↓ | Reorder selected nodes |
| ← / → | Collapse / expand container, or move out of / into it |
| Delete / Backspace | Remove (undoable) |
| Mod + D | Duplicate |
| Mod + C / X / V | Copy / cut / paste |
| Mod + Z / Shift + Mod + Z | Undo / redo |
| Mod + G | Wrap selection in a group |

```ts
createFormBuilder({ shortcuts: { 'mod+d': 'nodes.duplicate', 'mod+shift+p': false /* disable */ } });
```

### Inspector

The inspector turns the registry's descriptors into ready-to-render fields for the current
selection. Your UI maps `control` to components and doesn't hand-code any panels.

```ts
const inspector = builder.inspector();

inspector.getSnapshot(): {
  target: { kind: 'none' } | { kind: 'form' } | { kind: 'step'; id } | { kind: 'nodes'; ids; types };
  sections: {
    title: string;
    properties: {
      descriptor: PropertyDescriptor;
      value: unknown;
      mixed: boolean;          // multi-select with differing values
      error?: string;          // descriptor.validate / key uniqueness
      disabled: boolean;
    }[];
  }[];
};

inspector.setValue(path, value);   // applies to every selected node; one undo step
inspector.getControlProps(path);   // id, value, onChange, aria-invalid, aria-describedby
inspector.getLabelProps(path);
inspector.getErrorProps(path);

// Collection controls
inspector.options(path) → { items, add(), remove(i), move(from, to), getItemProps(i) }
inspector.rules(path)   → { items, available, add(rule), update(i, patch), remove(i) }
```

When several selected nodes have different types, the inspector shows only properties they share.

---

## 7. Logic editor (conditions and branching)

A headless model for "Show this field when …" and "After step A go to …" UIs.

```ts
const logic = builder.conditionEditor({ nodeId, slot: 'visibleWhen' });   // or { navigation: true }

logic.getSnapshot(): {
  root: ConditionGroupModel;           // { id, kind: 'and' | 'or', negated, children: (Group | Rule)[] }
  issues: { ruleId: string; message: string }[];
};

// Rule-level helpers driven by the registry's valueType
logic.fieldOptions(ruleId);   // only fields earlier in the flow (prevents forward references and cycles)
logic.operatorOptions(ruleId);// e.g. string → eq/contains/empty…, number → gt/lt…, enum → in/notIn
logic.valueControl(ruleId);   // { control: 'text' | 'number' | 'select' | 'multiselect' | 'none', options? }

logic.addRule(groupId) / addGroup(groupId, kind) / remove(id) / move(id, groupId, index)
logic.updateRule(ruleId, { field?, op?, value? })   // resets incompatible op/value automatically
logic.setGroupKind(groupId, 'and' | 'or') / toggleNot(groupId)
logic.commit() / discard()                            // edits are staged, then committed as one undo step
logic.describe(): string                              // "Show when Country is US and Age ≥ 18"
```

Navigation editing is the same model with a "go to step" target per rule, plus cycle detection
reported as `issues`.

---

## 8. Persistence, autosave, and collaboration

```ts
interface BuilderStorage {
  load(formId: string): Promise<FormDefinition>;
  save(definition: FormDefinition, ctx: { patches: JsonPatch[]; baseRevision: number }): Promise<{ revision: number }>;
  publish?(definition: FormDefinition): Promise<{ revision: number }>;
}

createFormBuilder({ storage, autosave: { debounceMs: 1000 } });
builder.save() / builder.publish();
builder.onPatch((patches, inverse, meta) => { /* audit log, analytics */ });
```

`localStorage`, `fetch` (REST), and in-memory adapters ship built in.

**Decision:** single editor for v1. `save` sends `baseRevision`, so the server can reject a stale
save if the form changed elsewhere (another tab, a deploy). Real-time multi-user editing is out of
scope, but patches are JSON Patch so a later Yjs binding stays possible.

---

## 9. Preview

Preview runs the real form runtime against the document being edited, so what the author sees
is exactly what end users get.

```ts
builder.setMode('preview');
const runtime = builder.preview.runtime();   // FormRuntime compiled from the current definition
builder.preview.setValues(sample);           // test branching with sample data
builder.preview.jumpTo(stepKey);
```

The runtime recompiles when the definition changes and keeps the values entered so far wherever
field keys still match. Its API (`getSnapshot`, `next`, `back`, `setValue`, `submit`, prop
getters) is what you use to render the published form on any site.

---

## 10. Adapters and usage

Core prop getters return a neutral shape. Adapters translate event and attribute names
(`onPointerDown` vs `onpointerdown` vs `@pointerdown`, `className` vs `class`) and merge your
own handlers with the library's.

### React

```tsx
const builder = useFormBuilder({ registry, initial });

function Palette() {
  const palette = usePalette(builder);
  return (
    <aside>
      <input {...palette.getSearchProps()} />
      {palette.categories.map((c) => (
        <section key={c.name}>
          <h3>{c.name}</h3>
          <ul {...palette.getListProps()}>
            {c.items.map((item) => (
              <li key={item.type} {...palette.getItemProps(item)}>{item.label}</li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}

function Canvas() {
  const canvas = useCanvas(builder);
  return (
    <div {...canvas.getRootProps()}>
      {canvas.tree.map(function Node(node) {
        return (
          <div key={node.id} {...canvas.getNodeProps(node)} className={node.isSelected ? 'ring-2' : ''}>
            <button {...canvas.getDragHandleProps(node)}>⋮⋮</button>
            <FieldPreview def={node.def} />            {/* your component */}
            {node.children?.map(Node)}
          </div>
        );
      })}
      {canvas.dropIndicator && <DropLine {...canvas.dropIndicator} />}
    </div>
  );
}

function Inspector() {
  const inspector = useInspector(builder);
  return inspector.sections.map((s) => (
    <fieldset key={s.title}>
      <legend>{s.title}</legend>
      {s.properties.map((p) => <PropertyControl key={p.descriptor.path} property={p} inspector={inspector} />)}
    </fieldset>
  ));
}
```

### Vanilla / any site

```ts
import { createFormBuilder } from '@jfdevelops/form-builder-core';
import { bindPalette, bindCanvas, bindInspector } from '@jfdevelops/form-builder-dom';

const builder = createFormBuilder({ registry });
bindPalette(document.querySelector('#palette'), builder, { renderItem: (item) => `<span>${item.label}</span>` });
bindCanvas(document.querySelector('#canvas'), builder, { renderNode: (node) => myFieldCard(node) });
bindInspector(document.querySelector('#inspector'), builder, { controls: { text: myTextControl } });
```

Or use the unstyled shell as a quick start, with slots for every region:

```html
<script src="https://cdn.jsdelivr.net/npm/@jfdevelops/form-builder-dom@1/dist/embed.js" defer></script>
<msf-builder src="/api/forms/contact" save-url="/api/forms/contact"></msf-builder>
```

---

## 11. Accessibility contract

- The canvas follows the WAI-ARIA **tree** pattern, the palette is a **listbox**, and step tabs
  follow the **tabs** pattern.
- Every pointer interaction has a keyboard equivalent, including drag and drop (§5).
- Drag, drop, delete, undo, and paste are announced through a built-in live region. All messages
  can be overridden through `messages` for i18n.
- Focus is restored predictably: to the next sibling after delete, and to the pasted node after
  paste.

## 12. Security notes

- Definitions stay data: no functions or code strings are stored. Custom behavior lives in the
  registry, which ships with the host app.
- Labels and descriptions are rendered as text by default. Rich text needs an explicit control
  that you sanitize.
- `pattern` rules are length-capped and checked for catastrophic backtracking when authored.

---

## Open questions

1. **Scope of v1**: is a single-column layout per step enough, or do you need grid/columns layout
   (row/column containers with resizing) from the start? Grid editing is much more work in the
   drag engine.
2. **Field type vocabulary**: core uses `string`, `date`, `string.email`; the builder palette
   wants `text`, `email`, `select`, … Should we map them in `compileDefinition` or unify core's
   types?
3. **Package home**: should this live in this monorepo next to core and react, or in a separate
   repo that depends on the published packages?
4. **Reference UI**: should we ship an optional styled kit (for example shadcn-based) as an
   example on top of the headless layer?
