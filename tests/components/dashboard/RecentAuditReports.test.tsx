import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecentAuditReports from "@/components/dashboard/RecentAuditReports";

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock("@/integrations/supabase/client", () => require("../../mocks/supabaseClient.mock"));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Mock useNavigate to assert navigations
const navigateMock = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock URL.createObjectURL to avoid jsdom errors
const createUrlMock = jest.fn(() => "blob://fake");
const revokeUrlMock = jest.fn();
beforeAll(() => {
  // @ts-ignore
  global.URL.createObjectURL = createUrlMock;
  // @ts-ignore
  global.URL.revokeObjectURL = revokeUrlMock;
});

beforeEach(() => {
  jest.clearAllMocks();
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
    const { setQueryResult } = require("../../mocks/supabaseClient.mock");
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
    const { setQueryResult } = require("../../mocks/supabaseClient.mock");
    setQueryResult([]); // no reports

    renderWidget();

    await waitFor(() => {
      expect(screen.getByText(/No reports generated yet/i)).toBeInTheDocument();
    });

    const btn = screen.getByRole("button", { name: /Create Audit Task/i });
    fireEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith("/audit/new");
  });

  test("download click triggers storage download and file save", async () => {
    const { setQueryResult, setStorageDownload } = require("../../mocks/supabaseClient.mock");
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
    const { setQueryResult } = require("../../mocks/supabaseClient.mock");
    setQueryResult([]);

    renderWidget();

    const viewAll = screen.getByRole("button", { name: /View All/i });
    fireEvent.click(viewAll);
    expect(navigateMock).toHaveBeenCalledWith("/audit");
  });
});
