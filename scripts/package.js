#!/usr/bin/env node
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import tar from 'tar'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ─── Parse version bump flags ────────────────────────────────────────────────
const args = process.argv.slice(2)
let bumpType = 'patch'
let exactVersion = null

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--major') bumpType = 'major'
  else if (args[i] === '--minor') bumpType = 'minor'
  else if (args[i] === '--patch') bumpType = 'patch'
  else if (args[i] === '--version' && args[i + 1]) {
    exactVersion = args[i + 1]
    i++
  }
}

// ─── Read & bump version ──────────────────────────────────────────────────────
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const oldVersion = pkg.version
const newVersion = exactVersion ?? bumpVersion(oldVersion, bumpType)
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(`📦 Version bumped: ${oldVersion} → ${newVersion}`)

// ─── Build ────────────────────────────────────────────────────────────────────
console.log('🔨 Building…')
execSync('npm run build', { cwd: root, stdio: 'inherit' })

// ─── Package name: always btool-app ──────────────────────────────────────────
const archiveName = `btool-app-${newVersion}.tar.gz`
const outPath = resolve(root, archiveName)

console.log(`📦 Creating archive: ${archiveName}`)

// tar.c() creates a compressed archive using the tar npm package v6 high-level API
await tar.c(
  {
    gzip: true,
    file: outPath,
    cwd: root,
  },
  ['dist', 'config', 'package.json']
)

console.log(`✅ Packaged: ${archiveName}`)