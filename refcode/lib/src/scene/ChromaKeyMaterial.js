// Ref: https://github.com/hawksley/Threex.chromakey/blob/master/README.md
import * as THREE from 'three';

const createChromaMaterial = (texture, keyColor) => {
  const keyColorObject = new THREE.Color(keyColor);
  /*
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  */

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tex: {
        type: "t",
        value: texture
      },
      color: {
        type: "c",
        value: keyColorObject
      }
    },
    vertexShader:
    "varying mediump vec2 vUv;\n" +
    "void main(void)\n" +
    "{\n" +
    "vUv = uv;\n" +
    "mediump vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n" +
    "gl_Position = projectionMatrix * mvPosition;\n" +
    "}",
    fragmentShader:
    "uniform mediump sampler2D tex;\n" +
    "uniform mediump vec3 color;\n" +
    "varying mediump vec2 vUv;\n" +
    "void main(void)\n" +
    "{\n" +
    "  mediump vec3 tColor = texture2D( tex, vUv ).rgb;\n" +
    "  mediump float a = (length(tColor - color) - 0.5) * 7.0;\n" +
    "  gl_FragColor = vec4(tColor, a);\n" +
    "}",
    transparent: true
  });

  return material;
}

export {
  createChromaMaterial
}
