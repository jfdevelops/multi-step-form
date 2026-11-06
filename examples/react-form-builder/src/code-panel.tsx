import Editor from '@monaco-editor/react';
import { useBuilderSelector, useGeneratedCode } from '@jfdevelops/react-multi-step-form-builder';
import { useEffect, useState } from 'react';
import { loadTypes } from './monaco';

const EDITOR_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
} as const;

/**
 * The generated code, in an editor with the real packages' types: hover anything to see what
 * TypeScript infers. Loaded lazily, since Monaco is large.
 */
export default function CodePanel({ view }: { view: 'module' | 'validators' | 'definition' }) {
  const code = useGeneratedCode();
  const definition = useBuilderSelector((snapshot) => snapshot.definition);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const packages = code.packages.join(',');

  useEffect(() => {
    let active = true;

    setTypesLoaded(false);
    void loadTypes(packages.split(',').filter(Boolean)).then(() => active && setTypesLoaded(true));

    return () => {
      active = false;
    };
  }, [packages]);

  if (code.error) return <p className="error">{code.error.message}</p>;

  if (view === 'definition') {
    return <Editor height="480px" path="file:///definition.json" language="json" value={JSON.stringify(definition, null, 2)} options={EDITOR_OPTIONS} />;
  }

  const source = view === 'module' ? code.source : code.validatorsSource;

  return (
    <div>
      <p className="hint">
        {view === 'module'
          ? 'The form as TypeScript. Hover anything to see its type'
          : 'Each step’s Standard Schema validator, built with the step’s library. Hover to see its type'}
        {typesLoaded ? '.' : ' (loading types…)'}
      </p>
      {source ? (
        <Editor
          height="480px"
          path={view === 'module' ? 'file:///form.ts' : 'file:///validators.ts'}
          language="typescript"
          value={source}
          options={EDITOR_OPTIONS}
        />
      ) : (
        <p className="hint">No step is validated yet. Pick a validator in the toolbar or on a step.</p>
      )}
    </div>
  );
}
