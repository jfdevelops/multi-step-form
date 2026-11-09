import { cn } from '@/lib/utils';
import { FieldSet, FieldLegend } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type SchemaCheck,
  type SchemaCheckName,
  type SchemaEditorNode,
  type SchemaKind,
  type SchemaNode,
} from '@jfdevelops/multi-step-form-builder-core';
import { useSchemaEditor } from '@jfdevelops/react-multi-step-form-builder';
import { useEffect, useState } from 'react';

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
export function SchemaEditor({ section }: { section: 'data' | 'validation' }) {
  const editor = useSchemaEditor();

  if (!editor) return null;

  return (
    <FieldSet className="schema-editor">
      <FieldLegend>{section === 'data' ? 'Value type' : 'Value checks'}</FieldLegend>
      <p className="hint">
        {section === 'data'
          ? 'Nullable allows null in stored data. Required separately controls empty form values.'
          : 'Checks run with the validator chosen in Form settings.'}
      </p>
      <SchemaNodeEditor editor={editor} node={editor.root} section={section} />
    </FieldSet>
  );
}

function SchemaNodeEditor({
  editor,
  node,
  parent,
  section,
}: {
  editor: Editor;
  node: SchemaEditorNode;
  parent?: SchemaEditorNode;
  section: 'data' | 'validation';
}) {
  const { schema, path } = node;
  const parentPath = path.slice(0, -1);
  const driven = node.role === 'root' && Array.isArray(editor.field.props?.options);

  return (
    <div className={cn('schema-node', 'schema-' + node.role)}>
      {section === 'data' && (
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
          <NativeSelect
            aria-label="Kind"
            value={schema.kind}
            disabled={driven}
            onChange={(event) => editor.setKind(path, event.target.value as SchemaKind)}
          >
            {editor.kinds.map((kind) => (
              <NativeSelectOption key={kind.kind} value={kind.kind}>
                {kind.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {node.role === 'property' && (
            <Label className="inline">
              <Checkbox
                checked={Boolean(schema.optional)}
                onCheckedChange={(checked) =>
                  editor.update(path, { optional: checked === true || undefined })
                }
              />
              optional
            </Label>
          )}
          <Label className="inline">
            <Checkbox
              checked={Boolean(schema.nullable)}
              onCheckedChange={(checked) => editor.update(path, { nullable: checked === true || undefined })}
            />
            nullable
          </Label>
          {node.role === 'property' && (
            <Button
              variant="outline"
              type="button"
              onClick={() => editor.removeProperty(parentPath, node.name!)}
            >
              Remove
            </Button>
          )}
          {node.role === 'option' && parent && (
            <Button
              variant="outline"
              type="button"
              onClick={() => editor.removeOption(parentPath, Number(node.name) - 1)}
            >
              Remove
            </Button>
          )}
        </div>
      )}

      {section === 'data' ? (
        <KindSettings editor={editor} node={node} driven={driven} />
      ) : (
        <>
          <p className="schema-role">
            {node.name || 'Field value'} / {schema.kind}
          </p>
          <Checks editor={editor} node={node} />
        </>
      )}

      {node.issues.map((issue) => (
        <p key={issue.code + issue.message} className="error">
          {issue.message}
        </p>
      ))}

      {node.children.length > 0 && (
        <div className="schema-children">
          {node.children.map((child) => (
            <SchemaNodeEditor
              key={child.path.join('/')}
              editor={editor}
              node={child}
              parent={node}
              section={section}
            />
          ))}
        </div>
      )}
      {section === 'data' && schema.kind === 'object' && (
        <Button variant="outline" type="button" onClick={() => editor.addProperty(path)}>
          Add property
        </Button>
      )}
      {section === 'data' && schema.kind === 'union' && (
        <Button variant="outline" type="button" onClick={() => editor.addOption(path)}>
          Add option
        </Button>
      )}
    </div>
  );
}

/** Property keys are renamed when the input loses focus, so typing doesn't reshape the value. */
function PropertyKey({ value, onRename }: { value: string; onRename: (to: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <Input
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
    const encoded = JSON.stringify(schema.value);

    return (
      <Label className="property">
        Exact value (JSON)
        <Input
          key={encoded}
          defaultValue={encoded}
          onBlur={(event) => {
            const parsed = parseLiteral(event.target.value);
            if (parsed !== undefined) editor.update(path, { value: parsed } as Partial<SchemaNode>);
          }}
        />
      </Label>
    );
  }

  if (schema.kind === 'enum') {
    const encoded = schema.values.join(', ');

    return driven ? (
      <p className="hint">Allowed values: {encoded} (from the options above)</p>
    ) : (
      <Label className="property">
        Allowed values (comma separated)
        <Input
          key={encoded}
          defaultValue={encoded}
          onBlur={(event) =>
            editor.update(path, {
              values: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            } as Partial<SchemaNode>)
          }
        />
      </Label>
    );
  }

  return (
    <Label className="property">
      Wrong type message
      <Input
        value={schema.message ?? ''}
        placeholder="Library default"
        onChange={(event) => editor.update(path, { message: event.target.value || undefined })}
      />
    </Label>
  );
}

function parseLiteral(text: string): string | number | boolean | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? value
      : undefined;
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
          <CheckParams
            check={check}
            node={node}
            onChange={(next) => editor.updateCheck(node.path, index, next)}
          />
          <Input
            aria-label="Message"
            placeholder="Default message"
            value={check.message ?? ''}
            onChange={(event) =>
              editor.updateCheck(node.path, index, { ...check, message: event.target.value || undefined })
            }
          />
          <Button variant="outline" type="button" onClick={() => editor.removeCheck(node.path, index)}>
            ×
          </Button>
        </div>
      ))}
      {node.availableChecks.length > 0 && (
        <NativeSelect
          aria-label="Add check"
          value=""
          onChange={(event) =>
            event.target.value && editor.addCheck(node.path, event.target.value as SchemaCheckName)
          }
        >
          <NativeSelectOption value="">+ Add check</NativeSelectOption>
          {node.availableChecks.map((name) => (
            <NativeSelectOption key={name} value={name}>
              {CHECK_LABELS[name]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </div>
  );
}

function CheckParams({
  check,
  node,
  onChange,
}: {
  check: SchemaCheck;
  node: SchemaEditorNode;
  onChange: (check: SchemaCheck) => void;
}) {
  switch (check.check) {
    case 'minLength':
    case 'maxLength':
    case 'length':
      return (
        <Input
          type="number"
          min={0}
          value={check.value}
          onChange={(event) => onChange({ ...check, value: Number(event.target.value) })}
        />
      );
    case 'min':
    case 'max':
      return node.schema.kind === 'date' ? (
        <Input
          type="date"
          value={String(check.value).slice(0, 10)}
          onChange={(event) => onChange({ ...check, value: event.target.value })}
        />
      ) : (
        <Input
          type="number"
          value={Number(check.value)}
          onChange={(event) => onChange({ ...check, value: Number(event.target.value) })}
        />
      );
    case 'pattern':
      return (
        <>
          <Input
            aria-label="Pattern"
            value={check.value}
            onChange={(event) => onChange({ ...check, value: event.target.value })}
          />
          <Input
            aria-label="Flags"
            className="flags"
            value={check.flags ?? ''}
            onChange={(event) => onChange({ ...check, flags: event.target.value || undefined })}
          />
        </>
      );
    case 'equalsField':
      return (
        <NativeSelect
          value={check.field}
          onChange={(event) => onChange({ ...check, field: event.target.value })}
        >
          {node.siblingKeys.map((key) => (
            <NativeSelectOption key={key} value={key}>
              {key}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    default:
      return null;
  }
}
