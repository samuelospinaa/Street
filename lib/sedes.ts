export type SedeId =
  | "parque-sabaneta"
  | "calle-larga"
  | "mixy-mall-los-colores"
  | "envigado"
  | "complex-ditaires"
  | "florida";

export type Sede = {
  id: SedeId;
  nombre: string;
  whatsapp: string;
  /** Dirección física, usada en el schema `FoodEstablishment` para SEO local/GEO. */
  direccion?: string;
  ciudad: string;
};

/** Las 6 sedes de Street Fries. `whatsapp` es el número al que se manda el
 *  pedido de esa sede (mismo formato que antes: solo dígitos con indicativo,
 *  ej. "573001234567") — reemplaza al único `NEXT_PUBLIC_RESTAURANT_WHATSAPP`
 *  de cuando había un solo local. */
export const SEDES: Sede[] = [
  {
    id: "parque-sabaneta",
    nombre: "Parque Sabaneta",
    whatsapp: "573174197973",
    direccion: "Cl. 71 Sur #43B-27",
    ciudad: "Sabaneta",
  },
  {
    id: "calle-larga",
    nombre: "Calle Larga",
    whatsapp: "573174197973",
    direccion: "Cra. 47 #75 Sur 68",
    ciudad: "Sabaneta",
  },
  {
    id: "mixy-mall-los-colores",
    nombre: "Mixy Mall Los Colores",
    whatsapp: "573245797172",
    direccion: "Cl. 55 #79-11, Laureles - Estadio",
    ciudad: "Medellín",
  },
  {
    id: "envigado",
    nombre: "Envigado",
    whatsapp: "573042438958",
    direccion: "Cl. 37 Sur #35-01, Zona 9",
    ciudad: "Envigado",
  },
  {
    id: "complex-ditaires",
    nombre: "Complex Ditaires",
    whatsapp: "573147298525",
    direccion: "Cl. 35 #61-12, Vegas Del Parque",
    ciudad: "Itagüí",
  },
  {
    id: "florida",
    nombre: "Florida",
    // TODO: falta el número de WhatsApp y la dirección real de esta sede —
    // el WhatsApp apunta al de Parque Sabaneta como placeholder para no
    // romper el flujo de pedidos mientras se confirman ambos datos.
    whatsapp: "573174197973",
    ciudad: "Florida",
  },
];

export const SEDE_POR_DEFECTO: SedeId = SEDES[0].id;

export function sedePorId(id: string): Sede | undefined {
  return SEDES.find((s) => s.id === id);
}
