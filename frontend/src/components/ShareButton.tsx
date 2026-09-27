import { useState } from "react";
import { createShare } from "../api";

interface ShareButtonProps {
  token: string;
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ShareButton({ token }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const { share_url } = await createShare(token);

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Nibal.ink - Taza personalizada",
            text: "Mira la taza personalizada que tengo",
            url: share_url,
          });
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            throw e;
          }
        }
      } else {
        await navigator.clipboard.writeText(share_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      setError("No pudimos generar el enlace. Intenta de nuevo.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-gray-500 transition"
    >
      {copied ? <CheckIcon /> : <ShareIcon />}
      <span>
        {loading ? "Generando..." : copied ? "Link copiado" : error ? "Error" : "Compartir"}
      </span>
    </button>
  );
}
