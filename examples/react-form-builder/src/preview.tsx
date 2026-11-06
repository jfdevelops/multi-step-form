import type { FieldOption } from '@jfdevelops/multi-step-form-builder-core';
import { useFormPreview, type PreviewField } from '@jfdevelops/react-multi-step-form-builder';
import { useId } from 'react';
import { ValueEditor } from './value-editor';

/** The form being built, running as a real multi-step form. */
export function Preview() {
  const preview = useFormPreview();

  if (preview.status === 'error') {
    return <p className="hint">The form can’t run yet: {preview.error.message}</p>;
  }

  const { steps, currentStep, isFirst, isLast, next, previous, goTo, reset } = preview;
  const done = isLast && steps.every((step) => step.isComplete);

  return (
    <div className="preview">
      <ol className="progress">
        {steps.map((step) => (
          <li key={step.key} data-current={step.key === currentStep.key || undefined} data-complete={step.isComplete || undefined}>
            <button type="button" onClick={() => goTo(step.index)}>
              {step.title}
            </button>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          next();
        }}
      >
        <h3>{currentStep.title}</h3>
        {currentStep.description && <p className="hint">{currentStep.description}</p>}

        {currentStep.fields.map((field) => (
          <PreviewInput key={field.key} field={field} showErrors={currentStep.attempted} />
        ))}

        <div className="preview-actions">
          <button type="button" onClick={previous} disabled={isFirst}>
            Back
          </button>
          {isLast ? (
            <button type="button" disabled={!done} onClick={() => alert('Submitted!')}>
              Submit
            </button>
          ) : (
            <button type="submit">Next</button>
          )}
          <button type="button" onClick={reset}>
            Reset
          </button>
          <span className={currentStep.isComplete ? 'ok' : 'hint'}>
            {currentStep.isComplete ? 'Step complete' : 'Step incomplete'}
          </span>
        </div>
      </form>
    </div>
  );
}

const INPUT_TYPES: Record<string, string> = {
  'string.email': 'email',
  'string.url': 'url',
  'string.tel': 'tel',
  'string.password': 'password',
};

/** Renders a field by its input type, falling back to the schema-driven editor for structured values. */
function PreviewInput({ field, showErrors }: { field: PreviewField; showErrors: boolean }) {
  const id = useId();
  const { definition, value, setValue } = field;
  const options = (definition.props?.options ?? []) as unknown as FieldOption[];
  let input;

  switch (definition.type) {
    case 'string':
    case 'string.email':
    case 'string.url':
    case 'string.tel':
    case 'string.password':
      input = (
        <input
          id={id}
          type={INPUT_TYPES[definition.type] ?? 'text'}
          placeholder={definition.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => setValue(event.target.value)}
        />
      );
      break;
    case 'string.textarea':
      input = <textarea id={id} rows={3} placeholder={definition.placeholder} value={String(value ?? '')} onChange={(event) => setValue(event.target.value)} />;
      break;
    case 'string.select':
      input = (
        <select id={id} value={String(value ?? '')} onChange={(event) => setValue(event.target.value)}>
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'string.radio':
      input = (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="choices">
          {options.map((option) => (
            <label key={option.value} className="inline">
              <input type="radio" name={id} checked={value === option.value} onChange={() => setValue(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      );
      break;
    case 'array.checkbox': {
      const selected = Array.isArray(value) ? value : [];
      input = (
        <div className="choices">
          {options.map((option) => (
            <label key={option.value} className="inline">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) =>
                  setValue(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'boolean':
    case 'boolean.switch':
      input = <input id={id} type="checkbox" role={definition.type === 'boolean.switch' ? 'switch' : undefined} checked={value === true} onChange={(event) => setValue(event.target.checked)} />;
      break;
    default:
      input = <ValueEditor id={id} schema={{ ...definition.schema, optional: false }} value={value} onChange={setValue} />;
  }

  return (
    <div className="preview-field">
      {field.label && (
        <label id={`${id}-label`} htmlFor={id}>
          {field.label}
        </label>
      )}
      {input}
      {definition.description && <small className="hint">{definition.description}</small>}
      {showErrors &&
        field.errors.map((message) => (
          <small key={message} className="error">
            {message}
          </small>
        ))}
    </div>
  );
}
