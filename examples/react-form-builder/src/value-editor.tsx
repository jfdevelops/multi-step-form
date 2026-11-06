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
        <label className="inline">
          <input
            type="checkbox"
            checked={value === null}
            onChange={(event) => onChange(event.target.checked ? null : getEmptyValue(schema))}
          />
          null
        </label>
        {value !== null && <ValueEditor schema={{ ...schema, nullable: false }} value={value} onChange={onChange} id={id} />}
      </div>
    );
  }

  switch (schema.kind) {
    case 'string':
      return <input id={id} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />;

    case 'number':
      return (
        <input
          id={id}
          type="number"
          value={typeof value === 'number' ? value : ''}
          // An empty box means 0: the value always stays a number.
          onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
        />
      );

    case 'boolean':
      return <input id={id} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />;

    case 'date':
      return (
        <input
          id={id}
          type="date"
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(event) => event.target.value && onChange(new Date(`${event.target.value}T00:00:00.000Z`).toISOString())}
        />
      );

    case 'literal':
      return <code>{JSON.stringify(schema.value)}</code>;

    case 'enum':
      return (
        <select id={id} value={String(value ?? '')} onChange={(event) => onChange(schema.values.find((option) => String(option) === event.target.value) ?? '')}>
          <option value="">— None —</option>
          {schema.values.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      );

    case 'object': {
      const current = isObject(value) ? value : {};

      return (
        <div className="nested">
          {schema.properties.length === 0 && <p className="hint">No properties yet. Add some in the value type below.</p>}
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
                    <input
                      type="checkbox"
                      title="Include"
                      checked={included}
                      onChange={(event) => set(event.target.checked ? getEmptyValue(property.schema) : undefined)}
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
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange([...items, getEmptyValue(schema.item)])}>
            Add item
          </button>
        </div>
      );
    }

    case 'record': {
      const entries = Object.entries(isObject(value) ? value : {});

      return (
        <div className="nested">
          {entries.map(([key, item], index) => (
            <div key={index} className="nested-row">
              <input
                className="nested-key"
                value={key}
                onChange={(event) =>
                  onChange(Object.fromEntries(entries.map(([k, v], i) => (i === index ? [event.target.value, v] : [k, v]))))
                }
              />
              <ValueEditor
                schema={schema.value}
                value={item}
                onChange={(next) => onChange(Object.fromEntries(entries.map(([k, v], i) => [k, i === index ? next : v])))}
              />
              <button type="button" onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange(Object.fromEntries([...entries, [`key${entries.length + 1}`, getEmptyValue(schema.value)]]))}
          >
            Add entry
          </button>
        </div>
      );
    }

    case 'union': {
      const selected = Math.max(0, schema.options.findIndex((option) => matchesSchema(option, value)));
      const option = schema.options[selected];

      return (
        <div className="nested">
          <select value={selected} onChange={(event) => onChange(getEmptyValue(schema.options[Number(event.target.value)]!))}>
            {schema.options.map((candidate, index) => (
              <option key={index} value={index}>
                {candidate.kind}
              </option>
            ))}
          </select>
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
  return (
    <textarea
      rows={3}
      defaultValue={JSON.stringify(value, null, 2)}
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
