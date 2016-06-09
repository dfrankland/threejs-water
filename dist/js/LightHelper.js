/* 
 * sydneyzh 2016
 * v0.2
 */

// use gui: call lightHelper.update() in the render loop

// render the lightHelper obj: renderer.render(lightHelper.scene, camera);

function LightHelper(params){

  var gui = params.gui || false;
  this.logDir = params.logDir || false;
  this.presets = params.presets || false;
  
  this.qt = new THREE.Quaternion();

  this.right = new THREE.Vector3(1, 0, 0);
  this.up = new THREE.Vector3(0, 1, 0);
  this.front = new THREE.Vector3(0, 0, 1);

  this.direction = new THREE.Vector3().copy(this.front);


  // obj

  var material = new THREE.MeshNormalMaterial();

  var mesh1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 30), material);
  var mesh2 = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), material);
  
  mesh2.position.z = 14;
  
  this.obj = new THREE.Object3D();

  this.obj.add(mesh1);
  this.obj.add(mesh2);

  this.obj.quaternion.copy(this.qt);


  this.scene = new THREE.Scene();
  
  this.scene.add(this.obj);


  // gui

  if (gui){

    if (this.presets){

      this.preset = 0;

      this.guiCtrl = { 

        light_rotate_x: this.presets[this.preset][0],
        light_rotate_y: this.presets[this.preset][1]

      };

      gui.add(this, 'switchLightPreset'); // button

    } else{ // free control

      this.guiCtrl = { 

        light_rotate_x: 0.85, // [0, PI]
        light_rotate_y: 0.15 // [-PI/2, PI/2]

      };

      gui.add(this.guiCtrl, 'light_rotate_x', 0.0, 3.14).step(0.05);// slider
      gui.add(this.guiCtrl, 'light_rotate_y', - 1.68, 1.68).step(0.05);

    }

  } else{ // no gui

    this.multiplyRotation(this.right, 0.85); 
    this.multiplyRotation(this.up, 0.15); 

  }

  this.counter = 0;
  
}

LightHelper.prototype.changeLightDirection = function(direction){ // no gui

  if (!direction || direction.x === undefined || direction.y === undefined)
    return console.log("changeLightDirection: invalid parameter.");

  var qx = (new THREE.Quaternion()).setFromAxisAngle(this.right, direction.x);
  var qy = (new THREE.Quaternion()).setFromAxisAngle(this.up, direction.y);
  
  this.qt.copy(new THREE.Quaternion().multiply(qx).multiply(qy));

  this.direction.copy(new THREE.Vector3(0,0,1).applyQuaternion(this.qt)).normalize();

  if (this.obj){

    this.obj.quaternion.copy(this.qt);

  }
}

LightHelper.prototype.multiplyRotation = function(axis, angle){

  var q = (new THREE.Quaternion()).setFromAxisAngle(axis, angle);

  this.qt.multiply(q);

  this.direction.copy(new THREE.Vector3(0,0,1).applyQuaternion(this.qt)).normalize();
  
  if (this.obj){

    this.obj.quaternion.copy(this.qt);

  }
}

LightHelper.prototype.switchLightPreset = function(){

  this.preset ++;

  this.preset = this.preset % this.presets.length;

  this.guiCtrl.light_rotate_x = this.presets[this.preset][0];
  this.guiCtrl.light_rotate_y = this.presets[this.preset][1];

}

LightHelper.prototype.guiUpdate = function(){

  if (!this.guiCtrl) return;

  this.changeLightDirection({

    x: this.guiCtrl.light_rotate_x, 
    y: this.guiCtrl.light_rotate_y

  });
}

LightHelper.prototype.update = function(){

  if (this.guiCtrl){

    this.guiUpdate();

  } 

  if (this.logDir){

    if (this.counter % 60 === 0){

      this.logDirection();
      this.counter = 0;

    }

    this.counter ++;

  }
}

LightHelper.prototype.logDirection = function(){

  var x = Number((this.direction.x).toFixed(2));
  var y = Number((this.direction.y).toFixed(2));
  var z = Number((this.direction.z).toFixed(2));

  console.log("Light direction: " + x + " " + y + " " + z);

}