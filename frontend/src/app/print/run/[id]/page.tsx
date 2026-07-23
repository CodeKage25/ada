"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { api } from "@/lib/api";

/** Print view of the rewritten CV: a clean A4 sheet with conservative,
 *  ATS-friendly typography and no app chrome or branding — it's the user's
 *  document. Opens the print dialog automatically; "Save as PDF" is the
 *  browser's built-in destination. Colors are hardcoded so the sheet is
 *  paper-white regardless of the app theme. */
export default function PrintRunPage() {
  const { id } = useParams<{ id: string }>();
  const [cv, setCv] = useState<string | null | undefined>(undefined);
  const [role, setRole] = useState("");

  useEffect(() => {
    api
      .getRun(id)
      .then((run) => {
        setCv(run.rewritten_cv ?? null);
        setRole(run.target_role);
      })
      .catch(() => setCv(null));
  }, [id]);

  // Fire the print dialog once the document has painted.
  useEffect(() => {
    if (!cv) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [cv]);

  return (
    <div className="min-h-dvh bg-[#e9e6df] print:bg-white">
      <style>{`
        @page { size: A4; margin: 16mm 18mm; }
        .cv-doc { font-family: var(--font-inter), system-ui, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #1c1a15; }
        .cv-doc h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 22pt; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 2pt; }
        .cv-doc h1 + p { margin-top: 0; }
        .cv-doc h2 { font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; margin: 14pt 0 5pt; padding-bottom: 3pt; border-bottom: 1px solid #d8d4ca; }
        .cv-doc h3 { font-size: 10.5pt; font-weight: 600; margin: 9pt 0 2pt; }
        .cv-doc p { margin: 3pt 0; }
        .cv-doc ul, .cv-doc ol { margin: 3pt 0 6pt; padding-left: 14pt; }
        .cv-doc ul { list-style: disc; }
        .cv-doc ol { list-style: decimal; }
        .cv-doc li { margin: 2pt 0; }
        .cv-doc strong { font-weight: 600; }
        .cv-doc em { font-style: italic; }
        .cv-doc hr { border: 0; border-top: 1px solid #d8d4ca; margin: 10pt 0; }
        .cv-doc a { color: inherit; text-decoration: none; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between px-4 py-3">
          <Link
            href={`/app/runs/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#6f6a5e] hover:text-[#1c1a15]"
          >
            <ArrowLeft className="size-4" /> Back to run
          </Link>
          <p className="text-xs text-[#6f6a5e] max-sm:hidden">
            {role ? `CV — ${role}` : "CV"} · choose “Save as PDF” in the print dialog
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-[#1c1a15] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Printer className="size-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* The sheet */}
      <div className="sheet mx-auto my-8 max-w-[210mm] rounded-sm bg-white px-[18mm] py-[16mm] shadow-[0_2px_24px_rgba(0,0,0,0.12)]">
        {cv === undefined && (
          <p className="text-sm text-[#6f6a5e]">Preparing your CV…</p>
        )}
        {cv === null && (
          <p className="text-sm text-[#6f6a5e]">
            This run has no rewritten CV (or you don&apos;t have access to it).
          </p>
        )}
        {cv && (
          <div className="cv-doc">
            <ReactMarkdown>{cv}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
