
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const ChromaKeyMaterialImpl = shaderMaterial(
  {
    tex: null,
    color: new THREE.Color(0x00ff00), // Default Green
  },
  // Vertex Shader
  `
    varying mediump vec2 vUv;
    void main(void) {
      vUv = uv;
      mediump vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform mediump sampler2D tex;
    uniform mediump vec3 color;
    varying mediump vec2 vUv;
    void main(void) {
      mediump vec3 tColor = texture2D( tex, vUv ).rgb;
      mediump float a = (length(tColor - color) - 0.5) * 7.0;
      gl_FragColor = vec4(tColor, a);
    }
  `
);

extend({ ChromaKeyMaterial: ChromaKeyMaterialImpl });

export default ChromaKeyMaterialImpl;
