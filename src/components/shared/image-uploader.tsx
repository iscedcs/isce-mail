"use client";
import { useRef, useState } from "react";
import { UploadCloudIcon, XIcon, ImageIcon, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({
  value,
  onChange,
  label = "Banner Image",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upload" | "url">("upload");

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.url as string);
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Tab switcher */}
      <div className="flex gap-1 text-[13px] border rounded-md w-fit p-0.5 bg-muted">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`px-3 py-1 rounded transition-colors ${tab === "upload" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`px-3 py-1 rounded transition-colors ${tab === "url" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
          Paste URL
        </button>
      </div>

      {tab === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg h-36 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
          {uploading ? (
            <LoaderCircle className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <UploadCloudIcon className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Drag & drop an image or{" "}
                <span className="underline">click to browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                JPEG, PNG, WebP, GIF — max 5 MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {tab === "url" && (
        <Input
          type="url"
          placeholder="https://example.com/banner.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && (
        <p className="text-[12px] text-red-500">{error}</p>
      )}

      {/* Preview */}
      {value && (
        <div className="relative mt-2 rounded-md overflow-hidden border border-muted w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Banner preview"
            className="w-full max-h-48 object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={clearImage}
            className="absolute top-2 right-2 h-6 w-6 rounded-full">
            <XIcon className="w-3 h-3" />
          </Button>
        </div>
      )}

      {!value && (
        <div className="flex items-center gap-2 border rounded-md p-3 bg-muted/20 text-muted-foreground text-[12px]">
          <ImageIcon className="w-4 h-4 shrink-0" />
          No image selected — the email will render without a banner image.
        </div>
      )}
    </div>
  );
}
