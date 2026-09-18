import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Fast RFC-4180 compliant CSV line parser supporting quoted fields and commas inside quotes.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
    }

    const text = await file.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "The uploaded CSV file is empty." }, { status: 400 });
    }

    const rawRows = parseCsvRows(text);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in the CSV file." }, { status: 400 });
    }

    // Determine header mapping if first row contains column headers
    const firstRowLower = rawRows[0].map((c) => c.toLowerCase().replace(/[\s_-]+/g, ""));
    let emailIdx = -1;
    let nameIdx = -1;
    let firstNameIdx = -1;
    let lastNameIdx = -1;
    let urlIdx = -1;

    firstRowLower.forEach((h, idx) => {
      if (h === "email" || h === "emailaddress" || h === "mail") emailIdx = idx;
      else if (h === "name" || h === "fullname") nameIdx = idx;
      else if (h === "firstname" || h === "first") firstNameIdx = idx;
      else if (h === "lastname" || h === "last") lastNameIdx = idx;
      else if (h === "url" || h === "link" || h === "website") urlIdx = idx;
    });

    const hasHeader = emailIdx !== -1;
    const startIdx = hasHeader ? 1 : 0;

    // Fallback if no header row detected: find the first column containing an '@'
    if (!hasHeader) {
      for (let c = 0; c < (rawRows[0]?.length || 0); c++) {
        if (EMAIL_REGEX.test(rawRows[0][c])) {
          emailIdx = c;
          break;
        }
      }
      if (emailIdx === -1) emailIdx = 0; // Default to column 0
      if (rawRows[0]?.length > 1) nameIdx = 1;
      if (rawRows[0]?.length > 2) urlIdx = 2;
    }

    const recipients: { email: string; name: string; url?: string }[] = [];
    const seenEmails = new Set<string>();
    let invalidCount = 0;

    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rawEmail = (row[emailIdx] || "").trim().toLowerCase();

      if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
        invalidCount++;
        continue;
      }

      if (seenEmails.has(rawEmail)) {
        continue; // Deduplicate
      }
      seenEmails.add(rawEmail);

      let resolvedName = "";
      if (firstNameIdx !== -1 && row[firstNameIdx]) {
        resolvedName = row[firstNameIdx].trim();
        if (lastNameIdx !== -1 && row[lastNameIdx]) {
          resolvedName += ` ${row[lastNameIdx].trim()}`;
        }
      } else if (nameIdx !== -1 && row[nameIdx]) {
        resolvedName = row[nameIdx].trim();
      }

      const resolvedUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : undefined;

      recipients.push({
        email: rawEmail,
        name: resolvedName,
        ...(resolvedUrl ? { url: resolvedUrl } : {}),
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient email addresses could be parsed from the CSV." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      total: recipients.length,
      invalidCount,
      recipients,
      preview: recipients.slice(0, 5),
      emailsCsv: recipients.map((r) => r.email).join(", "),
    });
  } catch (err: any) {
    console.error("[api/recipients/upload-csv] Parsing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to parse CSV upload." },
      { status: 500 },
    );
  }
}
