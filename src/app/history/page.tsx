"use client";
import { useEffect, useState } from "react";
import { SendHistoryEntry } from "@/lib/send-history";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SendHistoryPage() {
  const [history, setHistory] = useState<SendHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    setLoading(true);
    fetch("/api/send-history")
      .then((r) => r.json())
      .then((data) => setHistory(data))
      .finally(() => setLoading(false));
  };

  const clearHistory = () => {
    fetch("/api/send-history", { method: "DELETE" }).then(() => setHistory([]));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send History</h1>
          <p className="text-gray-500 text-sm mt-1">
            A log of all emails sent this session. Clears on server restart.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}>
            Clear
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No emails sent yet.</p>
          <p className="text-sm mt-1">
            Send an email from any template to see it here.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Recipients</TableHead>
              <TableHead>Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className="capitalize font-medium">{entry.type}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.basis === "PalmTechniq" ? "default" : "secondary"
                    }>
                    {entry.basis}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm">
                  {entry.subject}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {entry.recipientCount}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(entry.sentAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
