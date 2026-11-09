import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { FieldOption } from '@jfdevelops/multi-step-form-builder-core';
import { useFormPreview, type PreviewField } from '@jfdevelops/react-multi-step-form-builder';
import { useId, useState } from 'react';
import { ValueEditor } from './value-editor';

/** The form being built, running as a real multi-step form. */
export function Preview({ showValidation = false }: { showValidation?: boolean }) {
  const preview = useFormPreview();
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  if (preview.status === 'error') {
    return <p className="hint">The form can’t run yet: {preview.error.message}</p>;
  }

  const { steps, currentStep, isFirst, isLast, next, previous, goTo, reset } = preview;
  const done = isLast && steps.every((step) => step.isComplete);

  return (
    <div className="preview">
      <ol className="progress">
        {steps.map((step) => (
          <li
            key={step.key}
            data-current={step.key === currentStep.key || undefined}
            data-complete={step.isComplete || undefined}
          >
            <Button variant="outline" type="button" onClick={() => goTo(step.index)}>
              {step.title}
            </Button>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (done) {
            alert('Submitted!');
          } else {
            next();
          }
        }}
      >
        <h3>{currentStep.title}</h3>
        {currentStep.description && <p className="hint">{currentStep.description}</p>}

        {currentStep.fields.map((field) => (
          <PreviewInput
            key={currentStep.key + '.' + field.key}
            field={field}
            showErrors={
              showValidation || currentStep.attempted || touched.has(currentStep.key + '.' + field.key)
            }
            onBlur={() => setTouched((current) => new Set(current).add(currentStep.key + '.' + field.key))}
          />
        ))}

        <div className="preview-actions">
          <Button variant="outline" type="button" onClick={previous} disabled={isFirst}>
            Back
          </Button>
          <Button className="primary-button" type="submit">
            {isLast ? 'Submit' : 'Next'}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              setTouched(new Set());
            }}
          >
            Reset
          </Button>
          {currentStep.isComplete && <span className="ok">Step complete</span>}
          {currentStep.attempted && !currentStep.isComplete && (
            <span className="hint" role="status">
              Complete the highlighted fields to continue.
            </span>
          )}
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
function PreviewInput({
  field,
  showErrors,
  onBlur,
}: {
  field: PreviewField;
  showErrors: boolean;
  onBlur: () => void;
}) {
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
        <Input
          id={id}
          type={INPUT_TYPES[definition.type] ?? 'text'}
          placeholder={definition.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => setValue(event.target.value)}
        />
      );
      break;
    case 'string.textarea':
      input = (
        <Textarea
          id={id}
          rows={3}
          placeholder={definition.placeholder}
          value={String(value ?? '')}
          onChange={(event) => setValue(event.target.value)}
        />
      );
      break;
    case 'string.select':
      input = (
        <NativeSelect id={id} value={String(value ?? '')} onChange={(event) => setValue(event.target.value)}>
          <NativeSelectOption value="">Choose…</NativeSelectOption>
          {options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
      break;
    case 'string.radio':
      input = (
        <RadioGroup
          value={typeof value === 'string' ? value : ''}
          onValueChange={setValue}
          aria-labelledby={id + '-label'}
          className="choices"
        >
          {options.map((option) => (
            <Label key={option.value} className="inline" htmlFor={id + '-' + option.value}>
              <RadioGroupItem id={id + '-' + option.value} value={option.value} />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      );
      break;
    case 'array.checkbox': {
      const selected = Array.isArray(value) ? value : [];
      input = (
        <div className="choices">
          {options.map((option) => (
            <Label key={option.value} className="inline">
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) =>
                  setValue(
                    checked === true
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
              />
              {option.label}
            </Label>
          ))}
        </div>
      );
      break;
    }
    case 'boolean.switch':
      input = <Switch id={id} checked={value === true} onCheckedChange={setValue} />;
      break;
    case 'boolean':
      input = (
        <Checkbox
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => setValue(checked === true)}
        />
      );
      break;
    default:
      input = (
        <ValueEditor
          id={id}
          schema={{ ...definition.schema, optional: false }}
          value={value}
          onChange={setValue}
        />
      );
  }

  return (
    <Field className="preview-field gap-2" onBlurCapture={onBlur}>
      {field.label && (
        <FieldLabel id={`${id}-label`} htmlFor={id}>
          {field.label}
        </FieldLabel>
      )}
      {input}
      {definition.description && (
        <FieldDescription className="hint">{definition.description}</FieldDescription>
      )}
      {showErrors &&
        field.errors.map((message) => (
          <FieldError key={message} className="error">
            {message}
          </FieldError>
        ))}
    </Field>
  );
}
