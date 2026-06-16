export async function invalidateCache(name: string) {
  const cache = useStorage('cache')
  await cache.removeItem(`nitro:${name}:default.json`)
}
