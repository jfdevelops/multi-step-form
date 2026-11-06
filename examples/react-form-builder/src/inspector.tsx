import type { FieldDefinition, FieldOption, JsonValue } from '@jfdevelops/multi-step-form-builder-core';
import {
  Inspector,
  InspectorProperty,
  StepValidation,
  type InspectorPropertyState,
} from '@jfdevelops/react-multi-step-form-builder';
import { SchemaEditor } from './schema-editor';
import { ValueEditor } from './value-editor';

/** The selected field's (or the active step's) properties, its value type and the step's validation. */
export function InspectorPanel() {
  return (
    <aside className="panel inspector">
      <Inspector>
        {({ target, sections }) => (
          <>
            <h2>{target.type === 'fields' ? (target.fields.length > 1 ? `${target.fields.length} fields` : 'Field') : 'Step'}</h2>
            {sections.map((section) => (
              <fieldset key={section.id}>
                <legend>{section.title}</legend>
                {section.properties.map((property) => (
                  <InspectorProperty key={property.descriptor.path} property={property} className="property">
                    {(state) => <PropertyControl {...state} />}
                  </InspectorProperty>
                ))}
              </fieldset>
            ))}
            {target.type === 'step' && <StepValidationSettings />}
          </>
        )}
      </Inspector>
      <SchemaEditor />
    </aside>
  );
}

/** How the step is validated: the form's library, none, or its own library. */
function StepValidationSettings() {
  return (
    <StepValidation>
      {({ mode, library, formLibrary, effectiveLibrary, libraries, codeRef, setMode }) => (
        <fieldset>
          <legend>Validation</legend>
          {mode === 'code' ? (
            <p className="hint">Validated in application code ({codeRef}).</p>
          ) : (
            <label className="property">
              Validator
              <select
                value={mode === 'schema' ? `schema:${library ?? ''}` : mode}
                onChange={(event) => {
                  const [next, chosen] = event.target.value.split(':');

                  if (next === 'schema') setMode('schema', chosen || undefined);
                  else setMode(next as 'inherit' | 'none');
                }}
              >
                <option value="inherit">Form default ({formLibrary ?? 'none'})</option>
                <option value="none">No validation</option>
                {libraries.map((entry) => (
                  <option key={entry.library} value={`schema:${entry.library}`}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="hint">
            {effectiveLibrary
              ? `Compiled with ${effectiveLibrary}. Required fields and each value’s checks make up the step’s Standard Schema.`
              : 'This step is always complete.'}
          </p>
        </fieldset>
      )}
    </StepValidation>
  );
}

/** Picks an input for an inspector property from its `control`. */
function PropertyControl({
  descriptor,
  value,
  mixed,
  hint,
  node,
  error,
  setValue,
  controlProps,
  labelProps,
  errorProps,
  descriptionProps,
}: InspectorPropertyState) {
  const text = value == null ? '' : String(value);
  let control;

  switch (descriptor.control) {
    case 'switch':
      control = <input {...controlProps} type="checkbox" checked={value === true} onChange={(event) => setValue(event.target.checked)} />;
      break;
    case 'textarea':
      control = <textarea {...controlProps} rows={2} value={text} placeholder={hint} onChange={(event) => setValue(event.target.value)} />;
      break;
    case 'select':
    case 'casing':
      control = (
        <select {...controlProps} value={text} onChange={(event) => setValue(event.target.value)}>
          {mixed && <option value="">— Mixed —</option>}
          {descriptor.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'options':
      control = <OptionsEditor options={(value as FieldOption[] | undefined) ?? []} onChange={setValue} />;
      break;
    case 'value': {
      const field = node as FieldDefinition;

      control = (
        <ValueEditor id={controlProps.id} schema={{ ...field.schema, optional: false }} value={value as JsonValue} onChange={setValue} />
      );
      break;
    }
    default:
      control = (
        <input
          {...controlProps}
          value={text}
          placeholder={mixed ? 'Mixed' : (hint ?? descriptor.placeholder)}
          onChange={(event) => setValue(event.target.value)}
        />
      );
  }

  return (
    <>
      <label {...labelProps}>{descriptor.label}</label>
      {control}
      {descriptor.description && (
        <small className="hint" {...descriptionProps}>
          {descriptor.description}
        </small>
      )}
      {error && (
        <small className="error" {...errorProps}>
          {error}
        </small>
      )}
    </>
  );
}

/** Choice options. Their values become the field's allowed values. */
function OptionsEditor({ options, onChange }: { options: FieldOption[]; onChange: (options: FieldOption[]) => void }) {
  const update = (index: number, patch: Partial<FieldOption>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  return (
    <div className="options">
      {options.map((option, index) => (
        <div key={index} className="option-row">
          <input aria-label="Label" value={option.label} onChange={(event) => update(index, { label: event.target.value })} />
          <input aria-label="Value" value={option.value} onChange={(event) => update(index, { value: event.target.value })} />
          <button type="button" onClick={() => onChange(options.filter((_, i) => i !== index))}>
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, { label: `Option ${options.length + 1}`, value: `option${options.length + 1}` }])}
      >
        Add option
      </button>
    </div>
  );
}
