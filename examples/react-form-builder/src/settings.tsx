import { useFormSettings } from '@jfdevelops/react-multi-step-form-builder';
import { InstanceSettings } from './instance-settings';

/** Form-wide settings: the default validator library, label casing, storage and instances. */
export function FormSettingsBar() {
  const { settings, casings, libraries, issues, update } = useFormSettings();

  return (
    <div className="settings">
      <label>
        Validator
        <select value={settings.validator ?? ''} onChange={(event) => update({ validator: event.target.value || undefined })}>
          <option value="">None</option>
          {libraries.map((entry) => (
            <option key={entry.library} value={entry.library}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Label casing
        <select
          value={settings.nameTransformCasing ?? 'title'}
          onChange={(event) =>
            update({ nameTransformCasing: event.target.value === 'title' ? undefined : (event.target.value as typeof settings.nameTransformCasing) })
          }
        >
          {casings.map((casing) => (
            <option key={casing.value} value={casing.value}>
              {casing.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Storage key
        <input
          value={settings.storageKey ?? ''}
          placeholder="Not persisted"
          onChange={(event) => update({ storageKey: event.target.value || undefined })}
        />
      </label>
      <InstanceSettings />
      {issues.map((issue) => (
        <span key={issue.code} className="error">
          {issue.message}
        </span>
      ))}
    </div>
  );
}
