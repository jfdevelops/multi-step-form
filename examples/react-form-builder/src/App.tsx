import { toSource, type FieldOption } from '@jfdevelops/multi-step-form-builder-core';
import {
  ActionButton,
  AddStepButton,
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Inspector,
  InspectorProperty,
  Palette,
  PaletteItem,
  StepList,
  StepTab,
  useBuilderSelector,
  useFormBuilder,
  type InspectorPropertyState,
} from '@jfdevelops/react-multi-step-form-builder';
import { useMemo } from 'react';

export function App() {
  const builder = useFormBuilder();

  return (
    <FormBuilder builder={builder}>
      <header className="toolbar">
        <strong>Form builder</strong>
        <ActionButton action="undo">Undo</ActionButton>
        <ActionButton action="redo">Redo</ActionButton>
      </header>

      <main className="layout">
        {/* Click a field type, or drag it onto the canvas or a step tab. */}
        <Palette className="panel">
          {({ items }) =>
            items.map((item) => (
              <PaletteItem key={item.type} item={item} className="palette-item">
                {item.label}
              </PaletteItem>
            ))
          }
        </Palette>

        <section className="panel">
          <div className="steps">
            <StepList className="step-list">
              {({ steps }) =>
                steps.map((step) => (
                  <StepTab key={step.id} step={step} className="step-tab">
                    {step.title}
                  </StepTab>
                ))
              }
            </StepList>
            <AddStepButton>+ Step</AddStepButton>
          </div>

          <Canvas className="canvas">
            {({ fields }) =>
              fields.length === 0 ? (
                <p className="hint">Add a field from the left.</p>
              ) : (
                fields.map((field) => (
                  <CanvasField key={field.id} field={field} className="canvas-field">
                    <DragHandle className="handle">⠿</DragHandle>
                    <span>{field.field.label || field.key}</span>
                    <small>{field.fieldType?.label ?? field.field.type}</small>
                  </CanvasField>
                ))
              )
            }
          </Canvas>
        </section>

        <Inspector className="panel">
          {({ sections }) =>
            sections.map((section) => (
              <fieldset key={section.id}>
                <legend>{section.title}</legend>
                {section.properties.map((property) => (
                  <InspectorProperty
                    key={property.descriptor.path}
                    property={property}
                    className="property"
                  >
                    {(state) => <PropertyControl {...state} />}
                  </InspectorProperty>
                ))}
              </fieldset>
            ))
          }
        </Inspector>
      </main>

      <GeneratedCode />
    </FormBuilder>
  );
}

/** Picks an input for an inspector property based on its `control`. */
function PropertyControl({
  descriptor,
  value,
  error,
  setValue,
  controlProps,
  labelProps,
  errorProps,
}: InspectorPropertyState) {
  let control;

  switch (descriptor.control) {
    case 'switch':
      control = (
        <input
          {...controlProps}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => setValue(event.target.checked)}
        />
      );
      break;
    case 'number':
      control = (
        <input
          {...controlProps}
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            setValue(event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      );
      break;
    case 'select':
      control = (
        <select
          {...controlProps}
          value={String(value ?? '')}
          onChange={(event) => setValue(event.target.value)}
        >
          {descriptor.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'options':
      // One option per line.
      control = (
        <textarea
          {...controlProps}
          rows={3}
          value={((value as FieldOption[] | undefined) ?? []).map((option) => option.label).join('\n')}
          onChange={(event) =>
            setValue(
              event.target.value
                .split('\n')
                .map((label) => ({ label, value: label.trim().toLowerCase().replace(/\s+/g, '-') })),
            )
          }
        />
      );
      break;
    case 'textarea':
      control = (
        <textarea
          {...controlProps}
          rows={2}
          value={String(value ?? '')}
          onChange={(event) => setValue(event.target.value)}
        />
      );
      break;
    default:
      control = (
        <input
          {...controlProps}
          value={value == null ? '' : String(value)}
          placeholder={descriptor.placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
      );
  }

  return (
    <>
      <label {...labelProps}>{descriptor.label}</label>
      {control}
      {error && <span {...errorProps}>{error}</span>}
    </>
  );
}

/** The form as `defineMultiStepForm` source, updated on every edit. */
function GeneratedCode() {
  const definition = useBuilderSelector((snapshot) => snapshot.definition);
  const code = useMemo(() => toSource(definition), [definition]);

  return (
    <details className="code">
      <summary>Generated code</summary>
      <pre>{code}</pre>
    </details>
  );
}
