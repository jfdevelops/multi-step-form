import { FormBuilder, useFormBuilder } from '@jfdevelops/react-multi-step-form-builder';
import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BuildWorkspace } from './build-workspace';
import { CodeWorkspace } from './code-workspace';
import { PreviewWorkspace } from './preview-workspace';
import { registry, sampleDefinition } from './registry';
import { Toolbar, type BuilderMode } from './toolbar';

export function App() {
  const builder = useFormBuilder({ registry, initial: sampleDefinition });
  const [mode, setMode] = useState<BuilderMode>('build');

  return (
    <FormBuilder builder={builder}>
      <TooltipProvider>
        <Tabs
          value={mode}
          onValueChange={(value) => {
            if (value === 'build' || value === 'preview' || value === 'code') {
              setMode(value);
            }
          }}
          className="gap-0"
        >
          <Toolbar />
          <main className="workspace">
            <TabsContent
              value="build"
              forceMount
              hidden={mode !== 'build'}
              data-mode="build"
              className="mt-0"
            >
              <BuildWorkspace />
            </TabsContent>
            <TabsContent
              value="preview"
              forceMount
              hidden={mode !== 'preview'}
              data-mode="preview"
              className="mt-0"
            >
              <PreviewWorkspace />
            </TabsContent>
            <TabsContent value="code" hidden={mode !== 'code'} data-mode="code" className="mt-0">
              {mode === 'code' && <CodeWorkspace />}
            </TabsContent>
          </main>
        </Tabs>
      </TooltipProvider>
    </FormBuilder>
  );
}
