interface Fallback2DProps {
  thumbnailUrl: string;
  nombre: string | null;
}

export default function Fallback2D({ thumbnailUrl, nombre }: Fallback2DProps) {
  const altText = nombre ? `Taza de ${nombre}` : "Taza personalizada";

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <img
        src={thumbnailUrl}
        alt={altText}
        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
      />
      <p className="text-xs text-gray-500 mt-4">
        Tu dispositivo no soporta 3D. Esta es una vista previa.
      </p>
    </div>
  );
}
