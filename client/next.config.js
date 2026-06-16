/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from scanning for Pages Router artifacts (_document, _app)
  // when running a pure App Router project
  experimental: {
    typedRoutes: false,
  },
}

module.exports = nextConfig
