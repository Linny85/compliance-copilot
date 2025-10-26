export type AppMode = "prod" | "trial" | "demo";

export type FeatureKey =
  | "trainingCertificates"
  | "vendorRisk"
  | "evidence"
  | "checks"
  | "reports"
  | "integrations";

type FeatureMatrix = Record<AppMode, Record<FeatureKey, boolean>>;

// Trial mode = 100% active
export const FEATURE_MATRIX: FeatureMatrix = {
  prod: {
    trainingCertificates: true,
    vendorRisk: true,
    evidence: true,
    checks: true,
    reports: true,
    integrations: true,
  },
  trial: {
    trainingCertificates: true,
    vendorRisk: true,
    evidence: true,
    checks: true,
    reports: true,
    integrations: true,
  },
  demo: {
    trainingCertificates: true,
    vendorRisk: true,
    evidence: true,
    checks: true,
    reports: true,
    integrations: true,
  },
};
