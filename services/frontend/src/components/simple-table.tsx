import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column = {
  header: string;
  /** Right-aligned, for numbers. */
  numeric?: boolean;
  /** Hidden on a phone; the table keeps the columns that matter most. */
  wide?: boolean;
};

/**
 * A table inside a card, in the plan table's style: muted small headers, quiet row lines.
 * Rows are `relative` so a link inside one can stretch over the whole row (the plots page does).
 */
export function SimpleTable({ columns, rows, empty }: { columns: Column[]; rows: { key: string; cells: ReactNode[] }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border bg-card px-4 py-8 text-center text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.header} className={cellClass(column, "h-9 text-xs font-medium text-muted-foreground")}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className="relative hover:bg-muted/40">
              {row.cells.map((cell, index) => (
                <TableCell key={columns[index].header} className={cellClass(columns[index], "py-2.5")}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The classes of one cell: alignment, phone visibility and the card's side padding. */
function cellClass(column: Column, base: string): string {
  return cn(base, "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5", column.numeric && "text-right", column.wide && "hidden md:table-cell");
}
