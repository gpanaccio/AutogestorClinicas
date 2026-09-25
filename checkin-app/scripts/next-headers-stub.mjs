export async function cookies() {
  const guardada = globalThis.__cookieRecepcion;
  return {
    get(nombre) {
      if (!guardada || guardada.name !== nombre) return undefined;
      return { value: guardada.value };
    },
  };
}
