
import { ThreeElements } from '@react-three/fiber';
import { Object3DNode, MaterialNode } from '@react-three/fiber';
import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      chromaKeyMaterial: Object3DNode<THREE.ShaderMaterial, typeof THREE.ShaderMaterial> & {
        tex?: THREE.Texture | null;
        color?: THREE.Color;
      };
      // Allow any other standard HTML or Three elements
      [elemName: string]: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      chromaKeyMaterial: any;
      [elemName: string]: any;
    }
  }
}

export {};
