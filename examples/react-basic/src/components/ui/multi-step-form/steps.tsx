import { schema } from '.';
import { Field, FieldLabel, FieldSet } from '../field';
import { Input } from '../input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';

export const Step1 = schema.stepSchema.value.step1.createComponent(
  function Step1({ ctx, Form, Field: FieldComponent }) {
    const { title } = ctx.step1;

    return (
      <Form targetStep='step1' title={title}>
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
      </Form>
    );
  }
);

export const Step2 = schema.stepSchema.value.step2.createComponent(
  function Step2({ Field: FieldComponent, Form, ctx }) {
    return (
      <Form targetStep='step2' title={ctx.step2.title}>
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
                <Select
                  name={label}
                  value={defaultValue}
                  onValueChange={onInputChange}
                >
                  <SelectTrigger id={label}>
                    <SelectValue placeholder='Select your preferred language' />
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
      </Form>
    );
  }
);

export const Step3 = schema.stepSchema.value.step3.createComponent(
  function Step3({ Field: FieldComponent, Form, ctx, Selector }) {
    return (
      <Form targetStep='step3' title={ctx.step3.title}>
        <FieldSet>
          <FieldComponent name='theme'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Select
                  name={label}
                  value={defaultValue}
                  onValueChange={onInputChange}
                >
                  <SelectTrigger id={label}>
                    <SelectValue placeholder='Select theme' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='light'>Light</SelectItem>
                    <SelectItem value='dark'>Dark</SelectItem>
                    <SelectItem value='auto'>Auto</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldComponent>

          {/* This Selector demonstrates the reactivity fix - it should update when theme changes */}
          <Field>
            <FieldLabel>Theme Preview</FieldLabel>
            <Selector
              selector={({ step3 }) => {
                const theme = step3.fields.theme.defaultValue;

                return theme;
              }}
            >
              {(theme) => {
                const themeInfo = {
                  light: {
                    name: 'Light Theme',
                    description: 'Bright and clean interface',
                    emoji: '☀️',
                  },
                  dark: {
                    name: 'Dark Theme',
                    description: 'Easy on the eyes',
                    emoji: '🌙',
                  },
                  auto: {
                    name: 'Auto Theme',
                    description: 'Follows system preference',
                    emoji: '🔄',
                  },
                };

                const info =
                  themeInfo[theme as keyof typeof themeInfo] || themeInfo.light;

                return (
                  <div className='p-4 border rounded-md bg-muted/50'>
                    <div className='flex items-center gap-2'>
                      <span className='text-2xl'>{info.emoji}</span>
                      <div>
                        <p className='font-semibold'>{info.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {info.description}
                        </p>
                      </div>
                    </div>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      Current theme: <strong>{theme}</strong> - This preview
                      updates reactively when you change the theme above,
                      without the parent component re-rendering!
                    </p>
                  </div>
                );
              }}
            </Selector>
          </Field>

          {/* This Selector demonstrates watching a non-primitive (object) value */}
          <Field>
            <FieldLabel>Preferences Object Preview</FieldLabel>
            <Selector
              selector={({ step3 }) => {
                return step3.fields.preferences.defaultValue;
              }}
            >
              {(preferences) => {
                return (
                  <div className='p-4 border rounded-md bg-muted/50'>
                    <p className='font-semibold mb-2'>Current Preferences:</p>
                    <div className='space-y-1 text-sm'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Notifications:</span>
                        <span
                          className={
                            preferences.notifications
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }
                        >
                          {preferences.notifications
                            ? '✅ Enabled'
                            : '❌ Disabled'}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Font Size:</span>
                        <span className='capitalize'>
                          {preferences.fontSize}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>Color Scheme:</span>
                        <span className='capitalize'>
                          {preferences.colorScheme}
                        </span>
                      </div>
                    </div>
                    <p className='mt-3 text-xs text-muted-foreground'>
                      This preview watches an <strong>object</strong> value and
                      updates reactively when the preferences change, without
                      the parent component re-rendering!
                    </p>
                  </div>
                );
              }}
            </Selector>
          </Field>

          <FieldComponent name='newsLetterOptIn'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <div className='flex items-center gap-2'>
                  <input
                    id={label}
                    type='checkbox'
                    checked={defaultValue}
                    onChange={(e) => onInputChange(e.target.checked)}
                    className='h-4 w-4'
                  />
                  <label htmlFor={label} className='text-sm'>
                    Subscribe to our newsletter
                  </label>
                </div>
              </Field>
            )}
          </FieldComponent>
        </FieldSet>
      </Form>
    );
  }
);
