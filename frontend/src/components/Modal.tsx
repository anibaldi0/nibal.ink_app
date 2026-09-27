import { useEffect, useMemo } from "react";
import type { TazaData } from "../types";
import { hasWebGL } from "./WebGLDetect";
import Visor3D from "./Visor3D";
import Fallback2D from "./Fallback2D";
import ShareButton from "./ShareButton";
import { pickSaludoRandom } from "../lib/saludos";

interface ModalProps {
  data: TazaData;
  token?: string;
}

const WA_URL =
  "https://wa.me/5491162608022?text=Hola,%20quiero%20mi%20taza%20personalizada";

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Modal({ data, token }: ModalProps) {
  const webgl = hasWebGL();
  const isOwner = Boolean(token);

  // el saludo random se elige una sola vez por montaje. useMemo con
  // array vacio = se calcula al montar y no cambia en cada re-render.
  const saludoRandom = useMemo(() => pickSaludoRandom(), []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col">
      <header className="p-4 text-center">
        {isOwner ? (
          <>
            <h1 className="text-3xl font-bold text-orange-500 max-w-3xl mx-auto leading-tight">
              Hola <span className="text-green-400">{data.nombre}</span>
            </h1>
            <p className="text-lg text-orange-500 max-w-2xl mx-auto mt-2">
              {data.mensaje || saludoRandom}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              Taza personalizada
            </h1>
            {data.compartido_por && (
              <p className="text-xs text-gray-500 mt-1">
                Compartida por {data.compartido_por}
              </p>
            )}
          </>
        )}
      </header>

      <main className="flex-1 min-h-0 relative">
        {/* logo de fondo, detras del canvas. el canvas es transparente,
            asi que el logo se ve donde no hay geometria 3D. */}
        <img
          src="/nibal_ink.png"
          alt=""
          aria-hidden="true"
          className="absolute top-[20%] left-1/2 w-1/2 max-w-xs object-contain opacity-20 invert pointer-events-none select-none"
          style={{ transform: "translateX(-50%)" }}
        />

        {webgl ? (
          <Visor3D modelo={data.modelo} decal={data.decal} />
        ) : (
          <Fallback2D
            thumbnailUrl={data.modelo.thumbnail_url}
            nombre={data.nombre}
          />
        )}
      </main>

      <footer className="p-4 flex flex-wrap justify-center gap-3 border-t border-neutral-800">
        {token && <ShareButton token={token} />}
        <a
          href="https://nibal.ink"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-neutral-800 hover:bg-neutral-700 transition"
        >
          Conoce Nibal.ink
        </a>
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-green-700 hover:bg-green-600 transition"
        >
          <WhatsAppIcon />
          <span>Pedir mi taza</span>
        </a>
      </footer>
    </div>
  );
}
