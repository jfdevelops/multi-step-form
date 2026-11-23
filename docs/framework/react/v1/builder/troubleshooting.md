---
title: Builder troubleshooting
description: Diagnose definition issues, registry mismatches, missing provider state, and failed persistence or exports.
order: 150
---

Inspect definition issues before diagnosing rendering or export. A definition
can be an unfinished editing draft without yet being ready to run.

## Read actionable issues

```tsx
import { useBuilderSelector } from '@jfdevelops/react-multi-step-form-builder';

export function DefinitionIssues() {
  const issues = useBuilderSelector((snapshot) => snapshot.issues);

  return (
    <ul aria-label='Definition issues'>
      {issues.map((issue, index) => (
        <li key={index}>{issue.severity}: {issue.message}</li>
      ))}
    </ul>
  );
}
```

Render inside `FormBuilder`. Issues include a `nodeId` and optional property or
schema path. Use that information to select the affected node and direct the
author toward the relevant inspector control.

## Diagnose common issues

| Symptom or issue | Check |
| --- | --- |
| Hook must be used inside `FormBuilder` | Put editor descendants under the provider with the intended builder |
| Preview fails on an empty form | Give every step at least one field |
| `unknown-field-type` | Recreate the registry containing the saved custom type |
| `unknown-validator` | Register the selected adapter for preview and generation too |
| `duplicate-field-key` | Use unique answer keys within each step |
| `default-value-mismatch` | Fit the default to the field schema |
| `dangling-field-reference` | Repair a check referring to a renamed or removed field |
| Inspector shows multiple values | Handle `mixed` state instead of treating it as an empty value |
| Edits disappear on render | Create the builder once and use commands to change it |
| New hook options do nothing | `useFormBuilder` reads options on its first render |
| Code-owned rules disappear after import | Supply `resolveCode` during compilation |

Do not discard the whole draft because it has an incomplete step. Let authors
fix structural issues, then retry preview or export. Show generation errors
instead of presenting a stale successful output as the current design.

## Diagnose save failures

Check snapshot `status.error` and handle rejected `save()` promises. Verify that
autosave has a storage adapter and that you retained the definition's form ID
for a later `loadFromStorage` call.

A browser storage prefix and runtime answer `storageKey` are different settings.
Changing one does not migrate the other. For server saves, use `baseRevision` to
detect stale edits and let the author reload or reconcile a conflict deliberately.

## Diagnose unexpected history

Commands preserve history; `load` replaces a document and clears history.
Repeated changes to the same property can merge inside the history window. Use
a transaction for one logical multi-command edit and configure the merge window
when property typing should produce different undo behavior.

## Next steps

- [Definition structure](definitions.md)
- [Registry configuration](custom-fields.md)
- [Preview behavior](preview.md)
- [Persistence and revisions](persistence.md)
