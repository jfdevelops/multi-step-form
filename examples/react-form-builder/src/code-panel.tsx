import Editor from '@monaco-editor/react';
import { useBuilderSelector, useGeneratedCode } from '@jfdevelops/react-multi-step-form-builder';
import { useEffect, useState } from 'react';
import { disposeGeneratedFiles, loadTypes, syncGeneratedFiles } from './monaco';

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
  const [selectedPath, setSelectedPath] = useState('form.ts');
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

  useEffect(() => {
    syncGeneratedFiles(code.files ?? []);
  }, [code.files]);

  useEffect(() => disposeGeneratedFiles, []);

  if (code.error) {
    return <p className="error">{code.error.message}</p>;
  }

  if (view === 'definition') {
    return (
      <Editor
        height="480px"
        path="file:///definition.json"
        language="json"
        value={JSON.stringify(definition, null, 2)}
        options={EDITOR_OPTIONS}
      />
    );
  }

  const files =
    view === 'module'
      ? code.files
      : code.files.filter((file) =>
          code.steps.some((step) => step.validator && file.path === `steps/${step.key}.ts`),
        );
  const file = files.find((entry) => entry.path === selectedPath) ?? files[0];

  if (!file) {
    return <p className="hint">No step is validated yet. Pick a validator in the toolbar or on a step.</p>;
  }

  return (
    <div>
      <p className="hint">
        {view === 'module'
          ? 'The form split into modules. Select a file and hover anything to see its type'
          : 'Each step’s Standard Schema validator, built with the step’s library. Hover to see its type'}
        {typesLoaded ? '.' : ' (loading types…)'}
      </p>
      <div role="tablist" aria-label="Generated files" className="tabs file-tabs">
        {files.map((entry) => (
          <button
            key={entry.path}
            id={`file-tab-${entry.path}`}
            type="button"
            role="tab"
            aria-selected={file.path === entry.path}
            tabIndex={file.path === entry.path ? 0 : -1}
            onKeyDown={(event) => {
              const index = files.indexOf(entry);
              const last = files.length - 1;
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % files.length
                  : event.key === 'ArrowLeft'
                    ? (index + last) % files.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? last
                        : undefined;

              if (next !== undefined) {
                event.preventDefault();
                setSelectedPath(files[next]!.path);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }
            }}
            aria-controls="generated-file-panel"
            onClick={() => setSelectedPath(entry.path)}
          >
            {entry.path}
          </button>
        ))}
      </div>
      <div id="generated-file-panel" role="tabpanel" aria-labelledby={`file-tab-${file.path}`}>
        <Editor
          height="480px"
          path={`file:///generated/${file.path}`}
          keepCurrentModel
          beforeMount={() => syncGeneratedFiles(code.files)}
          language="typescript"
          value={file.source}
          options={EDITOR_OPTIONS}
        />
      </div>
    </div>
  );
}
