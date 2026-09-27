import type { ShareResponse, TazaData } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8001";

export async function fetchTaza(token: string): Promise<TazaData> {
  const res = await fetch(`${API_BASE}/api/taza/${token}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchShare(shareToken: string): Promise<TazaData> {
  const res = await fetch(`${API_BASE}/api/share/${shareToken}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function createShare(token: string): Promise<ShareResponse> {
  const res = await fetch(`${API_BASE}/api/taza/${token}/share`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
