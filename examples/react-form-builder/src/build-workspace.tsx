import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { GripVertical, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toTypeScript } from '@jfdevelops/multi-step-form-builder-core';
import {
  AddStepButton,
  Canvas,
  CanvasField,
  DragHandle,
  Palette,
  PaletteItem,
  PaletteSearch,
  StepList,
  StepTab,
  useBuilderSelector,
} from '@jfdevelops/react-multi-step-form-builder';
import { CanvasControl } from './canvas-control';
import { InspectorPanel } from './inspector';

export function BuildWorkspace() {
  const activeStepId = useBuilderSelector((snapshot) => snapshot.activeStepId);

  return (
    <SidebarProvider className="layout grid min-h-0 items-start">
      <Sidebar
        side="left"
        collapsible="none"
        data-side="left"
        role="complementary"
        aria-label="Insert fields"
        className="palette-panel w-full rounded-xl border bg-background lg:max-h-[calc(100svh-104px)]"
      >
        <Palette>
          {({ categories }) => (
            <>
              <SidebarHeader className="p-5 pb-2">
                <p className="panel-kicker">Insert</p>
                <h2>Add a field</h2>
                <p className="hint">Click to add, or drag into your form.</p>
                <PaletteSearch
                  className="search"
                  placeholder="Search fields"
                  render={(props) => <Input {...props} />}
                />
              </SidebarHeader>
              <SidebarContent className="pb-4">
                {categories.map((category) => (
                  <SidebarGroup key={category.name} className="px-4">
                    <SidebarGroupLabel>{category.name}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {category.items.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <PaletteItem
                              item={item}
                              className="palette-item"
                              render={(props) => <SidebarMenuButton {...props} />}
                            >
                              <span>{item.label}</span>
                              <Plus className="ml-auto size-3.5 text-muted-foreground" />
                            </PaletteItem>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </SidebarContent>
            </>
          )}
        </Palette>
      </Sidebar>
      <section className="design-area" aria-label="Form canvas">
        <Tabs value={activeStepId ?? ''}>
          <div className="steps">
            <StepList
              className="step-list"
              render={(props) => (
                <TabsList {...props} className="step-list h-auto flex-wrap bg-transparent p-0" />
              )}
            >
              {({ steps }) =>
                steps.map((step) => (
                  <StepTab
                    key={step.id}
                    step={step}
                    className="step-tab"
                    render={(props) => <TabsTrigger {...props} value={step.id} />}
                  >
                    {step.title || step.key}
                    <Badge variant="secondary" className="px-1.5 text-[10px]">
                      {step.fieldCount}
                    </Badge>
                  </StepTab>
                ))
              }
            </StepList>
            <AddStepButton render={(props) => <Button {...props} variant="outline" size="sm" />}>
              <Plus />
              Add step
            </AddStepButton>
          </div>
        </Tabs>
        <p className="canvas-guide">Click a field to configure it. Switch to Preview to try the form.</p>
        <Canvas className="canvas" render={(props) => <Card {...props} className="canvas gap-0" />}>
          {({ fields, activeStep }) => (
            <>
              <div className="form-heading">
                <p className="panel-kicker">Form step</p>
                <h2>{activeStep?.title || 'Untitled step'}</h2>
                {activeStep?.description && <p className="hint">{activeStep.description}</p>}
              </div>
              {fields.length === 0 ? (
                <Empty className="empty-canvas">
                  <EmptyHeader>
                    <EmptyTitle>Your step starts here</EmptyTitle>
                    <EmptyDescription>Choose a field from Insert to start building.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                fields.map((field) => (
                  <CanvasField key={field.id} field={field} className="canvas-field">
                    {({ remove }) => (
                      <>
                        <div className="field-tools">
                          <DragHandle
                            className="handle"
                            aria-label={'Reorder ' + field.key}
                            render={(props) => <Button {...props} variant="ghost" size="icon-xs" />}
                          >
                            <GripVertical />
                          </DragHandle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label={'Actions for ' + field.key}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={remove}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Trash2 />
                                Remove field
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="canvas-field-body">
                          <span className="canvas-field-label">{field.label ?? <em>No label</em>}</span>
                          <CanvasControl field={field.field} />
                          {field.field.description && (
                            <small className="hint">{field.field.description}</small>
                          )}
                          <small className="field-metadata">
                            <code>{field.key}</code> &middot; {field.inputType?.label ?? field.field.type}{' '}
                            &middot; {shortType(toTypeScript(field.field.schema))}
                          </small>
                          {field.issues.map((issue) => (
                            <small
                              key={issue.code + issue.message}
                              className={cn({
                                error: issue.severity === 'error',
                                warning: issue.severity !== 'error',
                              })}
                            >
                              {issue.message}
                            </small>
                          ))}
                        </div>
                      </>
                    )}
                  </CanvasField>
                ))
              )}
              <p className="canvas-footer">Add more fields from Insert, or drag to change their order.</p>
            </>
          )}
        </Canvas>
      </section>
      <InspectorPanel />
    </SidebarProvider>
  );
}

function shortType(type: string) {
  const flat = type.replace(/\s+/g, ' ');

  return flat.length > 48 ? flat.slice(0, 45) + '\u2026' : flat;
}
