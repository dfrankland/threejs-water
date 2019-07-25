/*
 * sydneyzh 2016
 */

function ShaderPass(shader, w, h){

  this.bufferScene = new THREE.Scene();

  this.bufferMaterial = new THREE.ShaderMaterial(shader);

  this.bufferScene.add(new THREE.Mesh( new THREE.PlaneGeometry( w, h, w, h), this.bufferMaterial )); // causticsShader needs vertex positions(segments)

}

ShaderPass.prototype.render = function(renderer, camera, tIn, tOut, texUniformName){

  this.updateUniform(texUniformName, tIn.texture);

  renderer.setRenderTarget(tOut);
  renderer.render(this.bufferScene, camera);
  renderer.setRenderTarget(null);

};

ShaderPass.prototype.regularRender = function(renderer, camera, tOut){

  renderer.setRenderTarget(tOut);
  renderer.render(this.bufferScene, camera);
  renderer.setRenderTarget(null);

};

ShaderPass.prototype.updateUniform = function(name, value){

  this.bufferMaterial.uniforms[name].value = value;

};
