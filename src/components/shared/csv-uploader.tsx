import React from "react";
import { Input } from "../ui/input";

export default function CSVUploader({
  handleUpload,
}: {
  handleUpload: (e: any) => void;
}) {
  return (
    <div>
      <Input type="file" accept=".csv" onChange={handleUpload} />
    </div>
  );
}
