import { createContext, useContext } from 'react';

export interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be nested inside TabsRoot');
  return context;
}
