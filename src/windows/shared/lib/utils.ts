import { twMerge } from 'tailwind-merge'

export function and(...inputs: (string | undefined | null | false)[]) {
  return twMerge(...inputs.filter(Boolean))
}
