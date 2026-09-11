export type SedeId =
  | "parque-sabaneta"
  | "calle-larga"
  | "mixy-mall-los-colores"
  | "envigado"
  | "complex-ditaires";

export type Sede = { id: SedeId; nombre: string; whatsapp: string };

/** Las 5 sedes de Street Fries. `whatsapp` es el número al que se manda el
 *  pedido de esa sede (mismo formato que antes: solo dígitos con indicativo,
 *  ej. "573001234567") — reemplaza al único `NEXT_PUBLIC_RESTAURANT_WHATSAPP`
 *  de cuando había un solo local. */
export const SEDES: Sede[] = [
  {
    id: "parque-sabaneta",
    nombre: "Parque Sabaneta",
    whatsapp: "573174197973",
  },
  { id: "calle-larga", nombre: "Calle Larga", whatsapp: "573174197973" },
  {
    id: "mixy-mall-los-colores",
    nombre: "Mixy Mall Los Colores",
    whatsapp: "573245797172",
  },
  { id: "envigado", nombre: "Envigado", whatsapp: "573042438958" },
  {
    id: "complex-ditaires",
    nombre: "Complex Ditaires",
    whatsapp: "573147298525",
  },
];

export const SEDE_POR_DEFECTO: SedeId = SEDES[0].id;

export function sedePorId(id: string): Sede | undefined {
  return SEDES.find((s) => s.id === id);
}
