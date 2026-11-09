import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { FieldDefinition } from '@jfdevelops/multi-step-form-builder-core';

/** Non-interactive field illustrations keep canvas clicks dedicated to selecting a field. */
export function CanvasControl({ field }: { field: FieldDefinition }) {
  const options = Array.isArray(field.props?.options) ? field.props.options : [];
  const value =
    typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number'
      ? field.defaultValue
      : '';
  let control;

  if (field.type === 'string.radio' || field.type === 'array.checkbox') {
    const choices = options.map((option, index) => (
      <Label key={index} className="inline">
        {field.type === 'string.radio' ? (
          <RadioGroupItem value={String(index)} disabled />
        ) : (
          <Checkbox disabled />
        )}
        {option && typeof option === 'object' && 'label' in option ? String(option.label) : 'Option'}
      </Label>
    ));
    control =
      field.type === 'string.radio' ? (
        <RadioGroup disabled className="choices">
          {choices}
        </RadioGroup>
      ) : (
        <div className="choices">{choices}</div>
      );
  } else if (field.type === 'string.select') {
    control = (
      <NativeSelect disabled>
        <NativeSelectOption>{field.placeholder || 'Choose an option'}</NativeSelectOption>
      </NativeSelect>
    );
  } else if (field.type === 'boolean.switch') {
    control = <Switch disabled checked={field.defaultValue === true} />;
  } else if (field.schema.kind === 'boolean') {
    control = (
      <Label className="inline">
        <Checkbox disabled defaultChecked={field.defaultValue === true} />
        {field.placeholder || 'Yes'}
      </Label>
    );
  } else if (field.type === 'string.textarea') {
    control = (
      <Textarea disabled rows={3} defaultValue={value} placeholder={field.placeholder || 'Long answer'} />
    );
  } else if (
    field.schema.kind === 'object' ||
    field.schema.kind === 'array' ||
    field.schema.kind === 'record' ||
    field.schema.kind === 'union' ||
    field.schema.kind === 'unknown'
  ) {
    control = (
      <div className="structured-control">
        {field.schema.kind === 'object' ? 'Group of fields' : 'Structured value'}
        <small>Configure the value in Data</small>
      </div>
    );
  } else {
    control = (
      <Input
        disabled
        type={
          field.schema.kind === 'date'
            ? 'date'
            : field.schema.kind === 'number'
              ? 'number'
              : field.type === 'string.password'
                ? 'password'
                : 'text'
        }
        defaultValue={field.schema.kind === 'date' && typeof value === 'string' ? value.slice(0, 10) : value}
        placeholder={field.placeholder || 'Short answer'}
      />
    );
  }

  return (
    <div className="canvas-control" aria-hidden="true" inert>
      {control}
    </div>
  );
}
