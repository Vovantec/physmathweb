"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Building {
  id: string; type: string;
  x: number; y: number;
  hp: number; maxHp: number;
  level: number;
  isBuilding: boolean; isUpgrading: boolean;
}
interface MissileData {
  id: string; missileType: string;
  startX: number; startY: number;
  targetX: number; targetY: number;
  launchTime: number; impactTime: number;
}
interface ThreeSceneProps {
  buildings: Building[];
  missiles: MissileData[];
  selectedBuildingId?: string | null;
  onCellClick?: (x: number, y: number) => void;
  onBuildingClick?: (id: string) => void;
}

const GRID_SIZE   = 20;
const CELL_SIZE   = 2;
const GRID_OFFSET = (GRID_SIZE * CELL_SIZE) / 2;

// ── ЦВЕТА ПО УРОВНЯМ ──────────────────────────────────────
const LEVEL_COLORS: Record<number, number> = { 1: 0x4a7c59, 2: 0x2196f3, 3: 0xffd700 };

function mat(color: number, metalness = 0.4, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

// ══════════════════════════════════════════════════════════
// ЗДАНИЯ — ДЕТАЛИЗИРОВАННЫЕ 3D МОДЕЛИ
// ══════════════════════════════════════════════════════════
function createBuildingMesh(type: string, level: number): THREE.Group {
  const g = new THREE.Group();
  const c = LEVEL_COLORS[level] || 0x888888;

  switch (type) {
    case "command_bunker": {
      // Массивный бункер — растёт с уровнем
      const scale = 0.7 + level * 0.15;
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6*scale, 0.8*scale, 1.6*scale), mat(0x37474f));
      base.position.y = 0.4*scale;
      g.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2*scale, 0.3*scale, 1.2*scale), mat(0x263238));
      top.position.y = 0.95*scale;
      g.add(top);
      // Антенна на уровне 2+
      if (level >= 2) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), mat(0x90a4ae));
        ant.position.set(0.3, 1.6, 0.3);
        g.add(ant);
      }
      // Купол на уровне 3
      if (level >= 3) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI*2, 0, Math.PI/2), mat(c));
        dome.position.set(0, 1.25, 0);
        g.add(dome);
      }
      break;
    }
    case "barracks": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8+level*0.1, 1.0), mat(c));
      body.position.y = 0.4+level*0.05;
      g.add(body);
      // Крыша
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 4), mat(0x2e7d32));
      roof.rotation.y = Math.PI/4;
      roof.position.y = 1.0+level*0.1;
      g.add(roof);
      // Окна на уровне 2+
      if (level >= 2) {
        [-0.4, 0.4].forEach(xOff => {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), mat(0xfff176));
          win.position.set(xOff, 0.6, 0.53);
          g.add(win);
        });
      }
      break;
    }
    case "oil_rig": {
      // Вышка
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.3, 6), mat(0x546e7a));
      base.position.y = 0.15;
      g.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2+level*0.3, 6), mat(0x78909c));
      pole.position.y = 0.9+level*0.15;
      g.add(pole);
      // Насос
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), mat(0xf44336));
      pump.position.set(0.3, 0.6, 0);
      g.add(pump);
      // Огонь сжигания на уровне 3
      if (level >= 3) {
        const flare = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), mat(0xff6600));
        flare.position.set(0.5, 1.8, 0);
        g.add(flare);
      }
      break;
    }
    case "steel_mill": {
      const mill = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7+level*0.15, 1.0), mat(0x455a64));
      mill.position.y = 0.35+level*0.075;
      g.add(mill);
      // Трубы
      [[-0.4, 0], [0.4, 0]].forEach(([xOff, zOff]) => {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 0.6+level*0.2, 8),
          mat(0x607d8b)
        );
        pipe.position.set(xOff, 1.1+level*0.1, zOff);
        g.add(pipe);
        // Дым (сфера) на уровне 2+
        if (level >= 2) {
          const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), mat(0x9e9e9e, 0, 1));
          smoke.position.set(xOff, 1.55+level*0.1, zOff);
          g.add(smoke);
        }
      });
      break;
    }
    case "uranium_reactor": {
      const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.0+level*0.2, 10), mat(0x1a237e));
      reactor.position.y = 0.6+level*0.1;
      g.add(reactor);
      // Купол
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI*2, 0, Math.PI/2), mat(0x283593));
      dome.position.y = 1.1+level*0.2;
      g.add(dome);
      // Радиоактивное свечение (уровень 2+)
      if (level >= 2) {
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), 
          new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x76ff03, emissiveIntensity: 0.5 }));
        glow.position.y = 1.5+level*0.1;
        g.add(glow);
      }
      break;
    }
    case "warehouse": {
      const wh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6+level*0.1, 1.2), mat(0x795548));
      wh.position.y = 0.3+level*0.05;
      g.add(wh);
      // Крыша двускатная
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.1), mat(0x5d4037));
      roof.rotation.z = 0.3; roof.position.set(0, 0.85+level*0.1, 0.55);
      g.add(roof);
      const roof2 = roof.clone(); roof2.rotation.z = -0.3; roof2.position.z = -0.55;
      g.add(roof2);
      break;
    }
    case "radar": {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.0+level*0.3, 6), mat(0x546e7a));
      pole.position.y = 0.6+level*0.15;
      g.add(pole);
      const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2, 8), mat(0x37474f));
      base2.position.y = 0.1;
      g.add(base2);
      // Тарелка — растёт с уровнем
      const dishR = 0.4 + level * 0.15;
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(dishR, 12, 8, 0, Math.PI*2, 0, Math.PI/2),
        mat(c)
      );
      dish.rotation.x = -0.5; dish.position.y = 1.5+level*0.3;
      g.add(dish);
      break;
    }
    case "missile_silo": {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0+level*0.2, 10), mat(0xb71c1c));
      silo.position.y = 0.5+level*0.1;
      g.add(silo);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 10), mat(0x37474f));
      lid.position.y = 1.05+level*0.2;
      g.add(lid);
      // Ракета торчит
      const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7+level*0.1, 8), mat(0xbdbdbd));
      rBody.position.y = 1.2+level*0.15;
      g.add(rBody);
      const rNose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 8), mat(level === 3 ? 0xff1744 : 0xef5350));
      rNose.position.y = 1.75+level*0.15;
      g.add(rNose);
      break;
    }
    case "anti_missile": {
      const launchPad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), mat(0x4a148c));
      launchPad.position.y = 0.15;
      g.add(launchPad);
      // Трубы пусковых
      const tubes = level === 1 ? 2 : level === 2 ? 3 : 4;
      const spacing = 0.35;
      const startX = -(tubes-1)*spacing/2;
      for (let i = 0; i < tubes; i++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7+level*0.1, 8), mat(0x37474f));
        tube.rotation.x = -0.5; tube.position.set(startX + i*spacing, 0.7, -0.1);
        g.add(tube);
      }
      break;
    }
    case "wall": {
      const h = 0.6 + level * 0.3;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.9, h, 0.3), mat(0x607d8b));
      wall.position.y = h/2;
      g.add(wall);
      // Зубцы на уровне 2+
      if (level >= 2) {
        for (let i = -0.6; i <= 0.6; i += 0.4) {
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.3), mat(0x546e7a));
          merlon.position.set(i, h + 0.125, 0);
          g.add(merlon);
        }
      }
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(c));
      box.position.y = 0.5;
      g.add(box);
    }
  }

  g.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return g;
}

// ── HP БАР ────────────────────────────────────────────────
function createHpBar(hp: number, maxHp: number): THREE.Group {
  const group = new THREE.Group();
  const pct = hp / maxHp;
  const color = pct > 0.6 ? 0x4caf50 : pct > 0.3 ? 0xff9800 : 0xf44336;

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  group.add(bg);

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4 * pct, 0.12),
    new THREE.MeshBasicMaterial({ color })
  );
  fill.position.x = (pct - 1) * 0.7;
  fill.position.z = 0.001;
  group.add(fill);

  return group;
}

// ── РАКЕТА ────────────────────────────────────────────────
function createMissile3D(type: string): THREE.Group {
  const g = new THREE.Group();
  const bodyColor = type === "nuclear" ? 0x76ff03 : type === "emp" ? 0x00bcd4 : 0xbdbdbd;
  const noseColor = type === "nuclear" ? 0xff1744 : type === "cluster" ? 0xff9800 : 0xef5350;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 10), mat(bodyColor, 0.8, 0.2));
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 10), mat(noseColor));
  nose.position.y = 1.05; g.add(nose);

  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.2), mat(0x90a4ae));
    fin.position.y = -0.65;
    fin.rotation.y = (Math.PI/2)*i;
    fin.position.x = Math.sin((Math.PI/2)*i)*0.09;
    fin.position.z = Math.cos((Math.PI/2)*i)*0.09;
    g.add(fin);
  }
  return g;
}

function createExhaust(type: string): THREE.Points {
  const count = type === "nuclear" ? 200 : 120;
  const positions = new Float32Array(count*3);
  const colors    = new Float32Array(count*3);
  for (let i = 0; i < count; i++) {
    const a = Math.random()*Math.PI*2, s = Math.random()*0.12;
    positions[i*3]   = Math.cos(a)*s;
    positions[i*3+1] = -Math.random()*2;
    positions[i*3+2] = Math.sin(a)*s;
    const t = Math.random();
    colors[i*3]   = 1.0;
    colors[i*3+1] = type === "nuclear" ? t*0.9 : (1-t)*0.6;
    colors[i*3+2] = type === "nuclear" ? 0 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors,    3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
  }));
}

function createExplosion(scene: THREE.Scene, pos: THREE.Vector3, type: string) {
  const count = type === "nuclear" ? 200 : type === "cluster" ? 150 : 80;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count*3);
  const vels: THREE.Vector3[] = [];
  const color = type === "nuclear" ? 0x76ff03 : type === "emp" ? 0x00bcd4 : 0xff6600;

  for (let i = 0; i < count; i++) {
    positions[i*3] = pos.x; positions[i*3+1] = pos.y; positions[i*3+2] = pos.z;
    vels.push(new THREE.Vector3(
      (Math.random()-0.5)*0.4, Math.random()*0.5, (Math.random()-0.5)*0.4
    ));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.25, transparent: true, opacity: 1,
  }));
  scene.add(pts);

  let f = 0;
  const anim = () => {
    f++;
    const p = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      p[i*3]   += vels[i].x; p[i*3+1] += vels[i].y; p[i*3+2] += vels[i].z;
      vels[i].y -= 0.015;
    }
    geo.attributes.position.needsUpdate = true;
    (pts.material as THREE.PointsMaterial).opacity = 1 - f/50;
    if (f < 50) requestAnimationFrame(anim);
    else scene.remove(pts);
  };
  anim();
}

// ══════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ══════════════════════════════════════════════════════════
export default function ThreeScene({ buildings, missiles, selectedBuildingId, onCellClick, onBuildingClick }: ThreeSceneProps) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const rendererRef= useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef  = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef   = useRef<number>(0);
  const buildingMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const hpBars         = useRef<Map<string, THREE.Group>>(new Map());
  const missileMeshes  = useRef<Map<string, { group: THREE.Group; exhaust: THREE.Points; data: MissileData }>>(new Map());
  const clickPlaneRef  = useRef<THREE.Mesh | null>(null);
  const buildingGroupsRef = useRef<Map<string, string>>(new Map()); // mesh uuid → building id

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // СЦЕНА
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.015);
    sceneRef.current = scene;

    // КАМЕРА
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 300);
    camera.position.set(0, 28, 22);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // РЕНДЕРЕР
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ОСВЕЩЕНИЕ
    scene.add(new THREE.AmbientLight(0x1a237e, 0.6));
    const moon = new THREE.DirectionalLight(0x7986cb, 1.4);
    moon.position.set(12, 22, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
    moon.shadow.camera.top  =  30; moon.shadow.camera.bottom = -30;
    scene.add(moon);
    scene.add(new THREE.PointLight(0xff1744, 1.2, 35, 2));

    // ЗЕМЛЯ
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE*CELL_SIZE, GRID_SIZE*CELL_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x1b2a1b, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new THREE.GridHelper(GRID_SIZE*CELL_SIZE, GRID_SIZE, 0x1c313a, 0x1c313a));

    // КЛИКАБЕЛЬНАЯ ПЛОСКОСТЬ
    const clickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE*CELL_SIZE, GRID_SIZE*CELL_SIZE),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    clickPlane.rotation.x = -Math.PI/2;
    clickPlane.name = "clickPlane";
    scene.add(clickPlane);
    clickPlaneRef.current = clickPlane;

    // ДЕКОРАТИВНЫЕ ТАНКИ
    const tankGeo = new THREE.BoxGeometry(0.8, 0.3, 0.5);
    const tankMat = mat(0x33691e);
    [-7, 7].forEach((x, i) => {
      const tank = new THREE.Group();
      const hull = new THREE.Mesh(tankGeo, tankMat);
      hull.position.y = 0.15;
      tank.add(hull);
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.2, 8), mat(0x2e7d32));
      turret.position.set(0.05, 0.38, 0);
      tank.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat(0x111111));
      barrel.rotation.z = Math.PI/2; barrel.position.set(0.4, 0.38, 0);
      tank.add(barrel);
      tank.position.set(x, 0, i === 0 ? -8 : 8);
      tank.scale.setScalar(0.7);
      (tank as any)._patrolOffset = i * Math.PI;
      scene.add(tank);
      (scene as any)[`_tank${i}`] = tank;
    });

    // RAYCASTER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left)/rect.width)*2 - 1;
      mouse.y = -((e.clientY - rect.top)/rect.height)*2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Клик по зданию?
      const buildingMeshList: THREE.Object3D[] = [];
      buildingMeshes.current.forEach(g => g.traverse(c => { if ((c as THREE.Mesh).isMesh) buildingMeshList.push(c); }));
      const bHits = raycaster.intersectObjects(buildingMeshList);
      if (bHits.length > 0 && onBuildingClick) {
        let obj: THREE.Object3D | null = bHits[0].object;
        while (obj && obj.parent && !(obj as any).__buildingId) obj = obj.parent;
        if ((obj as any).__buildingId) { onBuildingClick((obj as any).__buildingId); return; }
      }

      // Клик по земле
      const hits = raycaster.intersectObject(clickPlane);
      if (hits.length > 0 && onCellClick) {
        const p = hits[0].point;
        const gx = Math.floor((p.x + GRID_OFFSET)/CELL_SIZE);
        const gy = Math.floor((p.z + GRID_OFFSET)/CELL_SIZE);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) onCellClick(gx, gy);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    // УПРАВЛЕНИЕ КАМЕРОЙ
    let isDown = false, lastX = 0, lastY = 0;
    renderer.domElement.addEventListener("pointerdown", e => { isDown = true; lastX = e.clientX; lastY = e.clientY; });
    renderer.domElement.addEventListener("pointerup",   () => { isDown = false; });
    renderer.domElement.addEventListener("pointermove", e => {
      if (!isDown) return;
      camera.position.x -= (e.clientX - lastX)*0.06;
      camera.position.z -= (e.clientY - lastY)*0.06;
      camera.lookAt(camera.position.x, 0, camera.position.z);
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener("wheel", e => {
      camera.position.y = Math.max(6, Math.min(55, camera.position.y + e.deltaY*0.05));
    });

    window.addEventListener("resize", () => {
      camera.aspect = mount.clientWidth/mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });

    // АНИМАЦИОННЫЙ ЦИКЛ
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const now = Date.now();
      const t = now * 0.0005;

      // Патруль танков
      [0, 1].forEach(i => {
        const tank = (scene as any)[`_tank${i}`];
        if (!tank) return;
        const off = (tank as any)._patrolOffset || 0;
        tank.position.x = (i === 0 ? -7 : 7) + Math.sin(t + off)*2;
        tank.rotation.y = Math.sin(t + off) + (i === 1 ? Math.PI : 0);
      });

      // Вращение тарелок радаров
      buildingMeshes.current.forEach((mesh, id) => {
        const bld = Array.from(buildingMeshes.current.entries()).find(([k]) => k === id);
        if (!bld) return;
        // Ищем тарелку внутри группы
        mesh.traverse(c => {
          if ((c as any).__isRadarDish) c.rotation.y += 0.02;
        });
      });

      // HP бары смотрят на камеру
      hpBars.current.forEach(bar => { bar.lookAt(camera.position); });

      // Ракеты
      missileMeshes.current.forEach((entry, id) => {
        const { group, exhaust, data } = entry;
        const elapsed = (now - data.launchTime)/1000;
        const total   = (data.impactTime - data.launchTime)/1000;
        const tRatio  = Math.min(elapsed/total, 1);

        const wx = (data.startX + (data.targetX - data.startX)*tRatio)*CELL_SIZE - GRID_OFFSET;
        const wz = (data.startY + (data.targetY - data.startY)*tRatio)*CELL_SIZE - GRID_OFFSET;
        const wy = 18 * 4 * tRatio * (1 - tRatio);
        group.position.set(wx, wy, wz);

        const t2 = Math.min(tRatio + 0.01, 1);
        const nx = (data.startX + (data.targetX - data.startX)*t2)*CELL_SIZE - GRID_OFFSET;
        const nz = (data.startY + (data.targetY - data.startY)*t2)*CELL_SIZE - GRID_OFFSET;
        const ny = 18 * 4 * t2 * (1 - t2);
        group.lookAt(nx, ny, nz);

        (exhaust.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(now*0.02)*0.3;

        if (tRatio >= 1) {
          createExplosion(scene, group.position.clone(), data.missileType || "standard");
          scene.remove(group);
          missileMeshes.current.delete(id);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener("click", handleClick);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // СИНХРОНИЗАЦИЯ ЗДАНИЙ
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(buildings.map(b => b.id));

    // Удаляем старые
    buildingMeshes.current.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        buildingMeshes.current.delete(id);
        const bar = hpBars.current.get(id);
        if (bar) { scene.remove(bar); hpBars.current.delete(id); }
      }
    });

    buildings.forEach(b => {
      const wx = b.x * CELL_SIZE - GRID_OFFSET + CELL_SIZE/2;
      const wz = b.y * CELL_SIZE - GRID_OFFSET + CELL_SIZE/2;

      if (buildingMeshes.current.has(b.id)) {
        // Обновляем существующее — только HP бар
        const bar = hpBars.current.get(b.id);
        if (bar) {
          scene.remove(bar);
          hpBars.current.delete(b.id);
        }
        if (b.hp < b.maxHp) {
          const newBar = createHpBar(b.hp, b.maxHp);
          newBar.position.set(wx, 3.5, wz);
          scene.add(newBar);
          hpBars.current.set(b.id, newBar);
        }

        // Если уровень изменился — пересоздаём меш
        const existing = buildingMeshes.current.get(b.id);
        if (existing && (existing as any).__level !== b.level) {
          scene.remove(existing);
          buildingMeshes.current.delete(b.id);
          // Упадёт в ветку "создание нового" на следующем рендере
        }
        return;
      }

      // Создаём новый
      const mesh = createBuildingMesh(b.type, b.level);
      mesh.position.set(wx, 0, wz);
      (mesh as any).__level = b.level;
      (mesh as any).__buildingId = b.id;
      mesh.traverse(c => { (c as any).__buildingId = b.id; });

      // Помечаем тарелку у радара
      if (b.type === "radar") {
        mesh.traverse(c => {
          if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry instanceof THREE.SphereGeometry) {
            (c as any).__isRadarDish = true;
          }
        });
      }

      // Подсветка выбранного здания
      if (b.id === selectedBuildingId) {
        mesh.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            m.emissive = new THREE.Color(0xffd700);
            m.emissiveIntensity = 0.4;
          }
        });
      }

      // Полупрозрачность при строительстве
      if (b.isBuilding || b.isUpgrading) {
        mesh.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            m.transparent = true; m.opacity = 0.45;
          }
        });
      }

      scene.add(mesh);
      buildingMeshes.current.set(b.id, mesh);
    });
  }, [buildings, selectedBuildingId]);

  // СИНХРОНИЗАЦИЯ РАКЕТ
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(missiles.map(m => m.id));
    missileMeshes.current.forEach((entry, id) => {
      if (!currentIds.has(id)) { scene.remove(entry.group); missileMeshes.current.delete(id); }
    });

    missiles.forEach(m => {
      if (missileMeshes.current.has(m.id)) return;
      const group = new THREE.Group();
      group.add(createMissile3D(m.missileType || "standard"));
      const exhaust = createExhaust(m.missileType || "standard");
      group.add(exhaust);
      scene.add(group);
      missileMeshes.current.set(m.id, { group, exhaust, data: m });
    });
  }, [missiles]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "crosshair" }} />;
}