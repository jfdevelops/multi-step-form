import { useFormSettings } from '@jfdevelops/react-multi-step-form-builder';

/** Named instances share the form definition and keep independent runtime state. */
export function InstanceSettings() {
  const { settings, update } = useFormSettings();
  const instances = settings.instances ?? [];

  function addInstance() {
    let number = 1;

    while (instances.includes(`instance${number}`)) {
      number += 1;
    }

    update({ instances: [...instances, `instance${number}`] });
  }

  return (
    <fieldset className="instance-settings">
      <legend>Instances</legend>
      {instances.map((name, index) => (
        <div key={index} className="instance-row">
          <input
            aria-label={`Instance ${index + 1} name`}
            value={name}
            onChange={(event) => update({ instances: instances.map((current, position) => position === index ? event.target.value : current) })}
          />
          <button
            type="button"
            aria-label={`Remove instance ${index + 1}`}
            onClick={() => {
              const remaining = instances.filter((_, position) => position !== index);

              update({ instances: remaining.length > 0 ? remaining : undefined });
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addInstance}>Add instance</button>
    </fieldset>
  );
}
