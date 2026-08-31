"use client";

import { useEffect } from "react";

/**
 * Red de seguridad general: si algo revienta con una excepción no controlada
 * en cualquier página, esto se muestra en vez de la pantalla en blanco por
 * defecto de Next.js. El carrito vive en localStorage, así que "Reintentar"
 * no pierde el pedido que el cliente ya armó.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <div className="tarjeta textura-papel w-full p-6 md:p-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber">
          Algo falló
        </p>
        <h2 className="titulo mt-3 text-2xl md:text-3xl">
          Tuvimos un problema
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          No pudimos completar la acción. Puede ser tu conexión — revisa que
          tengas señal e inténtalo de nuevo.
        </p>

        <button type="button" onClick={reset} className="btn-amber mt-6">
          Reintentar
        </button>
      </div>
    </section>
  );
}
