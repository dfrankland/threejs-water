/* 
 * sydneyzh 2016
 */

function WaterInfo(params){

  this.renderer = params.renderer;

  // texture dimension

  var w = params.w;
  var h = params.h;

  this.debug = params.debug;

  var targetOptions = {

    minFilter: THREE.LinearFilter, 
    magFilter: THREE.LinearFilter, 
    type: THREE.FloatType,
    stencilBuffer: false,
    depthBuffer: false

  };

  this.targetIn = new THREE.WebGLRenderTarget( w, h, targetOptions);
  this.targetOut = new THREE.WebGLRenderTarget( w, h, targetOptions);

  // debug, display the texture

  if (this.debug === true){

    this.scene = new THREE.Scene();

    this.finalMaterial =  new THREE.MeshBasicMaterial({map: null});

    this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( w, h, 1, 1), this.finalMaterial );

    this.scene.add(this.quad);

  }


  this.camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0, 1 );


  this.delta = new THREE.Vector2(1 / w, 1 / h);


  // buffer scene

  var dropShader = {

    uniforms: {

      'u_Texture': {type: 't', value: null}, 
      'u_Center': {type: 'v2', value: new THREE.Vector2(0, 0)},
      'u_Radius': {type: 'f', value: 0.0},
      'u_Strength': {type: 'f', value: 0.0}

    },

    vertexShader: waterInfoShader.vertexShader,
    fragmentShader: waterInfoShader.fragmengtShaders.dropShader

  };

  var stepShader = {

    uniforms: {

      'u_Texture': {type: 't', value: null},
      'u_Delta': {type: 'v2', value: this.delta}  

    },

    vertexShader: waterInfoShader.vertexShader,
    fragmentShader: waterInfoShader.fragmengtShaders.stepShader

  };

  var normalShader = {

    uniforms: {

      'u_Texture': {type: 't', value: null},
      'u_Delta': {type: 'v2', value: this.delta}
    },
    vertexShader: waterInfoShader.vertexShader,
    fragmentShader: waterInfoShader.fragmengtShaders.normalShader

  };

  this.pDrop = new ShaderPass(dropShader, w, h);
  this.pStep = new ShaderPass(stepShader, w, h);
  this.pNormal = new ShaderPass(normalShader, w, h);

}

WaterInfo.prototype.render1 = function(){ // render once

  this.swapTargets();

  this.pStep.render(this.renderer, this.camera, this.targetIn, this.targetOut, 'u_Texture');

  this.swapTargets();

  this.pNormal.render(this.renderer, this.camera, this.targetIn, this.targetOut, 'u_Texture');

  if (this.debug === true){

    this.quad.material.map = this.targetOut.texture;
    this.renderer.render( this.scene, this.camera );

  }

  // output the texture ...
  return this.targetOut.texture;

};

WaterInfo.prototype.swapTargets = function(){

  var t = this.targetIn;
  this.targetIn = this.targetOut;
  this.targetOut = t;

};

WaterInfo.prototype.addDrop = function(dropCenter, dropRadius, dropStrength){

  this.pDrop.updateUniform('u_Center', dropCenter);
  this.pDrop.updateUniform('u_Radius', dropRadius);
  this.pDrop.updateUniform('u_Strength', dropStrength);
    
  this.pDrop.render(this.renderer, this.camera, this.targetIn, this.targetOut, 'u_Texture');
  
  this.swapTargets();
  
};