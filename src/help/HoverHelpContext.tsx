import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

const HoverHelpContext = createContext(true);

export function HoverHelpProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <HoverHelpContext.Provider value={enabled}>
      {children}
    </HoverHelpContext.Provider>
  );
}

export function useHoverHelpEnabled(): boolean {
  return useContext(HoverHelpContext);
}
