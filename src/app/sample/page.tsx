"use client";
import Editor from "@/components/shared/editor-component/editor";
import React, { useState } from "react";

export default function Sample() {
  const [editorContent, setEditorContent] = useState("");
  return (
    <div>
      <Editor onChange={()=>{}} setContent={setEditorContent} />
    </div>
  );
}
