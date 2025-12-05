import React from "react";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecentAuditReports from "@/components/dashboard/RecentAuditReports";
import { setQueryResult, setStorageDownload } from "../../mocks/supabaseClient.mock";

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock("@/integrations/supabase/client", () => import("../../mocks/supabaseClient.mock"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const translationMap: Record<string, string> = {
  "dashboard:recentAuditReports": "Recent Audit Reports",
  "dashboard:recentAuditReportsDesc": "Latest generated compliance reports",
  "dashboard:viewAll": "View All",
  "dashboard:noReportsYet": "No reports generated yet",
  "dashboard:createAuditTask": "Create Audit Task",
  "common:loading": "Loading",
};

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => translationMap[key] ?? key,
      ready: true,
      i18n: { language: "en", changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

// Mock useNavigate to assert navigations
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock URL.createObjectURL to avoid jsdom errors
const createUrlMock = vi.fn(() => "blob://fake");
const revokeUrlMock = vi.fn();
beforeAll(() => {
  // @ts-ignore
  global.URL.createObjectURL = createUrlMock;
  // @ts-ignore
  global.URL.revokeObjectURL = revokeUrlMock;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <RecentAuditReports />
    </MemoryRouter>
  );
}

describe("RecentAuditReports", () => {
  test("shows loading then renders recent reports list", async () => {
    setQueryResult([
      {
        id: "a1",
        title: "ISO 27001 Follow-up",
        status: "completed",
        report_generated_at: new Date().toISOString(),
        last_report_path: "tenant-1/audit_a1_1700000000000.pdf",
      },
    ]);

    renderWidget();

    // Loading state
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // List with one report
    expect(await screen.findByText("ISO 27001 Follow-up")).toBeInTheDocument();
    expect(screen.getByTitle("Download PDF")).toBeEnabled();
  });

  test("empty state when no reports are present", async () => {
    setQueryResult([]); // no reports

    renderWidget();

    expect(await screen.findByText(/No reports generated yet/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /Create Audit Task/i });
    fireEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith("/audit/new");
  });

  test("download click triggers storage download and file save", async () => {
    setQueryResult([
      {
        id: "a2",
        title: "NIS2 Post-Implementation",
        status: "completed",
        report_generated_at: new Date().toISOString(),
        last_report_path: "tenant-1/audit_a2_1700000000001.pdf",
      },
    ]);
    setStorageDownload(new Blob(["%PDF-1.4..."] , { type: "application/pdf" }));

    renderWidget();

    const downloadBtn = await screen.findByTitle("Download PDF");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(createUrlMock).toHaveBeenCalled();
    });
  });

  test("View All navigates to /audit", async () => {
    setQueryResult([]);

    renderWidget();

    await screen.findByText(/No reports generated yet/i);
    const viewAll = screen.getByRole("button", { name: /View All/i });
    fireEvent.click(viewAll);
    expect(navigateMock).toHaveBeenCalledWith("/audit");
  });
});
