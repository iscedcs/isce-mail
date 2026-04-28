"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EyeIcon, LoaderCircle } from "lucide-react";

interface PreviewButtonProps {
  type: string;
  basis: string;
  data: Record<string, any>;
}

export default function PreviewButton({
  type,
  basis,
  data,
}: PreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, basis, data }),
      });
      if (!res.ok) throw new Error("Failed to render preview");
      const text = await res.text();
      setHtml(text);
    } catch {
      setError("Could not render preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
        <EyeIcon className="w-4 h-4 mr-1.5" />
        Preview
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>
              Email Preview — {type} ({basis})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <LoaderCircle className="animate-spin w-6 h-6 text-gray-400" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                {error}
              </div>
            ) : html ? (
              <iframe
                srcDoc={html}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
                title="Email Preview"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
