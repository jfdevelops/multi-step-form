import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';
import { tanstackForm } from '@jfdevelops/react-multi-step-form-tanstack';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: {
        firstName: { defaultValue: '' as string },
      },
    },
  },
}).configure({
  formLibrary: tanstackForm(),
});

const formSchema = createForm();

const Contact = formSchema.stepSchema.value.step1.createComponent({
  render: ({ form, Selector }) => (
    <main>
      <h1>Contact</h1>
      <form.Field name="firstName">
        {(field) => (
          <label>
            First name
            <input
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.firstName}>
        {(firstName) => <p>TanStack Form: {firstName || 'empty'}</p>}
      </form.Subscribe>

      <Selector
        selector={(context) => context.step1.fields.firstName.defaultValue}
      >
        {(firstName) => <p>Multi-step form: {firstName || 'empty'}</p>}
      </Selector>
    </main>
  ),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Contact />
  </StrictMode>,
);
