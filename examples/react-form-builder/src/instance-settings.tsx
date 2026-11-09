import { useFormSettings } from '@jfdevelops/react-multi-step-form-builder';
import { Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function InstanceSettings() {
  const { settings, update } = useFormSettings();
  const instances = settings.instances ?? [];
  const id = useId();

  function addInstance() {
    let number = 1;

    while (instances.includes('instance' + number)) {
      number += 1;
    }

    update({ instances: [...instances, 'instance' + number] });
  }

  return (
    <div className="instance-settings space-y-4">
      {instances.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
          This form currently uses one default instance. Add names to create independent instances.
        </div>
      )}
      {instances.map((name, index) => (
        <div key={index} className="instance-row grid gap-2 rounded-lg border p-3">
          <Label htmlFor={id + '-' + index}>Instance {index + 1}</Label>
          <div className="flex items-center gap-2">
            <Input
              id={id + '-' + index}
              aria-label={'Instance ' + (index + 1) + ' name'}
              value={name}
              onChange={(event) =>
                update({
                  instances: instances.map((current, position) =>
                    position === index ? event.target.value : current,
                  ),
                })
              }
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={'Remove instance ' + (index + 1)}
                  onClick={() => {
                    const remaining = instances.filter((_, position) => position !== index);
                    update({ instances: remaining.length ? remaining : undefined });
                  }}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove instance</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addInstance}>
        <Plus />
        Add instance
      </Button>
    </div>
  );
}
