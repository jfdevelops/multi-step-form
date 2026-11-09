import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Preview } from './preview';

export function PreviewWorkspace() {
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="preview-workspace">
      <div className="workspace-heading">
        <div>
          <p className="panel-kicker">Test your form</p>
          <h2>Preview</h2>
          <p className="hint">Your entries stay here when you switch back to Build.</p>
        </div>
        <div className="preview-options">
          <ToggleGroup
            type="single"
            value={width}
            onValueChange={(value) => {
              if (value === 'desktop' || value === 'mobile') {
                setWidth(value);
              }
            }}
            variant="outline"
            aria-label="Preview width"
          >
            <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
            <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
          </ToggleGroup>
          <Label className="inline">
            <Checkbox checked={showErrors} onCheckedChange={(checked) => setShowErrors(checked === true)} />
            Show validation errors
          </Label>
        </div>
      </div>
      <Card className="preview-surface" data-width={width}>
        <Preview showValidation={showErrors} />
      </Card>
    </div>
  );
}
