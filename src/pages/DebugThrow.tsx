import React, { useEffect } from "react";

export default function DebugThrow() {
  useEffect(() => {
    // gezielt Fehler auslösen, um ErrorBoundary zu testen
    throw new Error("DebugThrow: forced error for E2E");
  }, []);
  return null;
}
