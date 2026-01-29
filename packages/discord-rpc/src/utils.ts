export const deepClone = <T>(obj: T): T =>
  obj == null ? obj : structuredClone(obj);

export const sortKeys = (value: any): any => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort())
      out[k] = sortKeys((value as any)[k]);
    return out;
  }
  return value;
};
