import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { lazy, Suspense, useState } from 'react';

const CodePanel = lazy(() => import('./code-panel'));
const TABS = [
  { id: 'module', label: 'Generated code' },
  { id: 'validators', label: 'Standard Schema' },
  { id: 'definition', label: 'Definition (JSON)' },
] as const;

export function CodeWorkspace() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('module');

  return (
    <Card className="code-workspace panel">
      <div className="workspace-heading">
        <div>
          <p className="panel-kicker">Take it with you</p>
          <h2>Code</h2>
          <p className="hint">The definition, generated modules, and validators for your form.</p>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = TABS.find((entry) => entry.id === value);
          if (next) {
            setTab(next.id);
          }
        }}
      >
        <TabsList className="mb-3" aria-label="Code views">
          {TABS.map((entry) => (
            <TabsTrigger key={entry.id} value={entry.id}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Suspense fallback={<p className="hint">Loading the editor...</p>}>
            <CodePanel view={tab} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
