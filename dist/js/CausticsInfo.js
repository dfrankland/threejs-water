/* 
 * sydneyzh 2016
 */

function CausticsInfo(params){

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

  this.targetOut = new THREE.WebGLRenderTarget( w, h, targetOptions);

  // debug, display the texture

  if (this.debug === true){

    this.scene = new THREE.Scene();

    this.finalMaterial =  new THREE.MeshBasicMaterial({map: null});

    this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( w, h, 1, 1), this.finalMaterial );

    this.scene.add(this.quad);

  }


  this.camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0, 1 );


  // buffer scene

  causticsShader.uniforms = {

    'u_LightDir': {type: 'v3', value: null},
    'u_CausticTex': {type: 't', value: null},
    'u_WaterInfoTexture': {type: 't', value: null},
    'u_PoolHeight': {type: 'f', value: 0.0}

  }; 

  this.pCaustics = new ShaderPass(causticsShader, w, h);
  this.pCaustics.bufferMaterial.extensions.derivatives = true

}

CausticsInfo.prototype.render1 = function(waterInfoTexture){ // render once

  this.pCaustics.updateUniform('u_WaterInfoTexture', waterInfoTexture);

  this.pCaustics.regularRender(this.renderer, this.camera, this.targetOut);

  if (this.debug === true){

    this.quad.material.map = this.targetOut.texture;
    this.renderer.render( this.scene, this.camera );

  }

  // output the texture ...
  return this.targetOut.texture;
  
};


