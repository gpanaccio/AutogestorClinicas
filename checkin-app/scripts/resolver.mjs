const stub = new URL("./next-headers-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return { url: stub, shortCircuit: true };
  }
  const relativo = specifier.startsWith("./") || specifier.startsWith("../");
  const tieneExtension = /\.[a-z0-9]+$/i.test(specifier);
  if (relativo && !tieneExtension) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
