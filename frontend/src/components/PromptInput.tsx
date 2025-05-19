import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"; // For conditional classes

interface Props {
  onSubmit: (promptText: string, file?: File) => void;
  isLoading?: boolean;
  contentType: "image" | "video" | "voice" | "text";
  placeholderText?: string;
  submitButtonText?: string;
  maxChars?: number;
  showFileUpload?: boolean;
  onFileChange?: (file: File | null) => void;
  acceptedFileTypes?: string;
  errorMessage?: string | null;
  className?: string;
}

export const PromptInput: React.FC<Props> = ({
  onSubmit,
  isLoading = false,
  contentType,
  placeholderText = "Enter your prompt here...",
  submitButtonText = "Generate",
  maxChars,
  showFileUpload = false,
  onFileChange,
  acceptedFileTypes,
  errorMessage,
  className,
}) => {
  console.log('PromptInput component rendering, received isLoading:', isLoading);

  const [promptText, setPromptText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    let text = event.target.value;
    if (maxChars && text.length > maxChars) {
      text = text.substring(0, maxChars);
    }
    setPromptText(text);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (onFileChange) {
      onFileChange(file);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    console.log("PromptInput: handleSubmit triggered"); // <-- ADD THIS LOG
    event.preventDefault();
    if (!promptText.trim() && !selectedFile) {
      // Basic validation: either prompt or file must be present
      // More specific error handling can be added via errorMessage prop
      return;
    }
    console.log("PromptInput: handleSubmit - BEFORE calling prop onSubmit");
    onSubmit(promptText, selectedFile || undefined);
    console.log("PromptInput: handleSubmit - AFTER calling prop onSubmit");
  };

  const charsLeft = maxChars ? maxChars - promptText.length : null;

  // Dynamic styling based on content type - can be expanded
  const getContentTypeIndicatorColor = () => {
    switch (contentType) {
      case "image":
        return "border-blue-500";
      case "video":
        return "border-purple-500";
      case "voice":
        return "border-green-500";
      case "text":
        return "border-yellow-500";
      default:
        return "border-gray-500";
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4 p-4 border rounded-lg shadow-md bg-card", getContentTypeIndicatorColor(), className)}>
      <div className="relative">
        <Textarea
          value={promptText}
          onChange={handleTextChange}
          placeholder={placeholderText}
          className="min-h-[100px] pr-20 resize-none"
          disabled={isLoading}
        />
        {maxChars && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {charsLeft} / {maxChars}
          </div>
        )}
      </div>

      {showFileUpload && (
        <div>
          <label htmlFor="file-upload" className="text-sm font-medium text-muted-foreground">
            Reference File (Optional)
          </label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept={acceptedFileTypes}
            className="mt-1"
            disabled={isLoading}
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground mt-1">Selected: {selectedFile.name}</p>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}

      <Button type="submit" disabled={isLoading || (!promptText.trim() && !selectedFile)} className="w-full">
        {isLoading ? "Generating..." : submitButtonText}
      </Button>
    </form>
  );
};
