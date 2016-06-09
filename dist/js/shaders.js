/* 
 * sydneyzh 2016
 */


var waterWidth = 128; // for waterShader
var shadowColor = 'vec3(0.34, 0.43, 0.5)';
var waterColor = 'vec3(0.86, 0.96, 0.99)';
var underWaterDim = 0.6;

// The rgba data in the WaterInfoTexture is 
// (position.y, velocity.y, normal.x, normal.z)

var waterInfoShader = {
  vertexShader: [
    'varying vec2 v_Uv;',
      'void main() {',
      'v_Uv = uv;',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}\n'].join('\n'),
  //
  fragmengtShaders: {
    dropShader:[
    'const float PI = 3.141592653589793;',
    'uniform sampler2D u_Texture;',
    'uniform vec2 u_Center;',
    'uniform float u_Radius;',
    'uniform float u_Strength;',
    'varying vec2 v_Uv;',
    'void main() {',
      'vec4 info = texture2D(u_Texture, v_Uv);',
      'float drop = max(0.0, 1.0 - length(u_Center - v_Uv) / u_Radius);',
      'drop = 0.5 - cos(drop * PI) * 0.5;',
      'info.r += drop * u_Strength;',
      'gl_FragColor = info;',
    '}\n'
    ].join('\n'),
    //
    stepShader: [
    'uniform sampler2D u_Texture;',
    'uniform vec2 u_Delta;',
    'varying vec2 v_Uv;',
    'void main() {',
      'vec4 info = texture2D(u_Texture, v_Uv);',
      'vec2 dx = vec2(u_Delta.x, 0.0);',
      'vec2 dy = vec2(0.0, u_Delta.y);',
      'float average = (texture2D(u_Texture, v_Uv - dx).r + texture2D(u_Texture, v_Uv - dy).r + texture2D(u_Texture, v_Uv + dx).r + texture2D(u_Texture, v_Uv + dy).r) * 0.25;',
      'info.g += (average - info.r) * 2.0;',
      'info.g *= 0.995;',
      'info.r += info.g;',
      'gl_FragColor = info;',
    '}\n'
    ].join('\n'),
    //
    normalShader: [
    'uniform sampler2D u_Texture;',
    'uniform vec2 u_Delta;',
    'varying vec2 v_Uv;',
    'void main() {',
      'vec4 info = texture2D(u_Texture, v_Uv);',
      'vec3 dx = vec3(u_Delta.x, texture2D(u_Texture, vec2(v_Uv.x + u_Delta.x, v_Uv.y)).r - info.r, 0.0);',
      'vec3 dy = vec3(0.0, texture2D(u_Texture, vec2(v_Uv.x, v_Uv.y + u_Delta.y)).r - info.r, u_Delta.y);',
      'info.ba = normalize(cross(dy, dx)).xz;',
      'gl_FragColor = info;',
    '}\n'
    ].join('\n')
  }
};


// helper functions

var intersectCube = [
  'vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {',
    'vec3 t1 = (cubeMin - origin) / ray;',
    'vec3 t2 = (cubeMax - origin) / ray;',
    //
    'vec3 ta = min(t1, t2);',
    'vec3 tb = max(t1, t2);',
    //
    'float tminxy = max(ta.x, ta.y);',
    'float tmaxxy = min(tb.x, tb.y);',
    //
    'float tmin = max(tminxy, ta.z);',
    'float tmax = min(tmaxxy, tb.z);',
    //
    'return vec2(tmin, tmax);',
  '}\n'
].join('\n');

var getUv = [
  'vec2 getUv(vec2 pos, float maxWidth, float maxHeight){',
    'vec2 newPos;',
    'newPos.x = (pos.x + maxWidth / 2.0) / maxWidth;',
    'newPos.y = (pos.y + maxHeight / 2.0) / maxHeight;',
    'return newPos;',
  '}\n'
].join('\n');

var getWallColor = [ // for the waterShaders
  'vec3 getWallColor(vec3 worldPos, vec3 ray, vec3 lightDir){',
    'vec3 color;',
    'vec3 faceNormal;',
    //
    'vec2 t = intersectCube(worldPos, ray, vec3(-WATER_WIDTH / 2.0, -u_PoolHeight, -WATER_WIDTH / 2.0), vec3(WATER_WIDTH / 2.0, 0.0, WATER_WIDTH / 2.0));',
    'vec3 hit = worldPos + t.y * ray;',
    //
    'if (WATER_WIDTH / 2.0 - abs(hit.x) <= 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.yz, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(1.0, 0.0, 0.0);',
    '} else if(WATER_WIDTH / 2.0 - abs(hit.z) <= 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.xy, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(0.0, 0.0, 1.0);',
    '} else if(hit.y <= -u_PoolHeight + 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.xz, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(0.0, 1.0, 0.0);',
    '} else {', // fallback
      'color = vec3(1.0);',
      'faceNormal = vec3(0.0, 1.0, 0.0);',
    '}',
    //
    'float diffuse = dot(faceNormal, u_LightDir);',
    'diffuse = 0.3 * ((diffuse >= 0.0)? 1.0 : 0.0) * diffuse + 0.7;',
    //
    // shadow
    'vec2 t2 = intersectCube(hit, -u_LightDir, vec3(-WATER_WIDTH / 2.0, -u_PoolHeight, -WATER_WIDTH / 2.0), vec3(WATER_WIDTH / 2.0, 0.0, WATER_WIDTH / 2.0));',
    'vec3 inverseHit = hit - t2.y * u_LightDir;',
    'vec3 lit = (inverseHit.y < 0.0) ? SHADOW_COLOR: vec3(1.0, 1.0, 1.0);',
    //
    // caustics
    'vec2 causticsUv = getUv((hit.xz - hit.y * lightDir.xz / lightDir.y), WATER_WIDTH, WATER_WIDTH);',
    'causticsUv.y = 1.0 - causticsUv.y;',
    'float caustics = texture2D(u_CausticTex, causticsUv).r;',
    'float litCaustics = pow(lit.x, 2.0);',
    //
    'color *= diffuse * WATER_COLOR * (lit * 0.8 + litCaustics * caustics * 0.8);',
    'return color;',
  '}\n'
].join('\n');

var getWallColor2 = [ // for the cubeShader
  'vec4 getWallColor2(vec3 worldPos, vec3 ray, vec3 lightDir){',
    'vec3 color;',
    'vec3 faceNormal;',
    //
    'vec2 t = intersectCube(worldPos, ray, vec3(-WATER_WIDTH / 2.0, -u_PoolHeight, -WATER_WIDTH / 2.0), vec3(WATER_WIDTH / 2.0, 0.0, WATER_WIDTH / 2.0));',
    'vec3 hit = worldPos + t.y * ray;',
    //
    'if (WATER_WIDTH / 2.0 - abs(hit.x) <= 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.yz, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(1.0, 0.0, 0.0);',
    '} else if(WATER_WIDTH / 2.0 - abs(hit.z) <= 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.xy, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(0.0, 0.0, 1.0);',
    '} else if(hit.y <= -u_PoolHeight + 0.1){',
      'color = (texture2D(u_TileTexture, getUv(hit.xz, WATER_WIDTH, WATER_WIDTH))).xyz;',
      'faceNormal = vec3(0.0, 1.0, 0.0);',
    '} else{',
      'return vec4(0.0);', // transparent
    '}',
    //
    'float diffuse = dot(faceNormal, u_LightDir);',
    'diffuse = 0.3 * ((diffuse >= 0.0)? 1.0 : 0.0) * diffuse + 0.7;',
    //
    // shadow
    'vec2 t2 = intersectCube(hit, -u_LightDir, vec3(-WATER_WIDTH / 2.0, -u_PoolHeight, -WATER_WIDTH / 2.0), vec3(WATER_WIDTH / 2.0, 0.0, WATER_WIDTH / 2.0));',
    'vec3 inverseHit = hit - t2.y * u_LightDir;',
    'vec3 lit = (inverseHit.y < 0.0) ? SHADOW_COLOR: vec3(1.0, 1.0, 1.0);',
    //
    // caustics
    'vec2 causticsUv = getUv((hit.xz - hit.y * lightDir.xz / lightDir.y), WATER_WIDTH, WATER_WIDTH);',
    'causticsUv.y = 1.0 - causticsUv.y;',
    'float caustics = texture2D(u_CausticTex, causticsUv).r;',
    'float litCaustics = pow(lit.x, 2.0);',
    //
    'color *= UNDERWATER_DIM * diffuse * WATER_COLOR * (lit * 0.8 + litCaustics * caustics * 0.8);',
    'return vec4(color, 1.0);',
  '}\n'
].join('\n');


// water shader

var waterShaders = new Array(2);

var vertexPrefix = [
  'uniform sampler2D u_WaterInfoTexture;',
  //
  'varying vec3 v_WorldPos;',
  'varying vec2 v_Uv;'
].join('\n');

var fragmentPrefix = [
  'precision mediump float;',
  //
  'const float IOR_AIR = 1.0;',
  'const float IOR_WATER = 1.33;',
  'const float WATER_WIDTH = ' + waterWidth + '.0;',
  'const vec3 SHADOW_COLOR = ' + shadowColor + ';',
  'const vec3 WATER_COLOR = ' + waterColor + ';',
  //
  'uniform sampler2D u_WaterInfoTexture;',
  'uniform sampler2D u_CausticTex;',
  'uniform sampler2D u_TileTexture;',
  'uniform samplerCube u_SkyTexture;',
  'uniform vec3 u_LightDir;',
  'uniform float u_PoolHeight;',
  //
  'varying vec3 v_WorldPos;',
  'varying vec2 v_Uv;'
].join('\n');

fragmentPrefix += getUv + intersectCube + getWallColor;


// under water

waterShaders[1] = {};

waterShaders[1].vertexShader = vertexPrefix + [
  'void main() {',
    'vec4 info = texture2D(u_WaterInfoTexture, uv);',
    '/* switch to xz plane */',
    'vec4 worldPos = modelMatrix * vec4(position + vec3(0.0, 0.0, info.r), 1.0);',
    //
    'gl_Position = projectionMatrix * viewMatrix * worldPos;',
    //
    'v_WorldPos = worldPos.xyz;',
    'v_Uv = uv;',
  '}\n'
].join("\n");

waterShaders[1].fragmentShader = fragmentPrefix + [
  'void main() {',
    //
    'vec4 info = texture2D(u_WaterInfoTexture, v_Uv);',
    'vec2 myUv = v_Uv;',
    //
    '/* make water look more "peaked" */',
    'for (int i = 0; i < 10; i++) {',
      'myUv += info.ba * 0.005;',
      'info = texture2D(u_WaterInfoTexture, myUv);',
    '}',
    //
    'vec3 eyeRay = normalize(v_WorldPos - cameraPosition);',
    'vec3 worldNormal = - vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);',
    //
    'float fresnel = mix(0.5, 1.0, pow(1.0 + dot(worldNormal, eyeRay), 3.0));',
    //
    'vec3 reflectRay = reflect(eyeRay, worldNormal);',
    'vec3 refractRay = refract(eyeRay, worldNormal, IOR_WATER / IOR_AIR);',
    //
    'vec3 refractLight = refract(u_LightDir, worldNormal, IOR_AIR / IOR_WATER);',
    //
    // reflect causticTex + tileTexture
    'vec3 reflectColor = (reflectRay.y <= 0.0) ? getWallColor(v_WorldPos, reflectRay, refractLight) : textureCube(u_SkyTexture, vec3(-reflectRay.x, reflectRay.yz)).rgb;',
    // refract textureCube
    'vec3 refractColor = textureCube(u_SkyTexture, vec3(-refractRay.x, refractRay.yz)).rgb;',
    //
    'gl_FragColor = vec4(mix(reflectColor, refractColor, (1.0 - fresnel) * length(refractRay)), 1.0);',
  '}\n'
].join("\n");


// above water

waterShaders[0] = {};

waterShaders[0].vertexShader = waterShaders[1].vertexShader;

waterShaders[0].fragmentShader = fragmentPrefix + [
  'void main() {',
    //
    'vec4 info = texture2D(u_WaterInfoTexture, v_Uv);',
    'vec2 myUv = v_Uv;',
    //
    '/* make water look more "peaked" */',
    'for (int i = 0; i < 10; i++) {',
      'myUv += info.ba * 0.005;',
      'info = texture2D(u_WaterInfoTexture, myUv);',
    '}',
    //
    'vec3 eyeRay = normalize(v_WorldPos - cameraPosition);',
    'vec3 worldNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);',
    //
    'float fresnel = mix(0.25, 1.0, pow(1.0 + dot(worldNormal, eyeRay), 3.0));',
    //
    'vec3 reflectRay = reflect(eyeRay, worldNormal);',
    'vec3 refractRay = refract(eyeRay, worldNormal, IOR_AIR/ IOR_WATER);',
    //
    'vec3 refractLight = refract(u_LightDir, worldNormal, IOR_AIR / IOR_WATER);',
    //
    // refract causticTex + tileTexture
    'vec3 refractColor = getWallColor(v_WorldPos, refractRay, refractLight);',
    // reflect textureCube
    'vec3 reflectColor = (reflectRay.y >= 0.0) ? textureCube(u_SkyTexture, vec3(-reflectRay.x, reflectRay.yz)).rgb : getWallColor(v_WorldPos, reflectRay, refractLight);',
    //
    'gl_FragColor = vec4(mix(refractColor, reflectColor, fresnel), 1.0);',
  '}\n'
].join("\n");


// cube shader

var cubeShader = {};

cubeShader.vertexShader = [
  'precision mediump float;',
  //
  'varying vec3 v_WorldPos;',
  'uniform float u_PoolHeight;',
  //
  'void main(){',
    'vec4 worldPos = modelMatrix * vec4(position, 1.0);',
    'worldPos.y *= u_PoolHeight;',
    'gl_Position = projectionMatrix * viewMatrix * worldPos;',
    'v_WorldPos = worldPos.xyz;',
  '}\n',
].join('\n');

cubeShader.fragmentShader = [
  'precision mediump float;',
  //
  'const float IOR_AIR = 1.0;',
  'const float IOR_WATER = 1.33;',
  'const float WATER_WIDTH = ' + waterWidth + '.0;',
  'const vec3 SHADOW_COLOR = ' + shadowColor + ';',
  'const vec3 WATER_COLOR = ' + waterColor + ';',
  'const float UNDERWATER_DIM = ' + underWaterDim + ';',
  //
  'uniform sampler2D u_WaterInfoTexture;',
  'uniform sampler2D u_CausticTex;',
  'uniform sampler2D u_TileTexture;',
  'uniform vec3 u_LightDir;',
  'uniform float u_PoolHeight;',
  //
  'varying vec3 v_WorldPos;\n'
].join('\n') + getUv + intersectCube + getWallColor2 + [
  'void main(){',
    'vec4 info = texture2D(u_WaterInfoTexture, getUv(v_WorldPos.xz, WATER_WIDTH, WATER_WIDTH));',
    'vec3 worldNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);',
    //
    'vec3 refractLight = refract(u_LightDir, worldNormal, IOR_AIR / IOR_WATER);',
    'vec3 eyeRay = v_WorldPos - cameraPosition;',
    'vec4 wallColor = getWallColor2(v_WorldPos, eyeRay, refractLight);',
    'gl_FragColor = wallColor;',
  '}\n'
].join('\n');


// causticsTex

var causticsShader = {
  vertexShader: 
    'precision mediump float;\n'+ intersectCube + [
    'const float IOR_AIR = 1.0;',
    'const float IOR_WATER = 1.333;',
    'const float WATER_WIDTH = ' + waterWidth + '.0;',
    //
    'uniform vec3 u_LightDir;',
    'uniform sampler2D u_WaterInfoTexture;',
    'uniform float u_PoolHeight;',
    //
    'varying vec3 v_OldPos;',
    'varying vec3 v_NewPos;',
    //
    'vec3 getHitPosition(vec3 origin, vec3 ray){',
      'vec2 t = intersectCube(origin, ray, vec3(-WATER_WIDTH / 2.0, -u_PoolHeight, -WATER_WIDTH / 2.0), vec3(WATER_WIDTH / 2.0, 0.0, WATER_WIDTH / 2.0));',
      'return origin + ray * t.y;',
    '}',
    //
    'vec3 project(vec3 pos, vec3 light){',
      'vec2 delta = (-u_PoolHeight - pos.y) / light.y * light.xz;',
      'pos.xz += delta;',
      'pos.y = 0.0;',
      'return pos;',
    '}',
    //
    'void main() {',
      'vec4 info = texture2D(u_WaterInfoTexture, uv);',
      'vec3 waveNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);',
      //
      'vec3 refractLight0 = refract(u_LightDir, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);',
      'vec3 refractLight1 = refract(u_LightDir, waveNormal, IOR_AIR / IOR_WATER);',
      //
      // world coord
      'vec3 worldPos = vec3(position.x, 0.0, position.y);',
      'vec3 hit0 = getHitPosition(worldPos, refractLight0);',
      'vec3 hit1 = getHitPosition(worldPos + vec3(0.0, info.r, 0.0), refractLight1);',
      //
      // project to xz plane
      'v_OldPos = project(hit0, refractLight0);',
      'v_NewPos = project(hit1, refractLight1);',

      'gl_Position =  projectionMatrix * modelViewMatrix * vec4((v_NewPos.xz + refractLight0.xz / refractLight0.y), 0.0, 1.0);',
    '}\n'
  ].join('\n'),
  //
  fragmentShader: [
    'precision mediump float;',
    //
    'uniform vec3 u_LightDir;',
    'uniform float u_PoolHeight;',
    //
    'varying vec3 v_OldPos;',
    'varying vec3 v_NewPos;',
    //
    'void main() {',
      'float oldArea = length(dFdx(v_OldPos)) * length(dFdy(v_OldPos));',
      'float newArea = length(dFdx(v_NewPos)) * length(dFdy(v_NewPos));',
      //
      // make sure that only lit areas in the texture > 0.0
      'float r = clamp((oldArea - newArea) / oldArea, 0.0, 1.0);',
      'gl_FragColor = vec4(r, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n')
};
