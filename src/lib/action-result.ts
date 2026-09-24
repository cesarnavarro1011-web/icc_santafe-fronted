/** Mismo contrato { success, error } que usaban las funciones del Apps Script. */
export type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };
