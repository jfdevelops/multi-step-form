---
'@jfdevelops/multi-step-form-core': major
'@jfdevelops/react-multi-step-form': major
---

Replace the curried `withForm.render` API with `render(context, customProps)`, keep the strongly typed render context subscribed to current step data, and add reactive `getCurrentStepData`, `getProgress`, and `isStepComplete` callbacks so render implementations do not need to call the equivalent hooks. Preserve each step's exact `isComplete` function, remove widened `step${number}` indexes from render context and context-hook targets, preserve contextual typing and custom prop inference through override chains and injected form call sites, and resolve omitted casing to the exact default casing and label types.

Normalize resolved core step keys before generating step helpers so `update`, `reset`, completion, and helper functions carry only concrete schema steps and are not intersected with duplicate copies during React form enrichment.

Remove the legacy `createMultiStepFormSchema` factory in favor of the single `defineMultiStepForm(...).configure(...)` flow. Preserve exact field metadata and strongly typed `isComplete` inputs through definition factories, normalize array transformation types to honest arrays of schema step values, and migrate package tests, examples, and documentation to the definition API.

Strip internal update/reset/component helpers from the runtime `withForm.render` step projection, validate dynamic `isStepComplete` targets with `InvalidStepError`, and make step-specific `enabledForSteps` validation use the same concrete string keys exposed by the public API.

Remove function-valued properties entirely from resolved updater payloads instead of exposing them as required `never` properties, and make partial path updates recursively accept partial array items.

Preserve unrelated step state during resets, persist synchronous override failures, recover from malformed stored JSON using form defaults, consistently validate dynamic render-context step targets, and retain exact custom field metadata and resolved step keys through public definition chains.
