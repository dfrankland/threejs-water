/* 
 * sydneyzh 2016
 */

var canvasWidth = 800;
var canvasHeight = 450;

var waterInfoWidth = waterWidth;
var waterInfoHeight = waterInfoWidth;

var causticsInfoWidth = 4 * waterInfoWidth;
var causticsInfoHeight = causticsInfoWidth;

var waterHeight = waterWidth;
var poolHeight;


var useGui = true;

var showLightHelper = false;

var lightDirPresets = [

  [0.85, 0.15],
  [1.34, -0.14],
  [1.81, -0.41]
];

var logDir = false; // log light direction vector

var showStats = true;

var showRaycastHelper = false;


window.onload = function(){
  
  if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

  app = new App();
  app.startAnim();

};

var App = function(){

  this.container = document.getElementById("container");

  this.gui;

  if (useGui === true){

    this.initGui();
  }

  // renderer

  this.renderer = new THREE.WebGLRenderer();

  this.renderer.setClearColor( 0x000000, 1);
  this.renderer.setSize(canvasWidth, canvasHeight);
  this.renderer.antialias = true;
  this.renderer.autoClear = false;

  this.container.appendChild(this.renderer.domElement);


  // buffer scenes

  // waterInfo texture

  this.waterInfo = new WaterInfo({

    renderer: this.renderer, 
    w: waterInfoWidth, 
    h: waterInfoHeight, 
    debug: false

  });

  // caustics texture

  this.causticsInfo = new CausticsInfo({

    renderer: this.renderer, 
    w: causticsInfoWidth, 
    h: causticsInfoHeight, 
    debug: false

  });

  if (this.waterInfo.debug === true || this.causticsInfo.debug === true){

    this.renderer.setSize(waterWidth * 2, waterWidth * 2);

  }


  // lightHelper

  this.lightHelper = new LightHelper({

    gui: useGui && this.gui,
    logDir: logDir,
    presets: lightDirPresets

  });

  if (this.lightHelper.obj){

    this.lightHelper.obj.position.y = 50;

  }


  // real scene

  this.scene = new THREE.Scene();
  this.scene.matrixAutoUpdate = false;


  // camera

  this.camera = new THREE.PerspectiveCamera( 45, canvasWidth / canvasHeight, 1, 100000 );

  this.camera.position.z = 280;
  this.camera.position.y = 100;


  // controls

  this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

  this.controls.enableDamping = true;
  this.controls.dampingFactor = 0.25;
  this.controls.enableZoom = true;


  // skyTexture

  // this.sceneCube = new THREE.Scene();

  var path = "./img/skybox/";
  var format = '.jpg';
  var urls = [

      path + 'posx' + format, path + 'negx' + format,
      path + 'posy' + format, path + 'negy' + format,
      path + 'posz' + format, path + 'negz' + format

  ];

  var skyTexture = new THREE.CubeTextureLoader().load( urls );
  skyTexture.format = THREE.RGBFormat;


  // tileTexture

  var tileTexture = new THREE.TextureLoader().load('./img/tile.jpg');
  tileTexture.format = THREE.RGBFormat;


  // water surface

  this.waterMaterials = [];

  for (var i = 0; i < 2; i ++){

    waterShaders[i].uniforms ={

      'u_TileTexture': {type: 't', value: tileTexture},
      'u_SkyTexture': {type: 't', value: skyTexture},
      'u_WaterInfoTexture': {type: 't', value: null},
      'u_CausticTex': {type: 't', value: null},
      'u_LightDir': {type: 't', value: null},
      'u_PoolHeight': {type: 't', value: null}

    };

    this.waterMaterials[i] = new THREE.ShaderMaterial(waterShaders[i]);

    // i == 1, underwater; i == 0, above water

    this.waterMaterials[i].side = i ? THREE.BackSide: THREE.FrontSide;

  }

  var waterPlane = new THREE.PlaneGeometry(waterWidth, waterHeight, 1,1);

  this.waterMeshes = [];

  for (var i = 0; i < 2; i ++){

    this.waterMeshes[i] = new THREE.Mesh(waterPlane, this.waterMaterials[i]);

    this.waterMeshes[i].rotation.x = 3 / 2 * Math.PI; // front to top, back to bottom

    this.scene.add(this.waterMeshes[i]);

  }


  // water cube

  cubeShader.uniforms = {

      'u_TileTexture': {type: 't', value: tileTexture},
      'u_WaterInfoTexture': {type: 't', value: null},
      'u_CausticTex': {type: 't', value: null},
      'u_LightDir': {type: 't', value: null},
      'u_PoolHeight': {type: 't', value: null}

  };

  this.cubeMaterial = new THREE.ShaderMaterial(cubeShader);
  this.cubeMaterial.transparent = true;

  var cubeMesh = new THREE.Mesh(new THREE.OpenBoxBufferGeometry(waterWidth,1,waterHeight), this.cubeMaterial);
  cubeMesh.position.y = - 0.5;

  this.scene.add(cubeMesh);


  // stats

  if (showStats){

    this.stats = new Stats();

    this.container.appendChild( this.stats.dom );

  }


  // raycaster

  this.raycaster = new THREE.Raycaster();

  this.mouse = new THREE.Vector2();

  this.container.addEventListener('click', this.onMouseClick.bind(this), false);


  // raycast helper

  var geometry = new THREE.CylinderGeometry( 0, 4, 6, 3 );

  this.raycasterOffsetY = 4;

  this.raycastHelper = new THREE.Mesh( geometry, new THREE.MeshNormalMaterial());

  this.raycastHelper.position.y += this.raycasterOffsetY;

  this.scene.add( this.raycastHelper );

  this.raycastHelper.visible = showRaycastHelper;


  // init drops

  this.addRandomDrops();

};

App.prototype.addDrop = function(center, radius, strength){

  this.waterInfo.addDrop(center, radius, strength);

}

App.prototype.addRandomDrops = function(){

  for (var i = 0; i < 10; i++) {

    // params: center, radius in uv coord, strength [0, 1]

    this.addDrop(new THREE.Vector2(getRandomArbitrary(0.0, 0.5), getRandomArbitrary(0.0, 0.5)), 0.1, (i & 1) ? - 0.1 : 0.1);

  }
}

function getRandomArbitrary(min, max) {

  return Math.random() * (max - min) + min;

}

App.prototype.toggleLightHelper = function(){

  showLightHelper = !showLightHelper;

}

App.prototype.startAnim = function(){

  this.render.call(this);

}

App.prototype.render = function(){

  requestAnimationFrame( this.render.bind(this) );

  this.controls.update(); 

  if (useGui){

    this.guiUpdate();

  } 
  
  this.lightHelper.update();

  this.update();

  if (showStats){

    this.stats.update();

  }
}

App.prototype.update = function(){

  this.renderer.clear();


  // waterInfoTexture

  this.waterInfoTexture = this.waterInfo.render1(); 


  // causticTex

  this.causticsInfo.pCaustics.updateUniform('u_LightDir', this.lightHelper.direction);
  this.causticsInfo.pCaustics.updateUniform('u_PoolHeight', poolHeight);

  this.causticTex = this.causticsInfo.render1(this.waterInfoTexture);


  // water surface

  for (var i = 0; i < 2; i ++){

    this.waterMaterials[i].uniforms['u_WaterInfoTexture'].value = this.waterInfoTexture;
    this.waterMaterials[i].uniforms['u_CausticTex'].value = this.causticTex;
    this.waterMaterials[i].uniforms['u_LightDir'].value = this.lightHelper.direction;
    this.waterMaterials[i].uniforms['u_PoolHeight'].value = poolHeight;

  }


  // water cube

  this.cubeMaterial.uniforms['u_WaterInfoTexture'].value = this.waterInfoTexture;
  this.cubeMaterial.uniforms['u_CausticTex'].value = this.causticTex;
  this.cubeMaterial.uniforms['u_LightDir'].value = this.lightHelper.direction;
  this.cubeMaterial.uniforms['u_PoolHeight'].value = poolHeight;


  // real scene

  if ( this.waterInfo.debug === false && this.causticsInfo.debug === false){

    this.renderer.render(this.scene, this.camera);

    if (showLightHelper){

      this.renderer.render(this.lightHelper.scene, this.camera);

    }
  }
}

App.prototype.initGui = function(){

  this.gui = new dat.GUI();

  this.guiCtrl = {

    'poolHeight': 60

  };

  var self = this;

  this.gui.add(self.guiCtrl, 'poolHeight', 10, 60).step(10);
  this.gui.add(self, 'addRandomDrops');
  this.gui.add(self, 'toggleRaycastHelper');
  this.gui.add(self, 'toggleLightHelper');

};

App.prototype.guiUpdate = function(){

  poolHeight = this.guiCtrl['poolHeight'];

};

App.prototype.toggleRaycastHelper = function(){

  showRaycastHelper = !showRaycastHelper;

  this.raycastHelper.visible = showRaycastHelper;

}

App.prototype.onMouseClick = function(event) {

  var rect = document.getElementsByTagName("canvas")[0].getBoundingClientRect();

  var canvasOffsetX = rect.left;
  var canvasOffsetY = rect.top;

  this.mouse.x = ((event.clientX - canvasOffsetX) / canvasWidth) * 2 - 1;
  this.mouse.y = - ((event.clientY - canvasOffsetY) / canvasHeight) * 2 + 1;

  this.raycaster.setFromCamera(this.mouse, this.camera);

  var intersects0 = this.raycaster.intersectObject(this.waterMeshes[0]);
  var intersects1 = this.raycaster.intersectObject(this.waterMeshes[1]);

  if (intersects0.length > 0) {

    var point = intersects0[0].point; // world position

    var aboveWater = true;

  } else if(intersects1.length > 0){

    var point = intersects1[0].point;

    var aboveWater = false;

  } else { return; }

  var center = new THREE.Vector2((point.x + waterWidth / 2) / waterWidth, (-point.z + waterHeight / 2) / waterHeight); // uv

  for (var i = 0; i < 2; i++) {

    this.addDrop(center, 0.1, (i & 1) ? - 0.2 : 0.2);

  }

  if (showRaycastHelper){

    this.raycastHelper.position.copy(point);
    this.raycastHelper.rotation.x = aboveWater ? 0 : Math.PI;
    this.raycastHelper.position.y += (aboveWater ? 1 : -1) * this.raycasterOffsetY;

  }
}