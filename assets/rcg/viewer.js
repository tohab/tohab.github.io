import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildHouse,validatePlan,planPointToWorld} from './house-model.js';

// CONFIDENCE / EDITING: the encrypted floor-plan JSON is the single source of
// house-specific geometry. Keep IDs stable and update photoIds, notes and
// confidence along with coordinates. The builder's dimensions are in metres;
// every current metre value is estimated, not measured. Adding a photo requires
// no remodeling here: register it, associate its ID with a room or opening,
// revise the JSON, rebuild the encrypted package and publish those new assets.
export function mountHouse(host,plan,photos,{onPhoto=()=>{},fallbackUrl=null,fallbackUrls={}}={}) {
  validatePlan(plan);
  host.innerHTML=`<div class="house-header"><div><p class="house-eyebrow">RCG / A PLACE TO EXPLORE</p><h2>The house, room by room.</h2><p class="house-subtitle">First reconstruction · Approximate proportions</p></div><button type="button" class="house-reset">Reset view</button></div>
  <div class="house-tools"><div class="house-modes" role="group" aria-label="View mode"><button data-mode="exterior" aria-pressed="true">Exterior</button><button data-mode="dollhouse" aria-pressed="false">Dollhouse</button><button data-mode="inside" aria-pressed="false">Inside</button><button data-mode="plan" aria-pressed="false">Floor plan</button></div><div class="house-filters"><label>Floor <select aria-label="Floor"><option value="all">Both floors</option><option value="0">Downstairs</option><option value="1">Upstairs</option></select></label><label><input class="house-roof" type="checkbox" checked> Roof</label><label><input class="house-garden" type="checkbox" checked> Garden</label></div></div>
  <div class="house-layout"><div class="house-stage"><div class="house-canvas" aria-label="Interactive 3D house. Drag to rotate; pinch or scroll to zoom." role="img"></div><div class="house-labels"></div><div class="house-loading" role="status">Building the house…</div><p class="house-gesture">Drag to rotate · Scroll to zoom · Two fingers to pan</p><span class="house-view-badge">Exterior</span></div><aside class="house-info"><p class="house-eyebrow">TAKE A LOOK AROUND</p><label for="house-room">Choose a room</label><select id="house-room" aria-label="Room"><option value="">Select a room…</option></select><h3 class="house-room-title">Welcome to RCG.</h3><p class="house-room-note">Start outside, lift off the roof, or follow the route through the front door.</p><div class="house-route"><button class="house-tour" type="button">Start the tour →</button><div class="house-tour-nav" hidden><button class="house-prev" type="button" aria-label="Previous viewpoint">← Back</button><span class="house-tour-position"></span><button class="house-next" type="button" aria-label="Next viewpoint">Next →</button></div></div><div class="house-photo-refs"></div><details class="house-notes"><summary>About this reconstruction</summary><p>Room connections follow Rohan’s description. Photos guide visible finishes and features. Sizes, the full roof, unseen rooms and some window positions are approximate.</p><p>Garden placement is provisional. The raised deck beyond the fence is excluded while its ownership is unknown.</p><button type="button" class="house-download">Download editable plan</button><output class="house-performance" aria-label="Rendering performance"></output></details></aside></div>`;
  const $=s=>host.querySelector(s),stage=$('.house-stage'),canvasHost=$('.house-canvas'),roomSelect=$('#house-room'),floorSelect=$('select[aria-label="Floor"]');
  let fallback=false;
  let environmentMap;
  let renderer,scene,camera,controls,model,raf,resizeObserver,disposed=false,tourIndex=-1,selectedRoom=null,mode='exterior',motion=null,frame=0,lastFrame=0,statsStart=performance.now(),statsFrames=0,statsMs=0;
  const textureSet=makeTextures();
  const photoMap=new Map(photos.map(p=>[p.id,p]));
  const relevant=plan.rooms.filter(r=>r.kind!=='unknown');
  for(const floor of plan.floors){const group=document.createElement('optgroup');group.label=floor.level?'Upstairs':'Downstairs';for(const room of relevant.filter(r=>r.floor===floor.level)){const op=document.createElement('option');op.value=room.id;op.textContent=room.label;group.append(op);}roomSelect.append(group);}
  const labelElements=[];
  function fail(message){fallback=true;$('.house-loading').textContent=message;$('.house-loading').classList.add('house-fallback');if(fallbackUrls[0]||fallbackUrl){const img=document.createElement('img');img.src=fallbackUrls[0]||fallbackUrl;img.alt='Approximate downstairs floor plan. Use the room list and photo references to explore.';canvasHost.replaceChildren(img);}$('.house-gesture').textContent='Use the room list and source photos to explore.';}
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.5:2));renderer.setClearColor('#dfdfd1');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.localClippingEnabled=true;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    canvasHost.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D reconstruction of RCG');
    scene=new THREE.Scene();const environmentRoom=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);environmentMap=pmrem.fromScene(environmentRoom,.04).texture;scene.environment=environmentMap;scene.environmentIntensity=.45;environmentRoom.dispose();pmrem.dispose();scene.fog=new THREE.Fog('#dfdfd1',45,100);
    scene.add(new THREE.HemisphereLight('#fff5df','#aaa68f',2.0));const sun=new THREE.DirectionalLight('#fff1d3',3.0);sun.position.copy(planPointToWorld([-9,20,-12]));sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<650?512:1024,innerWidth<650?512:1024);Object.assign(sun.shadow.camera,{left:-25,right:25,top:28,bottom:-20,near:1,far:65});sun.shadow.bias=-.001;sun.shadow.normalBias=.03;scene.add(sun);scene.add(sun.target);
    const fill=new THREE.DirectionalLight('#e1edf3',1.0);fill.position.copy(planPointToWorld([15,12,20]));scene.add(fill);
    camera=new THREE.PerspectiveCamera(48,1,.045,180);camera.position.copy(planPointToWorld([23,17,-23]));
    controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(planPointToWorld([6.5,2.1,7]));controls.enableDamping=true;controls.dampingFactor=.10;controls.minDistance=.35;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*.49;controls.screenSpacePanning=true;
    model=buildHouse(plan,{textures:textureSet});scene.add(model.root);
    for(const label of model.labels){const el=document.createElement('button');el.type='button';el.className='house-room-label';el.textContent=label.room.label;el.setAttribute('aria-label',`Visit ${label.room.label}`);el.addEventListener('click',()=>chooseRoom(label.room.id));$('.house-labels').append(el);labelElements.push({...label,el});}
    renderer.domElement.addEventListener('webglcontextlost',e=>{if(disposed)return;e.preventDefault();fail('3D paused. Reload this page to restart, or explore the room photos.');});
    let down=null;
    renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
    renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;down=null;if(mode==='exterior'||mode==='inside')return;const rect=renderer.domElement.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(p,camera);const targets=model.pickables.filter(o=>model.levels.get(plan.rooms.find(r=>r.id===o.userData.roomId).floor).visible);const hit=ray.intersectObjects(targets,false)[0];if(hit)chooseRoom(hit.object.userData.roomId);});
    const resize=()=>{const w=canvasHost.clientWidth,h=canvasHost.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvasHost);resize();
    $('.house-loading').hidden=true;
    function animate(now){
      if(disposed)return;raf=requestAnimationFrame(animate);if(document.hidden)return;
      const interval=innerWidth<650?1000/30:1000/60;if(now-lastFrame<interval-.7)return;const elapsed=lastFrame?now-lastFrame:interval;lastFrame=now;
      if(motion){const t=Math.min((now-motion.start)/750,1),e=1-Math.pow(1-t,3);camera.position.lerpVectors(motion.from,motion.to,e);controls.target.lerpVectors(motion.fromTarget,motion.target,e);if(t===1)motion=null;}
      controls.update();renderer.render(scene,camera);frame++;statsFrames++;statsMs+=elapsed;
      if(frame%2===0)updateLabels();
      if(now-statsStart>2000){$('.house-performance').textContent=`${Math.round(statsFrames*1000/statsMs)} fps · ${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.render.calls} draw calls`;statsStart=now;statsFrames=0;statsMs=0;}
    }
    raf=requestAnimationFrame(animate);
  }catch(e){fail('3D is unavailable in this browser. The floor plan and room photos are still available.');console.warn('RCG WebGL fallback:',e.message);}
  function move(position,target){if(!camera)return;motion={from:camera.position.clone(),to:planPointToWorld(position),fromTarget:controls.target.clone(),target:planPointToWorld(target),start:performance.now()};}
  function updateLabels(){if(!model)return;const rect=canvasHost.getBoundingClientRect();for(const {room,position,el} of labelElements){const enabled=(mode==='dollhouse'||mode==='plan')&&model.levels.get(room.floor).visible;const p=position.clone().applyMatrix4(model.root.matrixWorld).project(camera);el.hidden=!enabled||p.z>1||p.z<0||Math.abs(p.x)>.95||Math.abs(p.y)>.92;if(!el.hidden){el.style.left=`${(p.x*.5+.5)*rect.width}px`;el.style.top=`${(-p.y*.5+.5)*rect.height}px`;el.classList.toggle('is-selected',selectedRoom===room.id);}}}
  function visibility(){
    if(fallback){const level=floorSelect.value==='1'?1:0;const img=canvasHost.querySelector('img');if(img){img.src=fallbackUrls[level]||fallbackUrl;img.alt=`Approximate ${level?'upstairs':'downstairs'} floor plan. All dimensions estimated.`;}$('.house-view-badge').textContent=`${level?'Upstairs':'Downstairs'} · 2D fallback`;}
    if(!model)return;for(const [level,g] of model.levels)g.visible=floorSelect.value==='all'||Number(floorSelect.value)===level||(mode==='inside'&&selectedRoom===plan.rooms.find(r=>r.kind==='stairs')?.id);
    model.site.visible=$('.house-garden').checked&&mode==='exterior';
    model.roofs.forEach(r=>r.visible=$('.house-roof').checked&&(mode==='exterior'));
    model.ceilings.forEach(c=>c.mesh.visible=mode==='inside'||mode==='exterior');
    for(const {material,level} of model.cutMaterials){material.clippingPlanes=(mode==='dollhouse'||mode==='plan')?[new THREE.Plane(new THREE.Vector3(0,-1,0),plan.floors.find(f=>f.level===level).elevation+(mode==='plan'?.4:1.18))]:[];material.needsUpdate=true;}
    updateLabels();
  }
  function setMode(next,animate=true){
    mode=next;host.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('.house-view-badge').textContent={exterior:'Exterior',dollhouse:'Dollhouse',inside:'Room view',plan:'Floor plan'}[mode];
    $('.house-roof').checked=mode==='exterior';
    if(mode==='exterior')refs({photoIds:plan.site?.photoIds||[],kind:'site'});
    if(controls){controls.maxPolarAngle=mode==='inside'?Math.PI*.94:Math.PI*.49;controls.minDistance=mode==='inside'?.15:2;controls.maxDistance=mode==='inside'?16:70;}
    if(mode==='exterior'){floorSelect.value='all';if(animate)move([23,17,-23],[6.5,2.1,7]);}
    if(mode==='dollhouse'||mode==='plan'){if(floorSelect.value==='all')floorSelect.value=String(selectedRoom?model?.roomById.get(selectedRoom)?.floor||0:0);const y=Number(floorSelect.value)===1?3:0;if(animate)move(mode==='plan'?[7,29+y,5.29]:[20,18+y,-12],[7,y+.3,5.3]);}
    visibility();
    if(mode==='inside'&&animate)chooseRoom(selectedRoom||'L');
  }
  function refs(room){
    const wrap=$('.house-photo-refs');wrap.replaceChildren();if(!room.photoIds.length){const p=document.createElement('p');p.className='house-assumption';p.textContent=room.kind==='stairs'?'Stair dimensions are estimated.':room.kind==='site'?'Exterior and garden placement remains approximate.':'No room photo yet · Simple placeholder interior';wrap.append(p);return;}
    const heading=document.createElement('p');heading.className='house-eyebrow';heading.textContent='SOURCE PHOTOS';wrap.append(heading);
    const grid=document.createElement('div');grid.className='house-reference-grid';
    for(const id of room.photoIds){const p=photoMap.get(id);if(!p)continue;const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Open source photo ${id}`);const img=document.createElement('img');img.src=p.url;img.alt=p.caption;const span=document.createElement('span');span.textContent=id;b.append(img,span);b.addEventListener('click',()=>onPhoto(id));grid.append(b);}wrap.append(grid);
  }
  function chooseRoom(id,override){
    const room=plan.rooms.find(r=>r.id===id&&r.kind!=='unknown');if(!room)return;
    selectedRoom=id;roomSelect.value=id;floorSelect.value=String(room.floor);$('.house-room-title').textContent=room.label;$('.house-room-note').textContent=override?.note||room.notes;refs(room);
    setMode('inside',false);const view=override?.position?override:room.view;
    if(view)move(view.position,view.target);visibility();
  }
  function tour(index){tourIndex=(index+plan.viewpoints.length)%plan.viewpoints.length;const v=plan.viewpoints[tourIndex];$('.house-tour').hidden=true;$('.house-tour-nav').hidden=false;$('.house-tour-position').textContent=`${tourIndex+1} / ${plan.viewpoints.length}`;chooseRoom(v.room,v);}
  roomSelect.addEventListener('change',()=>chooseRoom(roomSelect.value));
  host.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  floorSelect.addEventListener('change',()=>{if(mode==='inside'){const r=relevant.find(r=>r.floor===Number(floorSelect.value));if(r)chooseRoom(r.id);else setMode('exterior');}else {if(mode==='exterior'&&floorSelect.value!=='all')setMode('dollhouse');else {visibility();if(mode==='dollhouse'||mode==='plan')setMode(mode);}}});
  $('.house-roof').addEventListener('change',()=>{if(mode!=='exterior'&&$('.house-roof').checked)setMode('exterior');else visibility();});$('.house-garden').addEventListener('change',visibility);
  $('.house-reset').addEventListener('click',()=>{selectedRoom=null;roomSelect.value='';tourIndex=-1;$('.house-tour').hidden=false;$('.house-tour-nav').hidden=true;$('.house-room-title').textContent='Welcome to RCG.';$('.house-room-note').textContent='Start outside, lift off the roof, or follow the route through the front door.';$('.house-photo-refs').replaceChildren();setMode('exterior');});
  $('.house-tour').addEventListener('click',()=>tour(0));$('.house-prev').addEventListener('click',()=>tour(tourIndex-1));$('.house-next').addEventListener('click',()=>tour(tourIndex+1));
  $('.house-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rcg-floor-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  refs({photoIds:plan.site?.photoIds||[],kind:'site'});
  visibility();
  return {dispose(){disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();controls?.dispose();model?.dispose();Object.values(textureSet).forEach(t=>t.dispose());environmentMap?.dispose();renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();}};
}

function makeTextures(){
  // Native procedural surface maps. These describe material appearance only;
  // real photographs remain the evidence and are never replaced by generated views.
  const textures={};let seed=17;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const create=(name,draw,color=true,size=512)=>{const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');draw(x,size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;textures[name]=t;return c;};
  const noise=(x,n,base,range)=>{const im=x.createImageData(n,n);for(let i=0;i<im.data.length;i+=4){const v=base+(rand()-.5)*range;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}x.putImageData(im,0,0);};
  for(const kind of ['wood','bathWood','parquet'])create(kind,(x,n)=>{
    x.fillStyle='#e8dfce';x.fillRect(0,0,n,n);
    const plank=(px,py,w,h,vertical=false)=>{x.save();x.translate(px,py);if(vertical){x.translate(w,0);x.rotate(Math.PI/2);[w,h]=[h,w];}const shade=220+rand()*24;x.fillStyle=`rgb(${shade},${shade-5},${shade-13})`;x.fillRect(0,0,w,h);for(let j=0;j<90;j++){const y=rand()*h;x.strokeStyle=`rgba(96,69,39,${.025+rand()*.10})`;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(w*.3,y+(rand()-.5)*8,w*.7,y+(rand()-.5)*8,w,y);x.stroke();}x.strokeStyle='#b9aa93';x.lineWidth=.7;x.strokeRect(.5,.5,w-1,h-1);x.restore();};
    if(kind==='parquet'){const cell=n/4;for(let row=0;row<4;row++)for(let col=0;col<4;col++){x.save();x.translate(col*cell,row*cell);if((row+col)%2){x.translate(cell,0);x.rotate(Math.PI/2);}for(let i=0;i<4;i++)plank(0,i*cell/4,cell,cell/4);x.restore();}}
    else for(let row=0;row<8;row++){plank(0,row*n/8,n,n/8);x.fillStyle='#b7a78e';x.fillRect((row%2?n*.7:n*.3),row*n/8,.8,n/8);}
  });
  create('carpet',(x,n)=>{noise(x,n,225,30);for(let i=0;i<40000;i++){x.strokeStyle=rand()>.5?'#fff6':'#867a6320';const xx=rand()*n,yy=rand()*n;x.beginPath();x.moveTo(xx,yy);x.lineTo(xx+rand()*2,yy+2);x.stroke();}});
  create('fabric',(x,n)=>{noise(x,n,237,13);x.lineWidth=.45;for(let i=0;i<n;i+=2){x.strokeStyle=i%4?'#8b817c25':'#fff9';x.beginPath();x.moveTo(i,0);x.lineTo(i,n);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(n,i);x.stroke();}});
  create('plaster',(x,n)=>noise(x,n,241,13));
  create('brick',(x,n)=>{noise(x,n,231,30);for(let y=0;y<n;y+=64){x.fillStyle='#cabca5';x.fillRect(0,y,n,3);for(let xx=(y/64%2)*64;xx<n;xx+=128)x.fillRect(xx,y,3,64);}});
  create('roof',(x,n)=>{noise(x,n,226,35);for(let y=0;y<n;y+=64){x.fillStyle='#6f63564a';x.fillRect(0,y,n,4);for(let xx=(y/64%2)*32;xx<n;xx+=64)x.fillRect(xx,y,2,64);}});
  for(const kind of ['wood','bathWood','parquet','carpet','fabric','plaster','brick','roof'])create(kind+'Bump',(x,n)=>noise(x,n,128,kind==='plaster'?30:kind==='carpet'?110:50),false,256);
  create('contactShadow',(x,n)=>{x.clearRect(0,0,n,n);const g=x.createRadialGradient(n/2,n/2,n*.08,n/2,n/2,n*.5);g.addColorStop(0,'rgba(27,23,17,.80)');g.addColorStop(.55,'rgba(27,23,17,.25)');g.addColorStop(1,'rgba(27,23,17,0)');x.fillStyle=g;x.fillRect(0,0,n,n);},false,128);
  return textures;
}
