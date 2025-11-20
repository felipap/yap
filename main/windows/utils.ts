import { existsSync } from 'fs'
import { join } from 'path'

export function getIconPath(env?: 'production' | 'development'): string | null {
  const currentEnv =
    env ||
    (process.env.NODE_ENV as 'production' | 'development') ||
    'development'

  const possibleIconPaths = [
    join(__dirname, '../../assets', 'icon.png'),
    join(__dirname, '../../assets', 'icon.icns'),
    join(process.resourcesPath, 'assets', 'icon.png'),
    join(process.resourcesPath, 'assets', 'icon.icns'),
    join(process.cwd(), 'assets', 'icon.png'),
    join(process.cwd(), 'assets', 'icon.icns'),
  ]

  for (const path of possibleIconPaths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}

export function findIconPath(): string | null {
  return getIconPath()
}
