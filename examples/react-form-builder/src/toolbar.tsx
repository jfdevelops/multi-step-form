import { createEmptyDefinition } from '@jfdevelops/multi-step-form-builder-core';
import { ActionButton, useBuilder } from '@jfdevelops/react-multi-step-form-builder';
import { FilePlus2, MoreHorizontal, Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FormSettingsSheet } from './settings';
import { sampleDefinition } from './registry';

export type BuilderMode = 'build' | 'preview' | 'code';

export function Toolbar() {
  const builder = useBuilder();

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">
          <FilePlus2 className="size-4" />
        </span>
        <h1>Form builder</h1>
      </div>
      <TabsList className="mode-tabs" aria-label="Editor mode">
        <TabsTrigger value="build">Build</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
      <div className="toolbar-actions">
        <Tooltip>
          <TooltipTrigger asChild>
            <ActionButton
              action="undo"
              aria-label="Undo"
              render={(props) => <Button {...props} variant="ghost" size="icon" />}
            >
              <Undo2 />
            </ActionButton>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ActionButton
              action="redo"
              aria-label="Redo"
              render={(props) => <Button {...props} variant="ghost" size="icon" />}
            >
              <Redo2 />
            </ActionButton>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
        <FormSettingsSheet />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => builder.load(sampleDefinition)}>Load sample</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => builder.load(createEmptyDefinition())}>
              Clear form
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
