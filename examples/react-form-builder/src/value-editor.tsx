import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  getEmptyValue,
  matchesSchema,
  type JsonValue,
  type SchemaNode,
} from '@jfdevelops/multi-step-form-builder-core';

interface ValueEditorProps {
  schema: SchemaNode;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  id?: string;
}

const isObject = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Edits a value of any shape, driven by its schema: the same editor sets default values in the
 * inspector and fills in nested values in the preview. Dates are ISO strings, like everywhere
 * in a definition.
 */
export function ValueEditor({ schema, value, onChange, id }: ValueEditorProps) {
  if (schema.nullable) {
    return (
      <div className="nullable">
        <Label className="inline">
          <Checkbox
            checked={value === null}
            onCheckedChange={(checked) => onChange(checked === true ? null : getEmptyValue(schema))}
          />
          null
        </Label>
        {value !== null && (
          <ValueEditor schema={{ ...schema, nullable: false }} value={value} onChange={onChange} id={id} />
        )}
      </div>
    );
  }

  switch (schema.kind) {
    case 'string':
      return (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={typeof value === 'number' ? value : ''}
          // An empty box means 0: the value always stays a number.
          onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
        />
      );

    case 'boolean':
      return (
        <Checkbox
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      );

    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(event) =>
            event.target.value && onChange(new Date(`${event.target.value}T00:00:00.000Z`).toISOString())
          }
        />
      );

    case 'literal':
      return <code>{JSON.stringify(schema.value)}</code>;

    case 'enum':
      return (
        <NativeSelect
          id={id}
          value={String(value ?? '')}
          onChange={(event) =>
            onChange(schema.values.find((option) => String(option) === event.target.value) ?? '')
          }
        >
          <NativeSelectOption value="">— None —</NativeSelectOption>
          {schema.values.map((option) => (
            <NativeSelectOption key={String(option)} value={String(option)}>
              {String(option)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );

    case 'object': {
      const current = isObject(value) ? value : {};

      return (
        <div className="nested">
          {schema.properties.length === 0 && (
            <p className="hint">No properties yet. Add some in the value type below.</p>
          )}
          {schema.properties.map((property) => {
            const included = current[property.key] !== undefined;
            const set = (next: JsonValue | undefined) => {
              const copy = { ...current };

              if (next === undefined) delete copy[property.key];
              else copy[property.key] = next;

              onChange(copy);
            };

            return (
              <div key={property.key} className="nested-row">
                <span className="nested-key">
                  {property.key}
                  {property.schema.optional && (
                    <Checkbox
                      title="Include"
                      checked={included}
                      onCheckedChange={(checked) =>
                        set(checked === true ? getEmptyValue(property.schema) : undefined)
                      }
                    />
                  )}
                </span>
                {(included || !property.schema.optional) && (
                  <ValueEditor schema={property.schema} value={current[property.key]} onChange={set} />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'array': {
      const items = Array.isArray(value) ? value : [];

      return (
        <div className="nested">
          {items.map((item, index) => (
            <div key={index} className="nested-row">
              <span className="nested-key">[{index}]</span>
              <ValueEditor
                schema={schema.item}
                value={item}
                onChange={(next) => onChange(items.map((current, i) => (i === index ? next : current)))}
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            type="button"
            onClick={() => onChange([...items, getEmptyValue(schema.item)])}
          >
            Add item
          </Button>
        </div>
      );
    }

    case 'record': {
      const entries = Object.entries(isObject(value) ? value : {});

      return (
        <div className="nested">
          {entries.map(([key, item], index) => (
            <div key={index} className="nested-row">
              <Input
                className="nested-key"
                value={key}
                onChange={(event) =>
                  onChange(
                    Object.fromEntries(
                      entries.map(([k, v], i) => (i === index ? [event.target.value, v] : [k, v])),
                    ),
                  )
                }
              />
              <ValueEditor
                schema={schema.value}
                value={item}
                onChange={(next) =>
                  onChange(Object.fromEntries(entries.map(([k, v], i) => [k, i === index ? next : v])))
                }
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              onChange(
                Object.fromEntries([...entries, [`key${entries.length + 1}`, getEmptyValue(schema.value)]]),
              )
            }
          >
            Add entry
          </Button>
        </div>
      );
    }

    case 'union': {
      const selected = Math.max(
        0,
        schema.options.findIndex((option) => matchesSchema(option, value)),
      );
      const option = schema.options[selected];

      return (
        <div className="nested">
          <NativeSelect
            value={selected}
            onChange={(event) => onChange(getEmptyValue(schema.options[Number(event.target.value)]!))}
          >
            {schema.options.map((candidate, index) => (
              <NativeSelectOption key={index} value={index}>
                {candidate.kind}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {option && <ValueEditor schema={option} value={value} onChange={onChange} />}
        </div>
      );
    }

    case 'unknown':
      return <JsonEditor value={value ?? null} onChange={onChange} />;
  }
}

/** Free-form JSON, applied when it parses. */
function JsonEditor({ value, onChange }: { value: JsonValue; onChange: (value: JsonValue) => void }) {
  const encoded = JSON.stringify(value, null, 2);

  return (
    <Textarea
      key={encoded}
      rows={3}
      defaultValue={encoded}
      onBlur={(event) => {
        try {
          onChange(JSON.parse(event.target.value) as JsonValue);
        } catch {
          event.target.setCustomValidity('Not valid JSON');
          event.target.reportValidity();
        }
      }}
      onInput={(event) => event.currentTarget.setCustomValidity('')}
    />
  );
}
