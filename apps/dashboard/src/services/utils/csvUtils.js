/**
 * csvUtils — CSV encode and decode helpers
 *
 * Domain: Shared / Cross-cutting
 * Feature: 05 (inventory import/export)
 * Depends on: nothing
 */

export function toCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const next = String(value);
  if (!next.includes(",") && !next.includes('"') && !next.includes("\n")) {
    return next;
  }

  return `"${next.replace(/"/g, '""')}"`;
}

export function parseSimpleCsv(content) {
  const rows = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const parseLine = (line) => {
    const output = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        output.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    output.push(current);
    return output.map((value) => value.trim());
  };

  const headers = parseLine(rows[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "_"),
  );
  const records = rows.slice(1).map((row) => {
    const values = parseLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || "";
      return acc;
    }, {});
  });

  return { headers, records };
}
