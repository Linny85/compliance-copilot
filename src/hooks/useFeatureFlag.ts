/**
 * Frontend Feature Flags Configuration
 * 
 * Usage:
 *   const enabled = useFeatureFlag('documents_generation');
 *   if (enabled) { ... }
 * 
 * To enable DB-backed flags, create feature_flags table and uncomment DB logic.
 */

const FEATURE_FLAGS: Record<string, boolean> = {
  documents_generation: true, // Enable document generation UI flow
  advanced_analytics: false,
  ai_recommendations: true,
};

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
  return FEATURE_FLAGS[flagName] ?? false;
}
