"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

export type RequiredPlan = "plus" | "pro" | "premium";

interface PlanGateState {
  isOpen: boolean;
  type: "feature_lock" | "limit_reached";
  featureName: string;
  requiredPlan: RequiredPlan;
  currentPlan?: string;
  limit?: number;
  description?: string;
}

interface PlanGateContextType {
  gate: PlanGateState;
  showPlanGate: (featureName: string, requiredPlan: RequiredPlan, description?: string) => void;
  showLimitGate: (featureName: string, currentPlan: string, limit: number) => void;
  closePlanGate: () => void;
}

const defaultState: PlanGateState = {
  isOpen: false,
  type: "feature_lock",
  featureName: "",
  requiredPlan: "plus",
};

const PlanGateContext = createContext<PlanGateContextType>({
  gate: defaultState,
  showPlanGate: () => {},
  showLimitGate: () => {},
  closePlanGate: () => {},
});

export function PlanGateProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<PlanGateState>(defaultState);

  const showPlanGate = useCallback((featureName: string, requiredPlan: RequiredPlan, description?: string) => {
    setGate({ isOpen: true, type: "feature_lock", featureName, requiredPlan, description });
  }, []);

  const showLimitGate = useCallback((featureName: string, currentPlan: string, limit: number) => {
    setGate({ isOpen: true, type: "limit_reached", featureName, currentPlan, limit, requiredPlan: "plus" });
  }, []);

  const closePlanGate = useCallback(() => {
    setGate(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleLimitReached = (e: any) => {
      if (e.detail) {
        showLimitGate(e.detail.featureName, e.detail.plan, e.detail.limit);
      }
    };
    window.addEventListener("LIMIT_REACHED", handleLimitReached as EventListener);
    return () => window.removeEventListener("LIMIT_REACHED", handleLimitReached as EventListener);
  }, [showLimitGate]);

  return (
    <PlanGateContext.Provider value={{ gate, showPlanGate, showLimitGate, closePlanGate }}>
      {children}
    </PlanGateContext.Provider>
  );
}

export function usePlanGate() {
  return useContext(PlanGateContext);
}
