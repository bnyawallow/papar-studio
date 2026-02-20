
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
    // Add the exact package name(s) causing the crash — look in the build log
    // Examples from common AI/ modern libs:
    // 'some-ai-lib',           // replace with actual name from error
    // '@google/generative-ai', // if using Gemini SDK
    // 'other-esm-only-dep'
  ],
  // Optional but often helpful with newer ESM deps
  experimental: {
    esmExternals: 'loose'   // or true — tries to auto-handle ESM externals
  },
};

export default nextConfig;
