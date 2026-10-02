"use client";

import { useEffect } from "react";
import { ROLES } from "@/app/lib/roles.js";
import { isNativeApp } from "@/app/core/client/native/nativeBridge.js";
import { registerPushDevice } from "@/app/core/client/native/pushRegistration.js";

/** En la app nativa, registra el celular del conductor para el aviso de "servicio en 3 h". */
export function usePushRegistration({ role, uid }) {
  useEffect(() => {
    if (role !== ROLES.CONDUCTOR || !uid || !isNativeApp()) return;

    let cancelled = false;
    let cleanup = () => {};
    registerPushDevice()
      .then((fn) => {
        if (cancelled) fn();
        else cleanup = fn;
      })
      .catch(() => {
        // Sin push el seguimiento sigue funcionando al abrir la app.
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [role, uid]);
}
