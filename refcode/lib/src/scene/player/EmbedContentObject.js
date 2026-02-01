import * as THREE from 'three';
import { CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import ContentObject from './ContentObject';
import YouTubePlayer from 'youtube-player';
import VimeoPlayer from '@vimeo/player';
import constants from '../../constants';

class EmbedContentObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content} = this;
    this.mesh = this._createMesh();
    this.mesh.userData.isContent = true;
    this.mesh.scale.fromArray(content.properties.scale);
    this.mesh.position.fromArray(content.properties.position);
    this.mesh.rotation.fromArray(content.properties.rotation);

    //this.mesh.scale.x /= constants.DEFAULT_EMBED_WIDTH; 
    //this.mesh.scale.y /= constants.DEFAULT_EMBED_HEIGHT; 

    const {div, playerDiv} = this._createDivs(content);
    if (content.properties.userFacing) {
      this.cssElement = new CSS3DSprite(div);
    } else {
      this.cssElement = new CSS3DObject(div);
    }
    this.cssElement.position.copy(this.mesh.position);
    this.cssElement.rotation.copy(this.mesh.rotation);
    this.cssElement.element.style.visibility = "hidden";
    //this.cssElement.scale.x /= constants.DEFAULT_EMBED_WIDTH; 
    //this.cssElement.scale.y /= constants.DEFAULT_EMBED_HEIGHT; 

    this.player = this._createPlayer(content, playerDiv);
    this.playerState = null;
  }

  onClick(obj) {
    if (this.content.properties.videoClickToggle) {
      if (obj.isPlayingVideo()) {
	obj.pauseVideo();
      } else {
	obj.playVideo();
      }
    }
  }

  dummyTrigger() {
    return new Promise((resolve, reject) => {
      const {content} = this;
      // in iOS, if we don't do this upon user event, the player won't be able to start later
      if (content.embed.videoMeta.service === 'youtube') {
	this.player.playVideo().then(() => {
	  //this.player.pauseVideo();
	  this.player.stopVideo();
	  resolve();
	});
      } else if (content.embed.videoMeta.service === 'vimeo') {
	this.player.play().then(() => {
	  this.player.pause();
	  resolve();
	});
      }
    });
  }

  activate() {
    const {embed: {videoMeta}} = this.content;
    this.cssElement.element.style.visibility = "visible";
    if (this.content.properties.videoAutostart) {
      if (videoMeta.service === 'youtube') {
	this.player.playVideo();
      } else if (videoMeta.service === 'vimeo') {
	this.player.play().then(() => {
	}).catch((e) => {
	  console.log("vimeo activate play error", e);
	});
      }
    }
  }
  deactivate() {
    const {embed: {videoMeta}} = this.content;
    this.cssElement.element.style.visibility = "hidden";
    if (videoMeta.service === 'youtube') {
      this.player.pauseVideo();
    } else if (videoMeta.service === 'vimeo') {
      this.player.pause();
    }
  }

  createScriptObject() {
    const self = this;
    const {embed: {videoMeta}} = this.content;
    const obj = super.createScriptObject();
    const player = this.player;

    Object.assign(obj, {
      cssElement: self.cssElement,
    });

    const originalSetPosition = obj.setPosition;
    const originalSetRotation = obj.setRotation;
    const originalSetVisible = obj.setVisible;
    Object.assign(obj, {
      setPosition: (x, y, z) => {
	originalSetPosition(x, y, z);
	this.cssElement.position.copy(this.mesh.position);
      },
      setRotation: (x, y, z) => {
	originalSetRotation(x, y, z);
	this.cssElement.rotation.copy(this.mesh.rotation);
      },
      setVisible: (visible) => {
	originalSetVisible(visible);
	if (visible) {
	  this.cssElement.element.style.visibility = "visible";
	} else {
	  this.cssElement.element.style.visibility = "hidden";
	}
      }
    });

    if (videoMeta.service === 'youtube') {
      Object.assign(obj, {
	playVideo: () => {
	  player.playVideo();
	},

	pauseVideo: () => {
	  player.pauseVideo();
	},

	isPlayingVideo: () => {
	  return self.playerState === window.YT.PlayerState.PLAYING;
	}
      });
    } else if (videoMeta.service === 'vimeo') {
      Object.assign(obj, {
	playVideo: () => {
	  player.play();
	},

	pauseVideo: () => {
	  player.pause();
	},

	isPlayingVideo: () => {
	  return this.playerState === 'playing';
	}
      });

    }
    return obj;
  }

  _createMesh() {
    const width = constants.DEFAULT_EMBED_WIDTH;
    const height = constants.DEFAULT_EMBED_HEIGHT;

    const material = new THREE.MeshBasicMaterial({
      color: 0x0000000,
      opacity: 0.0,
      //color: 0xff00000,
      //opacity: 0.1,
      side: THREE.DoubleSide
    });
    const geometry = new THREE.PlaneGeometry(1, constants.DEFAULT_EMBED_HEIGHT / constants.DEFAULT_EMBED_WIDTH);
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  _createDivs(content) {
    const properties = content.properties;

    const div = document.createElement( 'div' );
    div.style.userSelect = "none";
    div.style.width =  properties.scale[0] + "px";
    div.style.height =  (constants.DEFAULT_EMBED_HEIGHT / constants.DEFAULT_EMBED_WIDTH * properties.scale[0]) + "px";
    div.style.position = "relative";

    const playerDiv = document.createElement("div");
    playerDiv.style.userSelect = "none";
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.border = '0px';
    div.appendChild(playerDiv);

    return {div, playerDiv};
  }

  _createPlayer(content, playerDiv) {
    const {embed: {videoMeta}} = content;
    const width = constants.DEFAULT_EMBED_WIDTH;
    const height = constants.DEFAULT_EMBED_HEIGHT;

    let player;
    if (videoMeta.service === 'youtube') {
      const loop = content.properties.videoLoop? 1: 0;
      player = YouTubePlayer(playerDiv, {
	videoId: videoMeta.id, 
	width: width, 
	height: height,
	playerVars: {
	  loop,
	  playlist: videoMeta.id, // loop won't work without this
	  controls: 0,
	  fs: 0, 
	  playsinline: 1, 
	  rel: 0
	},
      });
      player.on('ready', (event) => {
	if (content.properties.videoMuted) {
	  player.mute();
	}
      });

      player.on('stateChange', (event) => {
	this.playerState = event.data;
      });
    } else if (videoMeta.service === 'vimeo') {
      const loop = content.properties.videoLoop? true: false;

      player = new VimeoPlayer(playerDiv, {
	id: videoMeta.id,
	width: width,
	height: height,
	controls: false,
	loop,
      });
      player.on('loaded', () => {
	const iframe = playerDiv.getElementsByTagName("iframe")[0];
	if (iframe) {
	  iframe.style.width = "100%";
	  iframe.style.height = "100%";
	}
	if (content.properties.videoMuted) {
	  player.setVolume(0);
	}
      });
      player.on('playing', (event) => {
	this.playerState = 'playing';
      });
      player.on('pause', (event) => {
	this.playerState = 'pause';
      });
      player.on('ended', (event) => {
	this.playerState = 'ended';
      });
    }
    return player;
  }
}

export default EmbedContentObject;
