"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type RequiredPlan = "plus" | "pro" | "premium";

interface PlanGateState {
  isOpen: boolean;
  featureName: string;
  requiredPlan: RequiredPlan;
  description?: string;
}

interface PlanGateContextType {
  gate: PlanGateState;
  showPlanGate: (featureName: string, requiredPlan: RequiredPlan, description?: string) => void;
  closePlanGate: () => void;
}

const defaultState: PlanGateState = {
  isOpen: false,
  featureName: "",
  requiredPlan: "plus",
};

const PlanGateContext = createContext<PlanGateContextType>({
  gate: defaultState,
  showPlanGate: () => {},
  closePlanGate: () => {},
});

export function PlanGateProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<PlanGateState>(defaultState);

  const showPlanGate = useCallback((featureName: string, requiredPlan: RequiredPlan, description?: string) => {
    setGate({ isOpen: true, featureName, requiredPlan, description });
  }, []);

  const closePlanGate = useCallback(() => {
    setGate(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <PlanGateContext.Provider value={{ gate, showPlanGate, closePlanGate }}>
      {children}
    </PlanGateContext.Provider>
  );
}

export function usePlanGate() {
  return useContext(PlanGateContext);
}
