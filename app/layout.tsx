
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PapAR Studio',
  description: 'A professional web-based AR editor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react/": "https://esm.sh/react@18.2.0/",
                "react-dom": "https://esm.sh/react-dom@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "three": "https://esm.sh/three@0.150.1",
                "three/": "https://esm.sh/three@0.150.1/",
                "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.13.0?deps=three@0.150.1,react@18.2.0",
                "@react-three/drei": "https://esm.sh/@react-three/drei@9.70.0?deps=three@0.150.1,react@18.2.0,@react-three/fiber@8.13.0",
                "three-stdlib": "https://esm.sh/three-stdlib@2.21.1?deps=three@0.150.1",
                "uuid": "https://esm.sh/uuid@9.0.1",
                "tslib": "https://esm.sh/tslib@2.8.1",
                "@wry/equality": "https://esm.sh/@wry/equality@0.5.7",
                "fast-json-stable-stringify": "https://esm.sh/fast-json-stable-stringify@2.1.0",
                "react-player": "https://esm.sh/react-player@2.12.0?deps=react@18.2.0,react-dom@18.2.0",
                "youtube-player": "https://esm.sh/youtube-player@5.6.0",
                "@vimeo/player": "https://esm.sh/@vimeo/player@2.20.1",
                "@seregpie/three.text-texture": "https://esm.sh/@seregpie/three.text-texture@3.2.1?deps=three@0.150.1"
              }
            }, null, 2)
          }}
        />
      </head>
      <body className="bg-background-primary text-text-primary overflow-x-hidden m-0 p-0">
        {children}
      </body>
    </html>
  );
}
