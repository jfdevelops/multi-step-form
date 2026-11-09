import { createEmptyDefinition, toTypeScript } from '@jfdevelops/multi-step-form-builder-core';
import {
  ActionButton,
  AddStepButton,
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Palette,
  PaletteItem,
  PaletteSearch,
  StepList,
  StepTab,
  useBuilder,
  useFormBuilder,
} from '@jfdevelops/react-multi-step-form-builder';
import { lazy, Suspense, useState } from 'react';
import { InspectorPanel } from './inspector';
import { Preview } from './preview';
import { sampleDefinition, registry } from './registry';
import { FormSettingsBar } from './settings';

// Monaco is large, so the code views load on first use.
const CodePanel = lazy(() => import('./code-panel'));

const TABS = [
  { id: 'preview', label: 'Preview' },
  { id: 'module', label: 'Generated code' },
  { id: 'validators', label: 'Standard Schema' },
  { id: 'definition', label: 'Definition (JSON)' },
] as const;

export function App() {
  const builder = useFormBuilder({ registry, initial: sampleDefinition });

  return (
    <FormBuilder builder={builder}>
      <header className="toolbar">
        <strong>Form builder</strong>
        <FormSettingsBar />
        <div className="toolbar-actions">
          <ActionButton action="undo">Undo</ActionButton>
          <ActionButton action="redo">Redo</ActionButton>
          <LoadButtons />
        </div>
      </header>

      <main className="layout">
        <aside className="panel">
          <h2>Fields</h2>
          {/* Click a field type, or drag it onto the canvas or a step tab. */}
          <Palette>
            {({ categories }) => (
              <>
                <PaletteSearch className="search" placeholder="Search" />
                {categories.map((category) => (
                  <section key={category.name}>
                    <h3>{category.name}</h3>
                    {category.items.map((item) => (
                      <PaletteItem key={item.id} item={item} className="palette-item">
                        {item.label}
                      </PaletteItem>
                    ))}
                  </section>
                ))}
              </>
            )}
          </Palette>
        </aside>

        <section className="panel">
          <div className="steps">
            <StepList className="step-list">
              {({ steps }) =>
                steps.map((step) => (
                  <StepTab key={step.id} step={step} className="step-tab">
                    {step.title || step.key}
                  </StepTab>
                ))
              }
            </StepList>
            <AddStepButton>+ Step</AddStepButton>
          </div>

          <Canvas className="canvas">
            {({ fields, activeStep }) =>
              fields.length === 0 ? (
                <p className="hint">Add a field from the left. {activeStep && 'Every step needs at least one field.'}</p>
              ) : (
                fields.map((field) => (
                  <CanvasField key={field.id} field={field} className="canvas-field">
                    {({ remove }) => (
                      <>
                        <DragHandle className="handle">⠿</DragHandle>
                        <div className="canvas-field-body">
                          <span>
                            {field.label ?? <em>No label</em>} <code>{field.key}</code>
                          </span>
                          <small>
                            {field.inputType?.label ?? field.field.type} · <code>{shortType(toTypeScript(field.field.schema))}</code>
                          </small>
                          {field.issues.map((issue) => (
                            <small key={issue.code + issue.message} className={issue.severity === 'error' ? 'error' : 'warning'}>
                              {issue.message}
                            </small>
                          ))}
                        </div>
                        <button type="button" aria-label={`Remove ${field.key}`} onClick={remove}>
                          ×
                        </button>
                      </>
                    )}
                  </CanvasField>
                ))
              )
            }
          </Canvas>
        </section>

        <InspectorPanel />
      </main>

      <BottomPanel />
    </FormBuilder>
  );
}

function shortType(type: string) {
  const flat = type.replace(/\s+/g, ' ');
  return flat.length > 48 ? `${flat.slice(0, 45)}…` : flat;
}

function LoadButtons() {
  const builder = useBuilder();

  return (
    <>
      <button type="button" onClick={() => builder.load(sampleDefinition)}>
        Sample
      </button>
      <button type="button" onClick={() => builder.load(createEmptyDefinition())}>
        Clear
      </button>
    </>
  );
}

function BottomPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('preview');

  return (
    <section className="bottom panel">
      <div role="tablist" className="tabs">
        {TABS.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-selected={tab === entry.id} onClick={() => setTab(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>
      {tab === 'preview' ? (
        <Preview />
      ) : (
        <Suspense fallback={<p className="hint">Loading the editor…</p>}>
          <CodePanel view={tab} />
        </Suspense>
      )}
    </section>
  );
}
