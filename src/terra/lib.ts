export function toRaw<K>(obj: any): K {
  delete obj.kind

  return obj
}
