import React, { createContext, useContext, useMemo } from "react";
import { FEATURE_MATRIX, AppMode, FeatureKey } from "@/config/features";
import { useAppMode } from "@/state/AppModeProvider";

type FeatureFlagContextType = {
  hasFeature: (key: FeatureKey) => boolean;
  mode: AppMode;
};

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export const FeatureFlagProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { mode } = useAppMode();
  
  const value = useMemo<FeatureFlagContextType>(
    () => ({
      mode,
      hasFeature: (key) => FEATURE_MATRIX[mode][key],
    }),
    [mode]
  );
  
  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatures = () => {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureFlagProvider");
  return ctx;
};
