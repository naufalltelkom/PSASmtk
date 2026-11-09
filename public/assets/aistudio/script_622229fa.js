
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const LEVEL = {"name": "EASY", "desc": "Satu fungsi affine: f(x) atau g(x)", "functions": [{"name": "f", "a": 5, "b": 8}], "cipher": "single", "hint": "Gunakan invers dari fungsi affine untuk mengembalikan angka ciphertext menjadi huruf."};
const $ = id => document.getElementById(id);
const mod = n => ((n % 26) + 26) % 26;
const gcd = (a,b) => b === 0 ? a : gcd(b,a%b);
const inverse = a => { for(let i=1;i<26;i++) if(mod(a*i)===1) return i; return null; };
const alphabet = n => String.fromCharCode(65+n);
const target = 'KELUAR';
const params = LEVEL.functions;
function encryptNumber(x) {
  let v = x;
  if (LEVEL.cipher === 'single') {
    const f = params[0]; return mod(f.a*v + f.b);
  }
  if (LEVEL.cipher === 'double') {
    const [f,g] = params;
    v = mod(g.a*v + g.b);
    return mod(f.a*v + f.b);
  }
  const [f,g,h] = params;
  v = mod(h.a*v + h.b);
  v = mod(g.a*v + g.b);
  return mod(f.a*v + f.b);
}
const ciphertext = [...target].map(ch => encryptNumber(ch.charCodeAt(0)-65).toString().padStart(2,'0')).join('  ');

let scene, camera, renderer, player, terminal, exitDoor, maze;
let keys = {}, started = false, ended = false, puzzleOpen = false;
let lives = 3, seconds = 300, timerId = null, nearTerminal = false;
let lastTime = 0;
const cellSize = 4, size = 19, offset = (size-1)/2;
let map = [];

function makeMaze() {
  map = Array.from({length:size},()=>Array(size).fill(1));
  const visited = Array.from({length:9},()=>Array(9).fill(false));
  function carve(r,c) {
    visited[r][c]=true;
    map[1+r*2][1+c*2]=0;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]].sort(()=>Math.random()-.5);
    for(const [dr,dc] of dirs) {
      const nr=r+dr,nc=c+dc;
      if(nr<0||nr>=9||nc<0||nc>=9||visited[nr][nc]) continue;
      map[1+(r+nr)][1+(c+nc)]=0;
      carve(nr,nc);
    }
  }
  carve(0,0);
  map[18][17]=0; // gap for the exit door
}
function worldPos(r,c) { return new THREE.Vector3((c-offset)*cellSize,0,(r-offset)*cellSize); }

function addLights() {
  scene.add(new THREE.AmbientLight(0xb9c5a0,0.55));
  const light = new THREE.HemisphereLight(0xe9e6c5,0x302d20,1.1); scene.add(light);
  const positions = [[-20,3,-20],[20,3,-20],[-20,3,20],[20,3,20],[0,3,0]];
  positions.forEach(([x,y,z])=>{
    const l = new THREE.PointLight(0xffe8a8,1.15,24); l.position.set(x,y,z); scene.add(l);
  });
}
function makeCharacter() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.8,4,8),new THREE.MeshStandardMaterial({color:0x263f45,roughness:.85}));
  body.position.y=1.15; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.29,16,12),new THREE.MeshStandardMaterial({color:0xc6a889,roughness:.9}));
  head.position.y=1.95; group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.3,16,8,0,Math.PI*2,0,Math.PI*.55),new THREE.MeshStandardMaterial({color:0x211b18}));
  hair.position.y=2.06; group.add(hair);
  const armMat = new THREE.MeshStandardMaterial({color:0x263f45});
  for(const side of [-1,1]){
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.12,.58,3,6),armMat);
    arm.position.set(side*.52,1.25,0); arm.rotation.z=side*.15; group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.14,.58,3,6),new THREE.MeshStandardMaterial({color:0x20252a}));
    leg.position.set(side*.19,.48,0); group.add(leg);
  }
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(.52,.58,.22),new THREE.MeshStandardMaterial({color:0x9b7540}));
  backpack.position.set(0,1.25,.42); group.add(backpack);
  return group;
}
function buildWorld() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x77734d); scene.fog = new THREE.FogExp2(0x77734d,.025);
  camera = new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,160);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  $('game-root').prepend(renderer.domElement);
  addLights();
  const floorMat = new THREE.MeshStandardMaterial({color:0x8d8150,roughness:1});
  const wallMat = new THREE.MeshStandardMaterial({color:0xc4b879,roughness:.95});
  const ceilingMat = new THREE.MeshStandardMaterial({color:0xaaa17a,roughness:1});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size*cellSize,size*cellSize),floorMat);
  floor.rotation.x=-Math.PI/2; floor.position.y=0; floor.receiveShadow=true; scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size*cellSize,size*cellSize),ceilingMat);
  ceiling.rotation.x=Math.PI/2; ceiling.position.y=4.2; scene.add(ceiling);
  const wallGeo = new THREE.BoxGeometry(cellSize,4.2,cellSize);
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(map[r][c]===1){
    const p=worldPos(r,c);
    const wall=new THREE.Mesh(wallGeo,wallMat); wall.position.set(p.x,2.1,p.z); wall.castShadow=true; wall.receiveShadow=true; scene.add(wall);
  }
  // Repeated ceiling panels and fluorescent fixtures make the space feel liminal.
  for(let r=1;r<size-1;r+=4) for(let c=1;c<size-1;c+=4) if(map[r][c]===0){
    const p=worldPos(r,c);
    const fixture=new THREE.Mesh(new THREE.BoxGeometry(1.8,.08,.55),new THREE.MeshBasicMaterial({color:0xfff4c5}));
    fixture.position.set(p.x,4.02,p.z); scene.add(fixture);
    const lamp=new THREE.PointLight(0xffedb5,.5,10); lamp.position.set(p.x,3.7,p.z); scene.add(lamp);
  }
  player=makeCharacter(); const start=worldPos(1,1); player.position.set(start.x,0,start.z); scene.add(player);
  // Exit door and glowing terminal at the end of the maze.
  const ep=worldPos(17,17);
  terminal=new THREE.Group(); terminal.position.set(ep.x,0,ep.z-1.0); scene.add(terminal);
  const stand=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.1,.65),new THREE.MeshStandardMaterial({color:0x242b28,metalness:.6,roughness:.35}));
  stand.position.y=.55; terminal.add(stand);
  const screen=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.04),new THREE.MeshBasicMaterial({color:0x4dffe3}));
  screen.position.set(0,1.25,-.34); terminal.add(screen);
  const glow=new THREE.PointLight(0x4dffe3,1.5,7); glow.position.set(0,1.6,-.8); terminal.add(glow);
  exitDoor=new THREE.Group(); exitDoor.position.set(ep.x,0,ep.z+2);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(2.5,3.5,.35),new THREE.MeshStandardMaterial({color:0x373a32,metalness:.4,roughness:.6}));
  frame.position.y=1.75; exitDoor.add(frame);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.9,3.1,.2),new THREE.MeshStandardMaterial({color:0x151e1b,metalness:.45,roughness:.4}));
  door.position.set(0,1.55,-.22); door.name='door'; exitDoor.add(door);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(1.2,.28,.08),new THREE.MeshBasicMaterial({color:0xffd75e}));
  sign.position.set(0,3.15,-.35); exitDoor.add(sign); scene.add(exitDoor);
}
function collides(x,z) {
  const c=Math.round(x/cellSize+offset), r=Math.round(z/cellSize+offset);
  if(r<0||r>=size||c<0||c>=size) return true;
  return map[r][c]===1;
}
function movePlayer(dt) {
  if(!started||ended||puzzleOpen) return;
  const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  const side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const len=Math.hypot(forward,side); if(!len) return;
  const speed=(keys.ShiftLeft||keys.ShiftRight?7.4:4.5)*dt;
  // Character and camera face the direction of travel.
  const dx=side/len*speed, dz=-forward/len*speed;
  const nx=player.position.x+dx, nz=player.position.z+dz;
  if(!collides(nx,player.position.z)) player.position.x=nx;
  if(!collides(player.position.x,nz)) player.position.z=nz;
  player.rotation.y=Math.atan2(dx,-dz);
}
function updateCamera() {
  const behind = new THREE.Vector3(0,3.2,6.2).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y);
  const desired=player.position.clone().add(behind);
  camera.position.lerp(desired,.12);
  camera.lookAt(player.position.x,1.25,player.position.z);
}
function showPuzzle() {
  puzzleOpen=true; $('puzzle-screen').classList.remove('hidden');
  $('ciphertext').textContent=ciphertext;
  $('formula-list').innerHTML=LEVEL.functions.map(fn=>`${fn.name}(x) = (${fn.a}x + ${fn.b}) mod 26`).join('<br>')+
    `<br><strong>Komposisi: ${LEVEL.cipher==='single'?'f(x) atau g(x)':LEVEL.cipher==='double'?'f(g(x))':'f(g(h(x)))'}</strong>`;
  $('answer').value=''; $('puzzle-feedback').textContent=''; $('answer').focus();
}
function decodeCandidate() {
  let value = target.split('').map(ch=>encryptNumber(ch.charCodeAt(0)-65));
  // The puzzle's expected answer is the original plaintext; the player derives it from the displayed values.
  return target;
}
function checkAnswer() {
  if(!puzzleOpen||ended) return;
  const guess=$('answer').value.toUpperCase().replace(/[^A-Z]/g,'');
  if(guess===decodeCandidate()){
    $('puzzle-feedback').style.color='#72f2c8'; $('puzzle-feedback').textContent='ACCESS GRANTED — EXIT UNLOCKED';
    setTimeout(()=>{ $('puzzle-screen').classList.add('hidden'); puzzleOpen=false; winGame(); },700);
  } else {
    lives--; $('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);
    $('puzzle-feedback').style.color='#ff626d';
    $('puzzle-feedback').textContent=lives>0?`KODE SALAH. Sisa nyawa: ${lives}`:'SEMUA KESEMPATAN HABIS.';
    if(lives<=0) setTimeout(()=>loseGame('Nyawamu habis. Backrooms masih mengurungmu.'),800);
  }
}
function winGame() {
  ended=true; clearInterval(timerId);
  const door=exitDoor.getObjectByName('door');
  if(door){door.material.color.set(0x42e6bf);door.rotation.y=-1.2;}
  $('end-eyebrow').textContent='MISSION COMPLETE'; $('end-title').textContent='YOU ESCAPED';
  $('end-message').textContent='Kamu berhasil memecahkan enkripsi dan menemukan jalan keluar!';
  $('end-screen').classList.remove('hidden');
}
function loseGame(message) {
  ended=true; clearInterval(timerId);
  $('end-eyebrow').textContent='MISSION FAILED'; $('end-title').textContent='TRAPPED';
  $('end-message').textContent=message; $('end-screen').classList.remove('hidden');
}
function tick(t) {
  requestAnimationFrame(tick);
  const dt=Math.min((t-lastTime)/1000,.05)||0; lastTime=t;
  if(started&&!ended){
    movePlayer(dt);
    const dist=player.position.distanceTo(terminal.position);
    nearTerminal=dist<4.2;
    $('interaction-hint').classList.toggle('hidden',!nearTerminal||puzzleOpen);
    if(nearTerminal) $('objective-text').textContent='Terminal ditemukan. Dekati dan tekan E untuk memecahkan kode.';
  }
  if(player) updateCamera();
  if(renderer&&scene&&camera) renderer.render(scene,camera);
}
function startGame() {
  started=true; $('start-screen').classList.add('hidden');
  seconds=300; updateTimer();
  timerId=setInterval(()=>{if(!started||ended)return;seconds--;updateTimer();if(seconds<=0)loseGame('Waktu habis. Kamu belum berhasil membuka pintu keluar.');},1000);
}
function updateTimer() { $('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'); }
function resetGame(){location.reload();}
window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if(e.code==='KeyE'&&nearTerminal&&started&&!puzzleOpen&&!ended) showPuzzle();
  if(e.code==='Escape'&&puzzleOpen){$('puzzle-screen').classList.add('hidden');puzzleOpen=false;}
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('resize',()=>{if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
$('start-btn').addEventListener('click',startGame);
$('close-puzzle').addEventListener('click',()=>{$('puzzle-screen').classList.add('hidden');puzzleOpen=false;});
$('submit-answer').addEventListener('click',checkAnswer);
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter')checkAnswer();});
$('retry-btn').addEventListener('click',resetGame);
makeMaze(); buildWorld(); $('loading').remove(); requestAnimationFrame(tick);
