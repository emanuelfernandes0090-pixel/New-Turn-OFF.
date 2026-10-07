import { downloadPdfReport, ReportPayload } from "./pdfReportCompiler";

export const generatePDFReport = async (
  elementIdOrPayload: string | ReportPayload,
  _filename?: string
) => {
  if (typeof elementIdOrPayload === "object" && elementIdOrPayload !== null) {
    return downloadPdfReport(elementIdOrPayload);
  }

  // Delega com segurança para o compilador oficial de relatórios Turn OFF (não trava a DOM)
  return downloadPdfReport({ type: "app" });
};
