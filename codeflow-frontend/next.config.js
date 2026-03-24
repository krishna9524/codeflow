/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Whenever the frontend requests an image from /uploads/...
        source: '/uploads/:path*',
        // Secretly proxy that request to the backend server
        destination: 'http://localhost:5000/uploads/:path*', 
      },
    ]
  },
}

module.exports = nextConfig