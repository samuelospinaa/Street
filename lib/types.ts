import type { SedeId } from "./sedes";

export type Seccion =
  | "producto_destacado"
  | "entrada"
  | "signature_dishes"
  | "fries_especiales"
  | "fries_tradicionales"
  | "adiciones"
  | "bebidas";

export type MenuItem = {
  id: string;
  seccion: Seccion;
  nombre: string;
  subtitulo: string | null;
  descripcion: string | null;
  precio_cop: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
  salsas_recomendadas: string[] | null;
  ingredientes: string[] | null;
};

export type Salsa = {
  id: string;
  nombre: string;
  grupo: "tradicional" | "chef" | "disponible";
  activo: boolean;
  orden: number;
};

/** Una adición seleccionada dentro de una línea del pedido. */
export type AdicionSeleccionada = {
  id: string;
  nombre: string;
  precio: number;
};

/** Una línea del carrito. `lineId` es local: el mismo producto con distintas
 *  salsas o adiciones es una línea distinta. */
export type CartLine = {
  lineId: string;
  menuItemId: string;
  nombre: string;
  precioBase: number;
  cantidad: number;
  salsas: string[];
  adiciones: AdicionSeleccionada[];
  /** Ingredientes de base del plato que el cliente pidió quitar (ej. "sin guacamole"). */
  ingredientesQuitados: string[];
};

export type TipoEntrega = "domicilio" | "recoger";

export type DatosCliente = {
  nombre: string;
  telefono: string;
  telefonoAlterno: string;
  sedeId: SedeId;
  tipoEntrega: TipoEntrega;
  direccion: string;
  unidad: string;
  notas: string;
  lat: number | null;
  lng: number | null;
};

/** Payload que el cliente manda a la server action. Los precios que viajan aquí
 *  son informativos: el servidor los recalcula desde `menu_items`. */
export type OrderPayload = {
  cliente: DatosCliente;
  lineas: {
    menuItemId: string;
    cantidad: number;
    salsas: string[];
    adicionIds: string[];
    ingredientesQuitados: string[];
  }[];
};

export type CreateOrderResult =
  | { ok: true; orderId: string; waUrl: string; subtotal: number }
  | { ok: false; error: string };

export const SECCIONES_MENU: { key: Seccion; titulo: string; nota?: string }[] =
  [
    { key: "signature_dishes", titulo: "Signature Dishes" },
    { key: "fries_especiales", titulo: "Fries Especiales" },
    { key: "fries_tradicionales", titulo: "Fries Tradicionales" },
    { key: "entrada", titulo: "Entrada" },
    { key: "bebidas", titulo: "Bebidas" },
  ];

/** Secciones cuyas tarjetas permiten elegir salsas y adiciones. */
export const SECCIONES_CON_PAPAS: Seccion[] = [
  "signature_dishes",
  "fries_especiales",
  "fries_tradicionales",
];

/** Los tres tipos de papas, para los botones de filtro junto a "Ver el menú". */
export const FILTROS_PAPAS: { key: Seccion; etiqueta: string }[] = [
  { key: "fries_tradicionales", etiqueta: "Fries Tradicionales" },
  { key: "signature_dishes", etiqueta: "Fries Del Chef" },
  { key: "fries_especiales", etiqueta: "Fries Especiales" },
];
