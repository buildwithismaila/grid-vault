export function formatEnum(value: string): string {
  return value
    .split('_')
    .map(word =>
      word.length <= 2 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')
}
