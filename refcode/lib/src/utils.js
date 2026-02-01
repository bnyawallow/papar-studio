import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createChromaMaterial}  from './scene/ChromaKeyMaterial';

const _blobCaches = {};

let gltfLoader = null;
const _getGLTFLoader = async () => {
  if (gltfLoader) return gltfLoader;

  const dracoLoader = new DRACOLoader();
  //dracoLoader.setDecoderPath( '/vendor/three/js/libs/draco/gltf/' );
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  gltfLoader = loader;
  return gltfLoader;
}

const loadBlobFromURL = async (url) => {
  if (!_blobCaches[url]) {
    const response = await fetch(url);
    if (response.status !== 200) {
      throw ("url not found", url);
    }
    const blob = await response.blob();
    _blobCaches[url] = blob;
  }
  return _blobCaches[url];
}

const loadImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.addEventListener('load', () => {
      resolve(img);
     });
  });
}

const loadFileSrc = (file) => {
  return new Promise(async (resolve, reject) => { 
    const reader = new FileReader();
    reader.addEventListener( 'load', async (event) => {
      resolve(event.target.result);
    });
    reader.readAsDataURL(file);
  });
}

const loadImage = (file) => {
  return new Promise(async (resolve, reject) => { 
    if (!file.type.match( 'image.*' )) reject();

    const image = document.createElement( 'img' );
    image.addEventListener('load', () => {
      resolve(image);
    });

    const reader = new FileReader();
    reader.addEventListener( 'load', async (event) => {
      const src = event.target.result;
      image.src = src;
    });
    reader.readAsDataURL(file);
  });
}

const loadVideo = (file) => {
  return new Promise(async (resolve, reject) => { 
    const video = document.createElement( 'video' );
    video.setAttribute("playsinline", "");

    video.addEventListener('loadedmetadata', () => {
      resolve(video);
    });
    
    const reader = new FileReader();
    reader.addEventListener( 'load', async (event) => {
      const src = event.target.result;
      video.src = src;
    });
    reader.readAsDataURL(file);
  });
}

const loadVideoAsMesh = async (file, aspect) => {
  const video = await loadVideo(file);
  //video.play();
  //console.log("video", video);

  const texture = new THREE.VideoTexture(video);
  //texture.format = file.type === 'image/jpeg' ? THREE.RGBFormat : THREE.RGBAFormat;
  texture.needsUpdate = true;

  if (!aspect) aspect = video.width / video.height;
  const width = 1;
  const height = width / aspect;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial();
  material.metalness = 1;
  material.map = texture;
  material.flatShading = true;
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh( geometry, material );
  mesh.scale.set(width, height, 1);
  return mesh;
}

const loadImageAsChromaMesh = async (file, aspect, keyColor) => {
  const image = file instanceof HTMLImageElement? file: await loadImage(file);
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;

  if (!aspect) aspect = image.width / image.height;
  const width = 1;
  const height = width / aspect;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = createChromaMaterial(texture, keyColor);
  const mesh = new THREE.Mesh( geometry, material );
  mesh.scale.set(width, height, 1);
  return mesh;
}

const loadImageAsMesh = async (file, aspect) => {
  let image;
  if (file instanceof HTMLImageElement) {
    image = file;
  } else {
    image = await loadImage(file);
  }

  const texture = new THREE.Texture(image);
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;

  if (!aspect) aspect = image.width / image.height;
  const width = 1;
  const height = width / aspect;

  const geometry = new THREE.PlaneGeometry(1, 1);
  //const material = new THREE.MeshStandardMaterial();
  const material = new THREE.MeshBasicMaterial();
  //material.metalness = 1;
  material.map = texture;
  material.flatShading = true;
  material.transparent = true;
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh( geometry, material );
  mesh.scale.set(width, height, 1);
  return mesh;
}

const loadImageAsSpriteMesh = async (file, aspect) => {
  const image = await loadImage(file);

  if (!aspect) aspect = image.width / image.height;
  const width = 1;
  const height = width / aspect;

  const texture = new THREE.Texture(image);
  //texture.format = file.type === 'image/jpeg' ? THREE.RGBFormat : THREE.RGBAFormat;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial( {map: texture} );
  const sprite = new THREE.Sprite( material );
  sprite.scale.set(width, height, 1);
  return sprite;
}

const loadGLBModel = (file, targetWidth) => {
  return new Promise(async (resolve, reject) => { 
    const reader = new FileReader();
    reader.addEventListener( 'load', async (event) => {
      const contents = event.target.result;
      const loader = await _getGLTFLoader();

      loader.parse(contents, '', (result) => {
	//console.log("glb result", result);

	const scene = result.scene;
	scene.animations.push(...result.animations);
	//const box = new THREE.Box3().setFromObject(scene);
	//const maxSize = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
	//const maxSize = Math.max(box.max.x - box.min.x, box.max.y - box.min.y);
	//const scale = targetWidth / maxSize;
	//scene.scale.set(scale, scale, scale);
	resolve(scene);
      });
    });
    reader.readAsArrayBuffer(file);
  });
}

export default {
  loadBlobFromURL,
  loadImageFromURL,
  loadImage,
  loadVideo,
  loadFileSrc,
  loadGLBModel,
  loadImageAsMesh,
  loadImageAsSpriteMesh,
  loadImageAsChromaMesh,
  loadVideoAsMesh
}
