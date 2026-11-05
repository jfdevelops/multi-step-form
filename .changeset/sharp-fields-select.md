---
'@jfdevelops/react-multi-step-form': major
---

Require reusable field components created from configured factories to receive the form instance they render against, preventing shared components from reading whichever instance was most recently active.

Allow `createComponent.forField` to omit its configured field and return a reusable component with a required, strongly typed `field` prop for selecting any field in the target step.

Restore React render utilities for components selecting multiple steps or all steps, including configured form aliases and reactive selectors. These components now expose documented `defaultValues.grouped` and `defaultValues.flat` views.

Preserve duplicate field names in `defaultValues.flat` by grouping their values under the selected step keys instead of overwriting an earlier step.

Expose `Field` to components selecting multiple steps or all steps, using qualified names such as `step1.firstName` to route field subscriptions, suspense, updates, and resets without ambiguity.
