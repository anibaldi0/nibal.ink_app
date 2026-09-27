import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTaza } from "../api";
import type { TazaData } from "../types";
import Modal from "../components/Modal";

export default function Taza() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TazaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchTaza(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Cargando tu taza...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <p className="text-red-400 text-lg">No pudimos encontrar tu taza</p>
        <p className="text-gray-500 text-sm">
          Verifica que el codigo QR este bien escaneado, o pedi ayuda por
          WhatsApp.
        </p>
        <a
          href="https://nibal.ink"
          className="mt-4 px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition"
        >
          Volver a Nibal.ink
        </a>
      </div>
    );
  }

  return <Modal data={data} token={token} />;
}
