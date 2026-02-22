
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    'three-stdlib',
  ],
  experimental: {
    esmExternals: 'loose'
  },
};

export default nextConfig;
