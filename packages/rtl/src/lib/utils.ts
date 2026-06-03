import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




export async function copyToClipboard(text: string) {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy using navigator.clipboard: ", err);
    }
  }

  // Fallback for non-secure contexts or when navigator.clipboard is unavailable
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Ensure the textarea is not visible
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);

  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed: ", err);
    document.body.removeChild(textArea);
    return false;
  }
}
