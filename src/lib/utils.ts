import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export safe cleanup utilities for easier access
export {
  safeRemove,
  safeRemoveListener,
  createSafeListenerCleanup,
  safeDisconnectObserver,
  safeRemovePortalContainer,
} from "./dom/safeCleanup";
