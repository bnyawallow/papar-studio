import _fileLoader from './src/fileLoader';
import _utils from './src/utils';
import _constants from './src/constants';
import { EditorControls as _EditorControls } from './src/scene/EditorControls';
import _Player from './src/scene/player/Player';
import * as _THREE from 'three';
import { TransformControls as _TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SkeletonUtils as _SkeletonUtils} from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoomEnvironment as _RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS3DSprite as _CSS3DSprite, CSS3DObject as _CSS3DObject, CSS3DRenderer as _CSS3DRenderer} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import _TextTexture from '@seregpie/three.text-texture';

export const fileLoader = _fileLoader;
export const utils = _utils;
export const constants = _constants;

export const Player = _Player;

export const THREE = _THREE;
export const TransformControls = _TransformControls;
export const EditorControls = _EditorControls;
export const CSS3DObject = _CSS3DObject;
export const CSS3DSprite = _CSS3DSprite;
export const CSS3DRenderer = _CSS3DRenderer;
export const RoomEnvironment = _RoomEnvironment;
export const TextTexture = _TextTexture;
export const SkeletonUtils = _SkeletonUtils;
