import {
  type SchemaCheck,
  type SchemaCheckName,
  type SchemaEditorNode,
  type SchemaKind,
  type SchemaNode,
} from '@jfdevelops/multi-step-form-builder-core';
import { useSchemaEditor } from '@jfdevelops/react-multi-step-form-builder';
import { useState } from 'react';

type Editor = NonNullable<ReturnType<typeof useSchemaEditor>>;

const CHECK_LABELS: Record<SchemaCheckName, string> = {
  minLength: 'Min length',
  maxLength: 'Max length',
  length: 'Exact length',
  min: 'Min',
  max: 'Max',
  email: 'Email',
  url: 'URL',
  uuid: 'UUID',
  integer: 'Whole number',
  pattern: 'Pattern',
  equalsField: 'Must match field',
};

/**
 * The generic Standard Schema builder: the selected field's value type, nested as deep as needed,
 * with checks on every value. Each step compiles it with the library it uses.
 */
export function SchemaEditor() {
  const editor = useSchemaEditor();

  if (!editor) return null;

  return (
    <fieldset className="schema-editor">
      <legend>Value type &amp; rules</legend>
      <p className="hint">Defines the type of the default value and the step’s validator. “Required” above controls empty values.</p>
      <SchemaNodeEditor editor={editor} node={editor.root} />
    </fieldset>
  );
}

function SchemaNodeEditor({ editor, node, parent }: { editor: Editor; node: SchemaEditorNode; parent?: SchemaEditorNode }) {
  const { schema, path } = node;
  const parentPath = path.slice(0, -1);
  const driven = node.role === 'root' && Array.isArray(editor.field.props?.options);

  return (
    <div className={`schema-node schema-${node.role}`}>
      <div className="schema-header">
        {node.role === 'property' && (
          <PropertyKey
            value={node.name!}
            onRename={(to) => editor.renameProperty(parentPath, node.name!, to)}
          />
        )}
        {node.role === 'item' && <span className="schema-role">Each item</span>}
        {node.role === 'value' && <span className="schema-role">Each value</span>}
        {node.role === 'option' && <span className="schema-role">Option {node.name}</span>}
        <select
          aria-label="Kind"
          value={schema.kind}
          disabled={driven}
          onChange={(event) => editor.setKind(path, event.target.value as SchemaKind)}
        >
          {editor.kinds.map((kind) => (
            <option key={kind.kind} value={kind.kind}>
              {kind.label}
            </option>
          ))}
        </select>
        {node.role === 'property' && (
          <label className="inline">
            <input type="checkbox" checked={Boolean(schema.optional)} onChange={(event) => editor.update(path, { optional: event.target.checked || undefined })} />
            optional
          </label>
        )}
        <label className="inline">
          <input type="checkbox" checked={Boolean(schema.nullable)} onChange={(event) => editor.update(path, { nullable: event.target.checked || undefined })} />
          nullable
        </label>
        {node.role === 'property' && (
          <button type="button" onClick={() => editor.removeProperty(parentPath, node.name!)}>
            Remove
          </button>
        )}
        {node.role === 'option' && parent && (
          <button type="button" onClick={() => editor.removeOption(parentPath, Number(node.name) - 1)}>
            Remove
          </button>
        )}
      </div>

      <KindSettings editor={editor} node={node} driven={driven} />
      <Checks editor={editor} node={node} />

      {node.issues.map((issue) => (
        <p key={issue.code + issue.message} className="error">
          {issue.message}
        </p>
      ))}

      {node.children.length > 0 && (
        <div className="schema-children">
          {node.children.map((child) => (
            <SchemaNodeEditor key={child.path.join('/')} editor={editor} node={child} parent={node} />
          ))}
        </div>
      )}
      {schema.kind === 'object' && (
        <button type="button" onClick={() => editor.addProperty(path)}>
          Add property
        </button>
      )}
      {schema.kind === 'union' && (
        <button type="button" onClick={() => editor.addOption(path)}>
          Add option
        </button>
      )}
    </div>
  );
}

/** Property keys are renamed when the input loses focus, so typing doesn't reshape the value. */
function PropertyKey({ value, onRename }: { value: string; onRename: (to: string) => void }) {
  const [draft, setDraft] = useState(value);

  return (
    <input
      className="schema-key"
      aria-label="Property"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => (draft && draft !== value ? onRename(draft) : setDraft(value))}
    />
  );
}

function KindSettings({ editor, node, driven }: { editor: Editor; node: SchemaEditorNode; driven: boolean }) {
  const { schema, path } = node;

  if (schema.kind === 'literal') {
    return (
      <label className="property">
        Exact value (JSON)
        <input
          defaultValue={JSON.stringify(schema.value)}
          onBlur={(event) => {
            const parsed = parseLiteral(event.target.value);
            if (parsed !== undefined) editor.update(path, { value: parsed } as Partial<SchemaNode>);
          }}
        />
      </label>
    );
  }

  if (schema.kind === 'enum') {
    return driven ? (
      <p className="hint">Allowed values: {schema.values.join(', ')} (from the options above)</p>
    ) : (
      <label className="property">
        Allowed values (comma separated)
        <input
          defaultValue={schema.values.join(', ')}
          onBlur={(event) =>
            editor.update(path, {
              values: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
            } as Partial<SchemaNode>)
          }
        />
      </label>
    );
  }

  return (
    <label className="property">
      Wrong type message
      <input value={schema.message ?? ''} placeholder="Library default" onChange={(event) => editor.update(path, { message: event.target.value || undefined })} />
    </label>
  );
}

function parseLiteral(text: string): string | number | boolean | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
  } catch {
    return text;
  }
}

function Checks({ editor, node }: { editor: Editor; node: SchemaEditorNode }) {
  const checks = node.schema.checks ?? [];

  if (node.availableChecks.length === 0 && checks.length === 0) return null;

  return (
    <div className="checks">
      {checks.map((check, index) => (
        <div key={index} className="check-row">
          <strong>{CHECK_LABELS[check.check]}</strong>
          <CheckParams check={check} node={node} onChange={(next) => editor.updateCheck(node.path, index, next)} />
          <input
            aria-label="Message"
            placeholder="Default message"
            value={check.message ?? ''}
            onChange={(event) => editor.updateCheck(node.path, index, { ...check, message: event.target.value || undefined })}
          />
          <button type="button" onClick={() => editor.removeCheck(node.path, index)}>
            ×
          </button>
        </div>
      ))}
      {node.availableChecks.length > 0 && (
        <select
          aria-label="Add check"
          value=""
          onChange={(event) => event.target.value && editor.addCheck(node.path, event.target.value as SchemaCheckName)}
        >
          <option value="">+ Add check</option>
          {node.availableChecks.map((name) => (
            <option key={name} value={name}>
              {CHECK_LABELS[name]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function CheckParams({ check, node, onChange }: { check: SchemaCheck; node: SchemaEditorNode; onChange: (check: SchemaCheck) => void }) {
  switch (check.check) {
    case 'minLength':
    case 'maxLength':
    case 'length':
      return <input type="number" min={0} value={check.value} onChange={(event) => onChange({ ...check, value: Number(event.target.value) })} />;
    case 'min':
    case 'max':
      return node.schema.kind === 'date' ? (
        <input type="date" value={String(check.value).slice(0, 10)} onChange={(event) => onChange({ ...check, value: event.target.value })} />
      ) : (
        <input type="number" value={Number(check.value)} onChange={(event) => onChange({ ...check, value: Number(event.target.value) })} />
      );
    case 'pattern':
      return (
        <>
          <input aria-label="Pattern" value={check.value} onChange={(event) => onChange({ ...check, value: event.target.value })} />
          <input aria-label="Flags" className="flags" value={check.flags ?? ''} onChange={(event) => onChange({ ...check, flags: event.target.value || undefined })} />
        </>
      );
    case 'equalsField':
      return (
        <select value={check.field} onChange={(event) => onChange({ ...check, field: event.target.value })}>
          {node.siblingKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      );
    default:
      return null;
  }
}

