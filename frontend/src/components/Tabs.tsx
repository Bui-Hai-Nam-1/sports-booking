import { useState, type ReactNode } from 'react';
import { TabsContext, useTabs } from './tabs-context';

export function TabsRoot({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="tabs-list" role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const tabs = useTabs();
  return (
    <button
      className="tab-trigger"
      type="button"
      role="tab"
      aria-selected={tabs.value === value}
      onClick={() => tabs.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const tabs = useTabs();
  return tabs.value === value
    ? <section role="tabpanel">{children}</section>
    : null;
}
