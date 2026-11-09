import { isCasingValid } from '@jfdevelops/multi-step-form-core';
import { useFormSettings } from '@jfdevelops/react-multi-step-form-builder';
import { Settings2 } from 'lucide-react';
import { useId } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstanceSettings } from './instance-settings';

export function FormSettingsSheet() {
  const { settings, casings, libraries, issues, update } = useFormSettings();
  const id = useId();
  const hasStorage = settings.storageKey !== undefined;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label="Form settings">
          <Settings2 />
          <span className="sr-only sm:not-sr-only">Form settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="gap-3 border-b p-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
            <Settings2 className="size-5" />
          </div>
          <SheetTitle>Form settings</SheetTitle>
          <SheetDescription>
            Set the defaults shared by every step. Changes apply immediately.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="general" className="min-h-0 flex-1 gap-0">
          <TabsList className="mx-6 my-5 grid w-auto grid-cols-3" aria-label="Form settings sections">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="instances">
              Instances{' '}
              <Badge variant="secondary" className="ml-1 px-1.5">
                {settings.instances?.length ?? 0}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="min-h-0 flex-1">
            <div className="settings px-6 pb-6">
              <TabsContent value="general" className="mt-0 space-y-6">
                <div>
                  <h3 className="mt-0 text-sm normal-case tracking-normal text-foreground">Validation</h3>
                  <p className="hint mb-4">
                    Choose the library used to validate fields. A step can override this default.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor={id + '-validator'}>Validator library</Label>
                    <NativeSelect
                      id={id + '-validator'}
                      value={settings.validator ?? ''}
                      onChange={(event) => update({ validator: event.target.value || undefined })}
                    >
                      <NativeSelectOption value="">None</NativeSelectOption>
                      {libraries.map((entry) => (
                        <NativeSelectOption key={entry.library} value={entry.library}>
                          {entry.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="mt-0 text-sm normal-case tracking-normal text-foreground">Labels</h3>
                  <p className="hint mb-4">
                    Control how field keys become readable labels when a custom label is not set.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor={id + '-casing'}>Default label casing</Label>
                    <NativeSelect
                      id={id + '-casing'}
                      value={settings.nameTransformCasing ?? 'title'}
                      onChange={(event) => {
                        const casing = event.target.value;
                        if (isCasingValid(casing)) {
                          update({ nameTransformCasing: casing === 'title' ? undefined : casing });
                        }
                      }}
                    >
                      {casings.map((casing) => (
                        <NativeSelectOption key={casing.value} value={casing.value}>
                          {casing.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="storage" className="mt-0 space-y-6">
                <div>
                  <h3 className="mt-0 text-sm normal-case tracking-normal text-foreground">
                    Save form progress
                  </h3>
                  <p className="hint">Choose whether generated forms retain entered values between visits.</p>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor={id + '-persist'}>Persist progress</Label>
                    <p className="hint m-0">Store values in the visitor's browser.</p>
                  </div>
                  <Switch
                    id={id + '-persist'}
                    checked={hasStorage}
                    onCheckedChange={(checked) =>
                      update({ storageKey: checked ? 'form-progress' : undefined })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={id + '-storage'}>Storage key</Label>
                  <Input
                    id={id + '-storage'}
                    disabled={!hasStorage}
                    value={settings.storageKey ?? ''}
                    placeholder="form-progress"
                    onChange={(event) => update({ storageKey: event.target.value })}
                  />
                  <p className="hint">Use a unique key for each form to keep saved progress separate.</p>
                </div>
                <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  The editor preview always stays in memory. This setting applies to the generated form.
                </p>
              </TabsContent>
              <TabsContent value="instances" className="mt-0 space-y-4">
                <div>
                  <h3 className="mt-0 text-sm normal-case tracking-normal text-foreground">
                    Named instances
                  </h3>
                  <p className="hint">
                    Reuse the same form definition with separate values and progress for each instance.
                  </p>
                </div>
                <InstanceSettings />
              </TabsContent>
              {issues.map((issue) => (
                <p key={issue.code} className="error mt-4" role="alert">
                  {issue.message}
                </p>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
        <SheetFooter className="border-t p-4">
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
