import { type } from 'arktype';

export type ImportBindingKind = typeof importBindingSchema.infer;

export const IMPORT_BINDING_KINDS = ['named', 'namespace', 'default'] as const;
export const importBindingSchema = type(['===', ...IMPORT_BINDING_KINDS]);
export const importBindingScope = type.scope({
  kind: importBindingSchema,
});
