/** @type {import('next').NextConfig} */
// Static export for GitHub Pages. The site lives under /<repo>/, so every
// absolute path needs BASE_PATH in front of it.
const basePath = process.env.BASE_PATH || ''

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

module.exports = nextConfig
