import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** DATA CONTRACT / CONFIDENCE
 * This module contains reusable construction recipes, not the house's floor plan.
 * The private, editable JSON supplies every room outline, wall, opening, floor
 * elevation, stair dimension, furnishing transform, roof and photo reference.
 * Room connections/counts marked owner-confirmed come from Rohan's description.
 * ALL numeric dimensions are estimates until measured. Window wall assignments,
 * the complete roof and unseen furnishings are assumptions, even when the
 * window/furniture style itself is supported by a photo. Preserve confidence,
 * notes, photoIds and stable room IDs when updating; add evidence, do not silently
 * turn an estimate into an observation. Never use AI-generated photos as geometry.
 * No plaintext plan/photo data belongs in the public repository.
 */
// Plan +X is the visitor's right and +Z goes into the house. In Three.js,
// a camera facing +Z has screen-right -X. Apply this adapter to geometry,
// viewpoints, labels and exports together; never mirror only one room.
export function planPointToWorld([x,y,z]) { return new THREE.Vector3(-x,y,z); }

export function validatePlan(plan) {
  if (!plan || plan.schemaVersion !== '1.0' || !Array.isArray(plan.rooms) || !Array.isArray(plan.walls)) throw new Error('Unsupported floor-plan format.');
  const ids=new Set();
  for(const room of plan.rooms){
    if(ids.has(room.id)||!Array.isArray(room.outline)||room.outline.length<3)throw new Error('Invalid room outline/ID.');
    ids.add(room.id);for(const p of room.outline)if(p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>250))throw new Error('Invalid room coordinate.');
  }
  for(const wall of plan.walls)for(const p of [wall.a,wall.b])if(p.some(v=>!Number.isFinite(v)))throw new Error('Invalid wall coordinate.');
  for(const floor of plan.floors)if(!Number.isFinite(floor.elevation)||floor.height<1.5||floor.height>10)throw new Error('Invalid floor elevation/height.');
  return plan;
}

export function buildHouse(input,{textures={}}={}) {
  const plan=validatePlan(input),root=new THREE.Group();root.name='RCG procedural house';root.scale.x=-1;
  const levels=new Map(),roofs=[],ceilings=[],pickables=[],labels=[],cutMaterials=[],materialCache=new Map();
  const floorById=new Map(plan.floors.map(f=>[f.level,f]));
  const roomById=new Map(plan.rooms.map(r=>[r.id,r]));
  const basic=(color,extra={})=>{
    const key=JSON.stringify([color,extra]);if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,...extra}));
    return materialCache.get(key);
  };
  const mat={wall:basic('#efede4'),trim:basic('#faf8ef'),wood:basic('#8c6344'),dark:basic('#303633'),metal:basic('#a7aaa4',{metalness:.55,roughness:.4}),glass:basic('#acced4',{transparent:true,opacity:.28,roughness:.2,depthWrite:false}),roof:basic('#624d3c'),brick:basic('#925c43')};
  // Surface-scale appearance is separate from confidence in geometry.
  for(const [material,kind,bump] of [[mat.wall,'plaster',.012],[mat.wood,'wood',.012],[mat.brick,'brick',.02],[mat.roof,'roof',.02]]){material.map=textures[kind]||null;material.bumpMap=textures[kind+'Bump']||null;material.bumpScale=bump;}
  mat.trim.roughness=.48;mat.metal.roughness=.27;mat.metal.metalness=.80;
  mat.glass=new THREE.MeshPhysicalMaterial({color:'#d5e2df',transparent:true,opacity:.30,roughness:.10,transmission:.12,thickness:.018,ior:1.48,depthWrite:false});
  const shadowMaterial=new THREE.MeshBasicMaterial({color:'#342c23',map:textures.contactShadow||null,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  function mesh(parent,geo,material,pos=[0,0,0]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,x,y,z,material=mat.wall){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,[x,y,z]);}
  function cylinder(parent,r1,r2,h,x,y,z,material=mat.wood,segments=10){return mesh(parent,new THREE.CylinderGeometry(r1,r2,h,segments),material,[x,y,z]);}
  function beam(parent,a,b,r,material=mat.wood){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);const m=mesh(parent,new THREE.CylinderGeometry(r,r,delta.length(),8),material,va.clone().add(vb).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
  function surface(parent,outline,y,material,depth=0){
    const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
    const geo=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);geo.rotateX(Math.PI/2);
    const m=mesh(parent,geo,material,[0,y,0]);m.castShadow=!!depth;return m;
  }
  const finishColors={carpet:'#c9c4b7',wood:'#ad8960',bathWood:'#bda88d',parquet:'#96734e',unknown:'#bcbcb3'};
  function floorMaterial(finish,color){const key='floor:'+finish+':'+color;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color:color||finishColors[finish]||'#c2c2b8',map:textures[finish]||null,bumpMap:textures[finish+'Bump']||null,bumpScale:finish==='carpet'?.018:.009,side:THREE.DoubleSide,roughness:finish==='carpet'?.98:.62}));return materialCache.get(key);}
  function clipped(material,level){const m=material.clone();cutMaterials.push({material:m,level});return m;}
  const wallMats=new Map();
  for(const floor of plan.floors){
    const group=new THREE.Group();group.name=`Floor ${floor.level}`;root.add(group);levels.set(floor.level,group);
    surface(group,floor.outline,floor.elevation,basic('#b0aa9e',{side:THREE.DoubleSide}),plan.parameters.slabThickness);
    wallMats.set(floor.level,Object.fromEntries(['wall','trim','glass'].map(k=>[k,clipped(mat[k],floor.level)])));
  }
  for(const room of plan.rooms){
    const floor=floorById.get(room.floor),group=new THREE.Group();group.name=`${room.id}: ${room.label}`;group.userData={roomId:room.id,confidence:room.confidence,photoIds:room.photoIds};levels.get(room.floor).add(group);
    const fm=surface(group,room.outline,floor.elevation+.012,floorMaterial(room.finish,room.finishColor));fm.userData.roomId=room.id;pickables.push(fm);
    if(room.kind!=='stairs'){
      const ceiling=surface(group,room.outline,floor.elevation+floor.height,basic('#e9e6dd',{side:THREE.DoubleSide}));ceiling.name=`Ceiling ${room.id}`;ceilings.push({mesh:ceiling,level:room.floor});
      // P15 shows a sloped office ceiling. This slope is an estimate, isolated
      // from the wall coordinates so later ceiling measurements are easy to apply.
      if(room.ceilingSlope){
        const pos=ceiling.geometry.attributes.position;
        const xs=room.outline.map(p=>p[0]),min=Math.min(...xs),max=Math.max(...xs);
        for(let i=0;i<pos.count;i++)pos.setY(i,-room.ceilingSlope.drop*(pos.getX(i)-min)/(max-min));pos.needsUpdate=true;ceiling.geometry.computeVertexNormals();
      }
    }
    if(room.kind!=='unknown')labels.push({room,position:new THREE.Vector3(room.center[0],floor.elevation+.12,room.center[1])});
    for(const f of room.furnishings||[])furnishing(group,f,floor.elevation);
  }
  const openings=new Map(plan.openings.map(o=>[o.id,o]));
  for(const wall of plan.walls){
    const floor=floorById.get(wall.floor),group=levels.get(wall.floor),wm=wallMats.get(wall.floor);
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx);
    const pieces=[];let cursor=0;
    const ops=wall.openingIds.map(id=>openings.get(id)).filter(Boolean).map(o=>({...o,start:Math.hypot(o.a[0]-wall.a[0],o.a[1]-wall.a[1]),end:Math.hypot(o.b[0]-wall.a[0],o.b[1]-wall.a[1])})).map(o=>({...o,start:Math.min(o.start,o.end),end:Math.max(o.start,o.end)})).sort((a,b)=>a.start-b.start);
    for(const o of ops){if(o.start>cursor)pieces.push([cursor,o.start,0,floor.height]);if(o.bottom>0)pieces.push([o.start,o.end,0,o.bottom]);if(o.top<floor.height)pieces.push([o.start,o.end,o.top,floor.height]);cursor=o.end;openingGeometry(o,group,wm,floor,yaw);}
    if(cursor<length)pieces.push([cursor,length,0,floor.height]);
    for(const [lo,hi,bottom,top] of pieces){if(hi-lo<.001||top-bottom<.001)continue;const t=(lo+hi)/(2*length);const m=box(group,hi-lo,top-bottom,plan.parameters.wallThickness,wall.a[0]+dx*t,floor.elevation+(bottom+top)/2,wall.a[1]+dz*t,wm.wall);m.rotation.y=yaw;m.name=wall.id;m.userData.confidence=wall.confidence;
      if(bottom===0){const b=box(group,hi-lo,.10,.185,wall.a[0]+dx*t,floor.elevation+.05,wall.a[1]+dz*t,wm.trim);b.rotation.y=yaw;}
    }
  }
  function openingGeometry(o,parent,wm,floor,yaw){
    const w=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]),h=o.top-o.bottom;
    const g=new THREE.Group();g.name=o.id;g.position.set((o.a[0]+o.b[0])/2,floor.elevation+o.bottom,(o.a[1]+o.b[1])/2);g.rotation.y=yaw;g.userData={confidence:o.confidence,photoIds:o.photoIds};parent.add(g);
    for(const sign of [-1,1])box(g,.055,h+.08,.23,sign*w/2,h/2,0,wm.trim);
    box(g,w+.1,.065,.23,0,h+.02,0,wm.trim);
    if(o.type==='window'){
      box(g,w+.1,.065,.24,0,.015,0,wm.trim);box(g,w-.06,h-.06,.018,0,h/2,0,wm.glass);
      box(g,.035,h,.065,0,h/2,0,wm.trim);box(g,w,.035,.065,0,h*.52,0,wm.trim);
      box(g,w+.18,.04,.30,0,-.015,.02,wm.trim);
      if(o.blinds||o.roomIds.includes('L')){const blinds=new THREE.Group();g.add(blinds);for(let i=0;i<6;i++)box(blinds,w,.035,.06,0,h-.07-i*.06,.12,mat.wood);}
    }else if(o.type==='door'){
      const hinge=new THREE.Group();hinge.position.x=-w/2+.025;hinge.rotation.y=Math.PI*.36;g.add(hinge);
      box(hinge,w-.06,h-.025,.04,(w-.06)/2,h/2,0,wm.trim);
      for(const yy of [h*.28,h*.72])box(hinge,w-.22,h*.35,.015,(w-.06)/2,yy,.028,wm.wall);
      cylinder(hinge,.035,.035,.045,w-.14,h*.48,.06,mat.metal,8).rotation.x=Math.PI/2;
    }
  }
  function furnishing(parent,f,elevation){
    const g=new THREE.Group();g.name=f.type;g.position.set(f.position[0],elevation,f.position[1]);g.rotation.y=f.rotation||0;g.userData={confidence:f.confidence,photoIds:f.photoIds||[],notes:f.notes};parent.add(g);
    const w=f.width||1.5,clothKey='cloth:'+(f.color||'#c0b6a3');if(!materialCache.has(clothKey))materialCache.set(clothKey,new THREE.MeshStandardMaterial({color:f.color||'#c0b6a3',map:textures.fabric||null,bumpMap:textures.fabricBump||null,bumpScale:.012,roughness:.96}));const cloth=materialCache.get(clothKey);
    if(['sofa','coffeeTable','diningTable','desk','officeDesk','bed','shelf','fridge','sideTable'].includes(f.type)){const shadow=mesh(g,new THREE.PlaneGeometry(w+ .25,f.type==='bed'?2.1:f.type==='sofa'?1.0:.75),shadowMaterial,[0,.022,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;}
    function leg(x,z,h=.55){box(g,.05,h,.05,x,h/2,z,mat.dark);}
    function table(topY=.74,width=w,depth=.75){box(g,width,.065,depth,0,topY,0,mat.wood);for(const x of [-width/2+.08,width/2-.08])for(const z of [-depth/2+.08,depth/2-.08])leg(x,z,topY);}
    function soft(w,h,d,x,y,z,material=cloth){return mesh(g,new RoundedBoxGeometry(w,h,d,2,Math.min(.055,h*.22,d*.15)),material,[x,y,z]);}
    function bottle(x,y,z,color='#c4d5c6',h=.18){cylinder(g,.035,.035,h,x,y+h/2,z,basic(color),8);cylinder(g,.018,.018,.028,x,y+h+.014,z,mat.dark,8);}
    function books(x,y,z,count=3){for(let i=0;i<count;i++)box(g,.27+i*.015,.025,.18,x+i*.015,y+i*.025,z,basic(['#e4dfd0','#465e62','#8f5d50'][i%3]));}
    if(f.type==='sofa'){
      if(f.style==='futon'){
        box(g,w,.09,.76,0,.36,0,mat.dark);soft(w,.18,.79,0,.49,-.02);soft(w,.68,.16,0,.78,.31);
        for(const x of [-w*.38,w*.38])for(const z of [-.28,.28])box(g,.045,.35,.045,x,.175,z,mat.dark);
        for(let i=0;i<6;i++)box(g,w-.12,.008,.009,0,.49,-.34+i*.12,basic('#8c2854'));
      }else{
        soft(w,.30,.86,0,.27,0);soft(w-.18,.48,.22,0,.62,.35);
        for(const x of [-w/2+.11,w/2-.11])soft(.23,.43,.87,x,.47,0);
        for(const x of [-w*.24,w*.24]){soft(w*.43,.13,.64,x,.49,-.04);soft(w*.43,.40,.12,x,.72,.24);}
        for(const x of [-w*.36,w*.36])box(g,.065,.10,.065,x,.05,-.22,mat.dark);
        if(f.blanket){soft(.65,.035,.65,-w*.19,.58,-.10,basic('#676878'));soft(.60,.35,.035,-w*.19,.41,-.39,basic('#676878'));}
      }
    }else if(f.type==='coffeeTable'||f.type==='diningTable'||f.type==='desk'||f.type==='officeDesk'){
      table(f.type==='coffeeTable'?.4:.76,w,f.type==='desk'?.55:.75);
      if(f.details&&f.type==='coffeeTable'){box(g,w-.12,.07,.60,0,.32,0,mat.wood);books(-.28,.45,.05,4);box(g,.20,.025,.08,.34,.45,-.08,mat.dark);}
      if(f.details&&f.type==='desk'){box(g,w,.045,.30,0,1.02,.20,mat.wood);box(g,w,.05,.46,0,.13,0,mat.wood);box(g,.43,.025,.15,.10,.81,0,mat.trim);box(g,.38,.025,.27,.15,1.07,.20,mat.dark);books(-.35,.17,0,2);cylinder(g,.095,.095,.025,-w*.34,1.06,.2,mat.metal);cylinder(g,.008,.008,.28,-w*.34,1.21,.2,mat.metal);cylinder(g,.09,.10,.18,-w*.34,1.40,.2,mat.trim);}
      if(f.details&&f.type==='diningTable'){cylinder(g,.18,.13,.07,.42,.83,0,mat.wood,14);for(let i=0;i<3;i++)mesh(g,new THREE.SphereGeometry(.055,8,5),basic('#d5b45c'),[.32+i*.07,.89,0]);}
      if(f.type==='diningTable')for(const x of [-.45,.45]){box(g,.4,.06,.4,x,.43,-.75,mat.dark);box(g,.4,.4,.045,x,.65,-.95,mat.dark);}
      if(f.type==='officeDesk'){
        for(const x of [-.42,.42]){beam(g,[x,.8,.15],[x,1.12,.1],.025,mat.trim);box(g,.7,.42,.04,x,1.2,.15,mat.dark);box(g,.62,.33,.018,x,1.2,.12,basic('#253e42'));}
        if(f.details){for(const x of [-.42,.42]){beam(g,[x,.82,.28],[x-.14,1.02,.18],.035,mat.trim);beam(g,[x-.14,1.02,.18],[x,1.2,.16],.035,mat.trim);}box(g,.49,.025,.16,0,.82,-.12,mat.trim);bottle(.65,.80,.17,'#ba7252',.13);}
        box(g,.55,.07,.09,0,.83,-.1,mat.trim);cylinder(g,.28,.28,.08,0,.5,-.65,mat.dark);box(g,.5,.5,.1,0,.8,-.86,mat.dark);
      }
    }else if(f.type==='shelf'){
      for(const x of [-w/2,w/2])box(g,.045,1.8,.35,x,.9,0,mat.dark);
      for(const y of [.1,.55,1,1.45,1.8])box(g,w,.045,.35,0,y,0,mat.dark);
      if(f.style==='kitchen'){for(let i=0;i<6;i++)bottle(-w*.36+i*.13,.58,0,['#879e66','#a5764d','#d9d3b4'][i%3],.18);for(let i=0;i<4;i++){const plate=cylinder(g,.15,.15,.015,-w*.28+i*.13,1.98,0,mat.metal,14);plate.rotation.x=Math.PI/2;}cylinder(g,.09,.10,.19,w*.28,1.55,0,mat.metal);}
      else for(let i=0;i<(f.details?13:5);i++)box(g,.025,.28,.22,-w*.35+i*.033,.72,0,basic(f.details?'#2c302f':i%2?'#c9c6b9':'#5c625a'));
    }else if(f.type==='kitchenRun'){
      box(g,w,.82,.68,0,.41,0,mat.trim);box(g,w+.04,.065,.73,0,.85,0,basic('#d5d1c6'));
      for(let x=-w/2+.35;x<w/2;x+=.65){box(g,.62,.7,.025,x,.43,-.355,mat.wall);box(g,.16,.022,.03,x,.69,-.38,mat.metal);}
      box(g,.72,.82,.71,-w*.32,.43,-.01,mat.dark);box(g,.54,.42,.025,-w*.32,.43,-.375,basic('#141c1a'));
      for(const x of [-w*.32-.18,-w*.32+.18])for(const z of [-.18,.18])cylinder(g,.105,.105,.02,x,.91,z,mat.dark,12);
      box(g,.90,.025,.48,.45,.896,0,mat.metal);box(g,.72,.028,.31,.45,.911,0,basic('#8c9a98'));beam(g,[.45,.91,.24],[.45,1.2,.24],.018,mat.metal);beam(g,[.45,1.2,.24],[.45,1.2,.03],.018,mat.metal);
      if(f.details){for(let i=0;i<5;i++)cylinder(g,.023,.023,.035,-w*.32-.24+i*.12,.72,-.40,mat.metal,8).rotation.x=Math.PI/2;for(let i=0;i<4;i++)bottle(.10+i*.15,.91,.22,['#e5e1cf','#a1b9a7','#e0d9c9'][i%3],.13);box(g,.27,.32,.24,w*.36,1.06,.14,mat.metal);}
      for(const x of [-w*.34,w*.34]){box(g,.85,.65,.33,x,1.82,.16,mat.trim);box(g,.82,.61,.025,x,1.82,-.02,mat.wall);}
    }else if(f.type==='fridge'){
      box(g,.8,1.82,.75,0,.91,0,mat.metal);box(g,.77,.55,.03,0,1.5,-.39,mat.metal);box(g,.025,.45,.06,-.3,1,-.43,mat.dark);if(f.details){for(let i=0;i<6;i++)box(g,.10+(i%2)*.04,.09,.004,-.24+(i%3)*.22,1.33+Math.floor(i/3)*.15,-.414,basic(['#d9dfdf','#adbd9f','#c4a39c'][i%3]));}
    }else if(f.type==='fireplace'){
      box(g,1.55,1.3,.38,0,.65,0,mat.brick);box(g,.95,.8,.06,0,.45,.22,mat.dark);box(g,1.8,.10,.55,0,1.34,0,mat.wood);box(g,1.75,.07,.75,0,.035,.17,mat.brick);
      if(f.details){for(let row=0;row<8;row++)for(let col=0;col<5;col++)box(g,.015,.13,.012,-.72+col*.30+(row%2)*.12,.08+row*.145,.203,basic('#b88b6b'));bottle(-.55,1.40,.03,'#798d6d',.18);bottle(.55,1.40,.03,'#a4b598',.15);}
      for(let row=0;row<9;row++)box(g,1.55,.016,.012,0,.08+row*.145,.197,basic('#b88b6b'));
    }else if(f.type==='bed'){
      box(g,w,.28,1.95,0,.22,0,mat.wood);box(g,w,.23,1.95,0,.47,0,basic('#e3dfd2'));box(g,w,.08,1.35,0,.62,-.2,basic('#8b9890'));box(g,w,.7,.09,0,.53,.98,mat.wood);box(g,w*.7,.12,.4,0,.67,.67,mat.trim);
    }else if(f.type==='bath'){
      box(g,w,.54,.73,0,.27,0,mat.trim);box(g,w-.16,.035,.52,0,.55,0,basic('#c8d4d0'));box(g,w,.035,.77,0,.57,0,mat.trim);
      box(g,w,1.9,.035,0,1.25,.4,basic(f.stone?'#a59b89':'#e8e6dd'));
      if(f.stone){box(g,w,1.55,.018,0,1.35,-.38,mat.glass);for(const y of [.58,2.12])box(g,w,.035,.035,0,y,-.39,mat.metal);}
      if(f.details){for(let y=.70;y<2.12;y+=f.stone?.46:.18)box(g,w,.009,.008,0,y,.377,basic(f.stone?'#d4cebf':'#c6c7be'));for(let x=-w/2+.12;x<w/2;x+=f.stone?.48:.32)box(g,.008,1.5,.008,x,1.3,.378,basic(f.stone?'#d4cebf':'#c6c7be'));if(f.stone){for(const x of [-w*.47,0,w*.47])box(g,.025,1.55,.026,x,1.35,-.40,mat.metal);beam(g,[-w*.25,1.05,-.42],[w*.25,1.05,-.42],.015,mat.metal);}else{beam(g,[-w*.48,2.13,-.37],[w*.48,2.13,-.37],.018,mat.metal);for(let i=0;i<6;i++)box(g,.055,1.50,.045,-w*.45+i*.06,1.35,-.36,basic('#d8cfc1'));}for(let i=0;i<3;i++)bottle(-w*.25+i*.12,1.32,.33,'#dddcca',.13);}
      beam(g,[w*.35,1.85,.36],[w*.35,1.85,.14],.02,mat.metal);cylinder(g,.08,.08,.04,w*.35,1.84,.12,mat.metal).rotation.x=.6;
    }else if(f.type==='vanity'){
      box(g,w,.78,.52,0,.39,0,mat.trim);box(g,w+.03,.06,.56,0,.81,0,basic(f.yellow?'#dec98b':'#dfd9c9'));cylinder(g,.22,.18,.035,0,.85,0,mat.trim,18);box(g,w,.72,.025,0,1.52,.29,basic('#9caeac',{metalness:.6,roughness:.25}));
      if(f.yellow)box(g,w,.35,.025,0,1.02,.3,basic('#e1ca84'));
      if(f.details){for(const sign of [-1,1]){box(g,w*.45,.58,.025,sign*w*.245,.40,-.278,mat.trim);cylinder(g,.022,.022,.025,sign*.07,.55,-.30,mat.metal,8).rotation.x=Math.PI/2;}beam(g,[0,.87,.15],[0,1.02,.15],.014,mat.metal);beam(g,[0,1.02,.15],[0,1.02,.02],.014,mat.metal);for(const x of [-w/2,w/2])box(g,.026,.76,.035,x,1.52,.265,mat.metal);for(const y of [1.14,1.90])box(g,w,.026,.035,0,y,.265,mat.metal);if(f.yellow){box(g,w,.055,.045,0,2.03,.25,mat.metal);for(let i=0;i<5;i++)mesh(g,new THREE.SphereGeometry(.055,10,6),basic('#fff1d0',{emissive:'#e7cc8a',emissiveIntensity:.18}),[-w*.4+i*w*.2,2.03,.19]);}bottle(w*.34,.86,.10,'#dfdfcf',.20);}
    }else if(f.type==='toilet'){
      cylinder(g,.18,.22,.33,0,.2,0,mat.trim,14);const seat=cylinder(g,.26,.24,.12,0,.41,-.05,mat.trim,18);seat.scale.z=1.35;box(g,.46,.55,.2,0,.55,.28,mat.trim);
    }else if(f.type==='floorLamp'){
      cylinder(g,.18,.18,.035,0,.02,0,mat.dark);cylinder(g,.015,.015,1.5,0,.78,0,mat.dark);cylinder(g,.18,.25,.28,0,1.54,0,mat.trim);
    }else if(f.type==='chair'){
      box(g,.43,.055,.43,0,.45,0,mat.wood);for(const x of [-.18,.18])for(const z of [-.18,.18])leg(x,z,.45);for(const x of [-.18,.18])box(g,.035,.6,.035,x,.7,.2,mat.wood);box(g,.43,.08,.035,0,.9,.2,mat.wood);
    }else if(f.type==='closet'){
      box(g,w,2.2,.52,0,1.1,0,mat.trim);box(g,.025,2.15,.03,0,1.1,-.28,mat.wall);
    }else if(f.type==='plant'){
      cylinder(g,.16,.11,.28,0,.14,0,basic('#956649'));for(let i=0;i<7;i++){const a=i*2.4,tip=[Math.cos(a)*.17,.5+Math.sin(i)*.13,Math.sin(a)*.17];beam(g,[0,.25,0],tip,.014,basic('#516b47'));const leaf=mesh(g,new THREE.SphereGeometry(.10,7,5),basic('#54744a'),tip);leaf.scale.set(.55,1.5,.45);leaf.rotation.z=a;}
    }else if(f.type==='sideTable'){
      table(.60,w,.52);if(f.plants){for(const x of [-w*.25,w*.25]){cylinder(g,.08,.06,.13,x,.70,0,basic('#9e7654'));for(let i=0;i<4;i++){const leaf=mesh(g,new THREE.SphereGeometry(.075,7,5),basic('#4c7044'),[x+Math.cos(i*2.4)*.09,.83+i*.025,Math.sin(i*2.4)*.09]);leaf.scale.set(.65,1.1,.35);}}}
    }else if(f.type==='picture'){
      const h=f.height||.70,y=f.mountHeight||1.65;box(g,w,h,.035,0,y,0,mat.dark);box(g,w-.035,h-.035,.010,0,y,-.025,mat.trim);box(g,w*.70,h*.72,.012,0,y,-.035,basic(f.color||'#526252'));
    }else if(f.type==='tv'){
      box(g,w,.75,.055,0,.77,0,mat.dark);box(g,w-.05,.70,.01,0,.77,.033,basic('#1c2427',{roughness:.32}));for(const x of [-w*.32,w*.32])beam(g,[x,.40,0],[x+.07,.25,.10],.016,mat.dark);
    }else if(f.type==='bathMat'){
      box(g,w,.018,f.depth||.48,0,.026,0,basic(f.color||'#2b5879'));for(let i=0;i<5;i++)box(g,w-.05,.006,.006,0,.038,-.18+i*.09,basic(f.color||'#2b5879'));
    }else if(f.type==='toiletryShelf'){
      for(const x of [-w/2,w/2])for(const z of [-.14,.14])cylinder(g,.015,.015,1.9,x,.95,z,mat.trim,7);for(let i=0;i<5;i++){const y=.17+i*.40;box(g,w,.035,.35,0,y,0,mat.trim);bottle(-w*.25,y+.02,0,['#dadcca','#3b8a98','#dfdfd9'][i%3],.18);bottle(w*.24,y+.02,.02,'#91a4a0',.13);}
    }else if(f.type==='floorCushion'){
      soft(w,.10,w,0,.07,0,basic('#d3cfbd'));cylinder(g,w*.43,w*.43,.13,0,.18,0,basic('#677460'),14);
    }else if(f.type==='roundTable'){
      cylinder(g,w/2,w/2,.04,0,.65,0,basic('#bb8c78'),18);cylinder(g,.025,.025,.63,0,.315,0,mat.dark);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(g,[0,.08,0],[Math.cos(a)*w*.4,.02,Math.sin(a)*w*.4],.016,mat.dark);}
    }else if(f.type==='foldingChair'){
      box(g,.44,.035,.41,0,.44,0,mat.trim);box(g,.44,.30,.035,0,.72,.18,mat.trim);for(const x of [-.2,.2]){beam(g,[x,.02,-.2],[x,.88,.20],.014,mat.trim);beam(g,[x,.02,.22],[x,.49,-.20],.014,mat.trim);}
    }else if(f.type==='panRack'){
      beam(g,[-w/2,2.12,0],[w/2,2.12,0],.025,mat.dark);for(let i=0;i<3;i++){const x=-w*.32+i*w*.32;beam(g,[x,2.10,-.02],[x,1.91,-.03],.018,mat.dark);const pan=cylinder(g,.13,.13,.035,x,1.76,-.03,i%2?mat.metal:mat.dark,14);pan.rotation.x=Math.PI/2;}
    }else if(f.type==='wheelieBin'){
      box(g,.55,.82,.62,0,.44,0,basic(f.color||'#597363'));box(g,.59,.045,.66,0,.88,0,basic(f.color||'#597363'));for(const x of [-.23,.23])cylinder(g,.08,.08,.045,x,.10,.22,mat.dark,10).rotation.z=Math.PI/2;box(g,.34,.04,.04,0,.84,.34,mat.dark);
    }
  }
  const s=plan.stairs,stairGroup=levels.get(s.floor),run=(s.z1-s.z0)/s.risers;
  for(let i=0;i<s.risers;i++){
    const h=s.rise*(i+1)/s.risers;box(stairGroup,s.x1-s.x0,h,run,(s.x0+s.x1)/2,h/2,s.z0+run*(i+.5),floorMaterial('carpet'));if(s.details)box(stairGroup,s.x1-s.x0,.018,.045,(s.x0+s.x1)/2,h+.009,s.z0+run*i+.02,basic('#d8d1bf'));
  }
  beam(stairGroup,[s.x1-.12,.94,s.z0],[s.x1-.12,s.rise+.94,s.z1],.035,mat.wood);
  for(const roof of plan.roofs){const group=roofGeometry(roof);group.name='Estimated roof';root.add(group);roofs.push(group);}
  function roofGeometry(r){
    const g=new THREE.Group(),xs=r.outline.map(p=>p[0]),zs=r.outline.map(p=>p[1]);let x0=Math.min(...xs)-.25,x1=Math.max(...xs)+.25,z0=Math.min(...zs)-.25,z1=Math.max(...zs)+.25;
    const point=(u,v,y)=>r.axis==='z'?[u,y,v]:[v,y,u];
    if(r.axis==='x'){[x0,z0]=[z0,x0];[x1,z1]=[z1,x1];}
    const verts=[point(x0,z0,r.eave),point(x1,z0,r.eave),point((x0+x1)/2,z0,r.ridge),point(x0,z1,r.eave),point(x1,z1,r.eave),point((x0+x1)/2,z1,r.ridge)];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(verts.flatMap(v=>[v[0],v[2]]),2));const indices=[0,5,2,0,3,5,2,4,1,2,5,4,0,2,1,3,4,5];if(r.axis==='x')for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geo.setIndex(indices);geo.computeVertexNormals();geo.clearGroups();geo.addGroup(0,12,0);geo.addGroup(12,6,1);mesh(g,geo,[mat.roof,mat.wall]);
    for(const u of [x0+.12,x1-.12])for(let v=z0+.15;v<z1;v+=.6){const p=point(u,v,r.eave-.08);box(g,.13,.14,.32,...p,mat.trim);}
    return g;
  }
  const site=new THREE.Group();site.name='Garden context — placement approximate';root.add(site);
  if(plan.site?.enabled){
    surface(site,plan.site.yard,-.18,basic('#b2b89a',{side:THREE.DoubleSide}),.1);
    for(const paving of plan.site.paving||[])surface(site,paving,-.09,basic('#b6b6a8',{side:THREE.DoubleSide}),.05);
    const [tx,tz]=plan.site.tree; cylinder(site,.35,.55,plan.site.treeHeight||7,tx,(plan.site.treeHeight||7)/2-.2,tz,basic('#76634d'),14);
    for(let i=0;i<10;i++){const a=i*2.4,y=4.5+(i%4)*.8;beam(site,[tx,y-1,tz],[tx+Math.cos(a)*2,y+1,tz+Math.sin(a)*2],.1,basic('#76634d'));const leaf=mesh(site,new THREE.SphereGeometry(1.45,10,8),basic(i%2?'#667552':'#74805a'),[tx+Math.cos(a)*1.7,y+1.6,tz+Math.sin(a)*1.7]);leaf.scale.set(1,.8,1);}
    const [fx,fz]=plan.site.firepit;cylinder(site,.43,.39,.32,fx,.02,fz,basic('#6b6d61'),20);cylinder(site,.36,.36,.03,fx,.2,fz,mat.dark,20);
    const ring=mesh(site,new THREE.TorusGeometry(1.7,.075,6,28,Math.PI*1.35),mat.brick,[tx,-.04,tz]);ring.rotation.x=Math.PI/2;
    const gb=plan.site.gardenBuilding,xs=gb.outline.map(p=>p[0]),zs=gb.outline.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs),h=gb.height;
    for(const [w,d,x,z] of [[x1-x0,.16,(x0+x1)/2,z0],[x1-x0,.16,(x0+x1)/2,z1],[.16,z1-z0,x0,(z0+z1)/2],[.16,z1-z0,x1,(z0+z1)/2]])box(site,w,h,d,x,h/2,z,mat.wall);
    box(site,.85,1.98,.045,x1-.8,.99,z0-.105,mat.trim);box(site,.12,.5,.055,x1-.8,1.45,z0-.135,mat.dark);
    box(site,1.2,1.02,.06,x0+1,.95,z0-.12,mat.wood);box(site,1.05,.87,.065,x0+1,.95,z0-.16,basic('#7e9b9a'));box(site,.045,.87,.07,x0+1,.95,z0-.2,mat.trim);
    if(gb.porchPosts)for(const x of [x1-.15,x1-1.6])box(site,.12,h,.12,x,h/2,z0-.22,mat.wood);
    box(site,.05,2,1,x0-.11,1,z1-1.1,mat.wood);box(site,.055,1.85,.9,x0-.15,1,z1-1.1,basic('#a4bbb6'));for(let i=0;i<5;i++)box(site,.06,.04,.9,x0-.18,.3+i*.35,z1-1.1,mat.trim);
    site.add(roofGeometry({outline:gb.outline,eave:h+.08,ridge:h+1,axis:'z'}));
    for(const f of plan.site.furnishings||[])furnishing(site,f,-.10);
    fence(plan.site.fence);
    // P01: gate and overhead crosspiece. Position is provisional.
    const gate=plan.site.gate;box(site,gate.width,gate.height,.07,gate.position[0],gate.height/2-.1,gate.position[1],mat.wood);box(site,gate.width+.45,.13,.13,gate.position[0],gate.height+.55,gate.position[1],mat.wood);
    function fence(points){
      const transforms=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(len/.15);for(let j=0;j<count;j++){const t=j/count;const o=new THREE.Object3D();o.position.set(a[0]+(b[0]-a[0])*t,.72,a[1]+(b[1]-a[1])*t);o.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);o.updateMatrix();transforms.push(o.matrix.clone());}}
      const m=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,1.8,.045),mat.wood,transforms.length);transforms.forEach((t,i)=>m.setMatrixAt(i,t));m.castShadow=true;m.receiveShadow=true;site.add(m);
    }
  }
  // Batch static pieces within their existing semantic group. Floors, ceilings,
  // room groups, roofs and instances remain individually identifiable. Retain
  // source names on each batch so optimization does not erase provenance.
  const protectedMeshes=new Set([...pickables,...ceilings.map(c=>c.mesh)]);
  const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});
  for(const group of groups.reverse()){
    const batches=new Map();
    for(const child of group.children){
      if(!child.isMesh||child.isInstancedMesh||protectedMeshes.has(child)||Array.isArray(child.material))continue;
      if(child.material.transparent)continue;
      if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(child);
    }
    for(const [material,children] of batches){
      if(children.length<2)continue;
      const geometries=children.map(child=>{child.updateMatrix();const g=child.geometry.clone().applyMatrix4(child.matrix);return g.index?g.toNonIndexed():g;});
      const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;
      const combined=new THREE.Mesh(merged,material);combined.name='Static batch';combined.castShadow=children.some(c=>c.castShadow);combined.receiveShadow=true;combined.userData.sourceNodes=children.map(c=>({name:c.name,confidence:c.userData.confidence}));
      children.forEach(c=>{group.remove(c);c.geometry.dispose();});group.add(combined);
    }
  }
  root.updateMatrixWorld(true);
  return {root,levels,roofs,ceilings,pickables,labels,cutMaterials,site,roomById,
    dispose(){const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
