import { schema, useCurrentStepData } from '.';
import { Field, FieldLabel, FieldSet } from '../field';
import { Input } from '../input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

export const Step1 = schema.stepSchema.value.step1.createComponent(
  function Step1({ ctx, MyCoolCustomForm, Field: FieldComponent }, props) {
    const { title } = ctx.step1;

    return (
      <MyCoolCustomForm title={title}>
        <FieldSet>
          <FieldComponent name='firstName'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='John'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='lastName'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='Smith'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='email'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='johnsmith@gmail.com'
                  type='email'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
        </FieldSet>
      </MyCoolCustomForm>
    );
  }
);

export const Step2 = schema.stepSchema.value.step2.createComponent(
  function Step2({ Field: FieldComponent, MyCoolCustomForm, ctx }) {
    return (
      <MyCoolCustomForm title={ctx.step2.title}>
        <FieldSet>
          <FieldComponent name='username'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='Create a username'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='password'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='Enter strong password'
                  type='password'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='language'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Select name={label} value={defaultValue} onValueChange={onInputChange}>
                  <SelectTrigger id={label}>
                    <SelectValue placeholder='Select your preferred language'/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='en'>English</SelectItem>
                    <SelectItem value='sp'>Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldComponent>
        </FieldSet>
      </MyCoolCustomForm>
    );
  }
);
