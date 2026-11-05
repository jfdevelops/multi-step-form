---
'@jfdevelops/react-multi-step-form': patch
---

fix: keep `forField` components working after an instance's first field update, and add `bindToInstance`/`bindToField` to bind instance and field separately

A `forField`/`stepCreateComponentFn` component built from a definition's factory would throw resolving `.forField` on `undefined` the next time a new field type rendered, once the bound instance had persisted at least one field update through storage — `value[step].createComponent` was only ever attached once, in the constructor, and every update replaced `value` without it.

Selectable and single-field components built this way can now also bind their `instance` and their `field` independently and in either order via `bindToInstance`/`bindToField` (renamed from `asReusable`), instead of requiring an `instance` prop on every render:

```tsx
const TextField = createForm.stepSchema.value.step1.createComponent.forField({
  fields: ['firstName', 'lastName'],
  render: (field) => <p>{field.defaultValue}</p>,
});

const SchemaTextField = TextField.bindToInstance(schema);
const FirstName = SchemaTextField.bindToField('firstName');
<FirstName />
```

`instance` is also generic per call/per `bindToInstance` binding now, rather than fixed to one type for every component built from a definition — narrow it further via `configure<TCasing, TInstanceSchema>()`.
