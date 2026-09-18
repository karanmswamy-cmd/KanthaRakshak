import React, { createContext, useContext, useState } from 'react';

export type DemoCaseId = 'normal' | 'poor_signal' | 'abnormal';

interface DemoContextType {
  isDemoMode: boolean;
  selectedDemoCase: DemoCaseId;
  setIsDemoMode: (enabled: boolean) => void;
  setSelectedDemoCase: (caseId: DemoCaseId) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const envVal = import.meta.env.VITE_DEMO_MODE;
    if (envVal !== undefined) return envVal !== 'false';
    return true; // default to true for hackathon evaluation
  });

  const [selectedDemoCase, setSelectedDemoCase] = useState<DemoCaseId>('normal');

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        selectedDemoCase,
        setIsDemoMode,
        setSelectedDemoCase,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within a DemoProvider');
  return context;
};
