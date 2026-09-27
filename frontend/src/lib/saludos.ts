// Saludos random para el dueño de la taza. Se elige uno al azar cada
// vez que se abre el modal. Si el admin cargó un mensaje personalizado
// en la taza, ese reemplaza al saludo random.
//
// Para agregar o cambiar saludos, editar el array. No hace falta tocar
// el resto del código ni el backend.
const SALUDOS_RANDOM = [
  "Genial el diseño de tu taza",
  "Excelente elección de diseño",
  "Te quedó genial la personalización",
  "Una taza única para una persona única",
  "Si esta taza quedó tan genial, ¿cómo será de genial la próxima?",
  "Te felicito, excelente diseño",
];

export function pickSaludoRandom(): string {
  const i = Math.floor(Math.random() * SALUDOS_RANDOM.length);
  return SALUDOS_RANDOM[i];
}
