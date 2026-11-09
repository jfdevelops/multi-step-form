import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { FieldSet, FieldLegend, Field, FieldDescription, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  toKey,
  uniqueKey,
  type FieldDefinition,
  type FieldOption,
  type JsonValue,
} from '@jfdevelops/multi-step-form-builder-core';
import {
  Inspector,
  InspectorProperty,
  StepValidation,
  type InspectorPropertyState,
  useBuilder,
} from '@jfdevelops/react-multi-step-form-builder';
import { useRef } from 'react';
import { SchemaEditor } from './schema-editor';
import { ValueEditor } from './value-editor';

/** The selected field's (or the active step's) properties, its value type and the step's validation. */
export function InspectorPanel() {
  const builder = useBuilder();
  const explicitKeys = useRef<Set<string> | null>(null);

  if (!explicitKeys.current) {
    explicitKeys.current = new Set(
      builder.getSnapshot().definition.steps.flatMap((step) => step.fields.map((field) => field.id)),
    );
  }

  return (
    <Sidebar
      side="right"
      collapsible="none"
      data-side="right"
      role="complementary"
      aria-label="Field properties"
      className="inspector w-full rounded-xl border bg-background lg:max-h-[calc(100svh-104px)]"
    >
      <Inspector className="flex min-h-0 flex-1 flex-col">
        {({ target, sections }) => {
          const properties = sections.flatMap((section) => section.properties);
          const commonPaths = ['label', 'placeholder', 'description', 'isRequired'];
          const common = commonPaths.flatMap((path) =>
            properties.filter((property) => property.descriptor.path === path),
          );
          const validation = properties.filter((property) =>
            ['type', 'errorMessage'].includes(property.descriptor.path),
          );
          const data = properties.filter((property) =>
            ['key', 'defaultValue'].includes(property.descriptor.path),
          );
          const advanced = properties.filter(
            (property) => property.descriptor.path === 'nameTransformCasing',
          );
          const remaining = properties.filter(
            (property) => ![...common, ...validation, ...data, ...advanced].includes(property),
          );

          function renderProperty(property: (typeof properties)[number]) {
            return (
              <InspectorProperty
                key={property.descriptor.path}
                property={property}
                className="property"
                render={(props) => (
                  <Field
                    {...props}
                    orientation={property.descriptor.control === 'switch' ? 'horizontal' : 'vertical'}
                    className="property gap-2"
                  />
                )}
              >
                {(state) => (
                  <PropertyControl
                    {...state}
                    setValue={(value) => {
                      builder.history.transaction(() => {
                        state.setValue(value);

                        if (target.type !== 'fields') {
                          return;
                        }

                        for (const field of target.fields) {
                          if (property.descriptor.path === 'key') {
                            explicitKeys.current?.add(field.id);
                          } else if (
                            property.descriptor.path === 'label' &&
                            typeof value === 'string' &&
                            toKey(value) &&
                            !explicitKeys.current?.has(field.id)
                          ) {
                            const step = builder.getFieldStep(field.id)!;
                            const key = uniqueKey(
                              toKey(value),
                              step.fields
                                .filter((candidate) => candidate.id !== field.id)
                                .map((candidate) => candidate.key),
                            );
                            builder.fields.update(field.id, { key });
                          }
                        }
                      });
                    }}
                  />
                )}
              </InspectorProperty>
            );
          }

          return (
            <>
              <SidebarHeader className="inspector-heading p-5 pb-0">
                <p className="panel-kicker">Properties</p>
                <h2>
                  {target.type === 'fields'
                    ? target.fields.length > 1
                      ? target.fields.length + ' fields'
                      : 'Field settings'
                    : 'Step settings'}
                </h2>
                <p className="hint">
                  {target.type === 'fields'
                    ? 'Change how this field looks and behaves.'
                    : 'Set the title and description for this step.'}
                </p>
                {target.type === 'fields' && (
                  <Button
                    variant="link"
                    className="text-button"
                    type="button"
                    onClick={() => builder.select(null)}
                  >
                    Edit step settings
                  </Button>
                )}
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup className="p-5 pt-0">
                  {target.type === 'fields' ? (
                    <>
                      <FieldSet className="common-properties gap-0">
                        {common.map(renderProperty)}
                        {remaining.map(renderProperty)}
                      </FieldSet>
                      <Accordion type="multiple" className="inspector-section">
                        <AccordionItem value="validation">
                          <AccordionTrigger>Validation</AccordionTrigger>
                          <AccordionContent>
                            <p className="hint">
                              Required controls empty values. Add format and value checks here.
                            </p>
                            {validation.map(renderProperty)}
                            {target.fields.length === 1 && <SchemaEditor section="validation" />}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="data">
                          <AccordionTrigger>Data</AccordionTrigger>
                          <AccordionContent>
                            <p className="hint">
                              The key identifies this field in submitted data. New field keys follow the label
                              until you edit the key.
                            </p>
                            {data.map(renderProperty)}
                            {target.fields.length === 1 && <SchemaEditor section="data" />}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="advanced">
                          <AccordionTrigger>Advanced</AccordionTrigger>
                          <AccordionContent>{advanced.map(renderProperty)}</AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </>
                  ) : (
                    <>
                      {sections.map((section) => (
                        <FieldSet key={section.id}>
                          <FieldLegend>{section.title}</FieldLegend>
                          {section.properties.map(renderProperty)}
                        </FieldSet>
                      ))}
                      {target.type === 'step' && <StepValidationSettings />}
                    </>
                  )}
                </SidebarGroup>
              </SidebarContent>
            </>
          );
        }}
      </Inspector>
    </Sidebar>
  );
}

/** How the step is validated: the form's library, none, or its own library. */
function StepValidationSettings() {
  return (
    <StepValidation>
      {({ mode, library, formLibrary, effectiveLibrary, libraries, codeRef, setMode }) => (
        <FieldSet>
          <FieldLegend>Validation</FieldLegend>
          {mode === 'code' ? (
            <p className="hint">Validated in application code ({codeRef}).</p>
          ) : (
            <Label className="property">
              Validator
              <NativeSelect
                value={mode === 'schema' ? `schema:${library ?? ''}` : mode}
                onChange={(event) => {
                  const [next, chosen] = event.target.value.split(':');

                  if (next === 'schema') setMode('schema', chosen || undefined);
                  else setMode(next as 'inherit' | 'none');
                }}
              >
                <NativeSelectOption value="inherit">
                  Form default ({formLibrary ?? 'none'})
                </NativeSelectOption>
                <NativeSelectOption value="none">No validation</NativeSelectOption>
                {libraries.map((entry) => (
                  <NativeSelectOption key={entry.library} value={`schema:${entry.library}`}>
                    {entry.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Label>
          )}
          <p className="hint">
            {effectiveLibrary
              ? `Compiled with ${effectiveLibrary}. Required fields and each value’s checks make up the step’s Standard Schema.`
              : 'This step is always complete.'}
          </p>
        </FieldSet>
      )}
    </StepValidation>
  );
}

/** Picks an input for an inspector property from its `control`. */
function PropertyControl({
  descriptor,
  value,
  mixed,
  hint,
  node,
  error,
  setValue,
  controlProps,
  labelProps,
  errorProps,
  descriptionProps,
}: InspectorPropertyState) {
  const text = value == null ? '' : String(value);
  let control;

  switch (descriptor.control) {
    case 'switch':
      control = <Switch {...controlProps} checked={value === true} onCheckedChange={setValue} />;
      break;
    case 'textarea':
      control = (
        <Textarea
          {...controlProps}
          rows={2}
          value={text}
          placeholder={hint}
          onChange={(event) => setValue(event.target.value)}
        />
      );
      break;
    case 'select':
    case 'casing':
      control = (
        <NativeSelect {...controlProps} value={text} onChange={(event) => setValue(event.target.value)}>
          {mixed && <NativeSelectOption value="">— Mixed —</NativeSelectOption>}
          {descriptor.options?.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
      break;
    case 'options':
      control = <OptionsEditor options={(value as FieldOption[] | undefined) ?? []} onChange={setValue} />;
      break;
    case 'value': {
      const field = node as FieldDefinition;

      control = (
        <ValueEditor
          id={controlProps.id}
          schema={{ ...field.schema, optional: false }}
          value={value as JsonValue}
          onChange={setValue}
        />
      );
      break;
    }
    default:
      control = (
        <Input
          {...controlProps}
          value={text}
          placeholder={mixed ? 'Mixed' : (hint ?? descriptor.placeholder)}
          onChange={(event) => setValue(event.target.value)}
        />
      );
  }

  return (
    <>
      <Label {...labelProps}>{descriptor.label}</Label>
      {control}
      {descriptor.description && (
        <FieldDescription className="hint" {...descriptionProps}>
          {descriptor.description}
        </FieldDescription>
      )}
      {error && (
        <FieldError className="error" {...errorProps}>
          {error}
        </FieldError>
      )}
    </>
  );
}

/** Choice options. Their values become the field's allowed values. */
function OptionsEditor({
  options,
  onChange,
}: {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}) {
  const update = (index: number, patch: Partial<FieldOption>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  return (
    <div className="options">
      {options.map((option, index) => (
        <div key={index} className="option-row">
          <Input
            aria-label="Label"
            value={option.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <Input
            aria-label="Value"
            value={option.value}
            onChange={(event) => update(index, { value: event.target.value })}
          />
          <Button
            variant="outline"
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        type="button"
        onClick={() =>
          onChange([
            ...options,
            { label: `Option ${options.length + 1}`, value: `option${options.length + 1}` },
          ])
        }
      >
        Add option
      </Button>
    </div>
  );
}
