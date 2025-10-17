#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

const versionType = process.argv[2] || 'patch'

// Read current package.json
const packagePath = './package.json'
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

// Parse current version
const [major, minor, patch] = packageJson.version.split('.').map(Number)

let newVersion
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`
    break
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`
    break
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`
    break
}

console.log(`Bumping version from ${packageJson.version} to ${newVersion}`)

// Update package.json
packageJson.version = newVersion
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')

// Create git tag
const tagName = `v${newVersion}`
console.log(`Creating tag: ${tagName}`)

try {
  execSync(`git add ${packagePath}`, { stdio: 'inherit' })
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
    stdio: 'inherit',
  })
  execSync(`git tag ${tagName}`, { stdio: 'inherit' })
  console.log(`✅ Version ${newVersion} tagged successfully!`)
  console.log(`Run: git push origin main --tags`)
} catch (error) {
  console.error('❌ Error creating tag:', error.message)
  process.exit(1)
}
