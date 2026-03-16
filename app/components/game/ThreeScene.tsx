"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ============================================================
// ТИПЫ
// ============================================================
interface Building {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isBuilding: boolean;
}

interface MissileData {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  launchTime: number;
  impactTime: number;
}

interface ThreeSceneProps {
  buildings: Building[];
  missiles: MissileData[];
  onCellClick?: (x: number, y: number) => void;
}

// ============================================================
// КОНСТАНТЫ
// ============================================================
const GRID_SIZE   = 20;   // 20x20 клеток
const CELL_SIZE   = 2;    // размер клетки в юнитах Three.js
const GRID_OFFSET = (GRID_SIZE * CELL_SIZE) / 2;

// ============================================================
// ЦВЕТА ЗДАНИЙ
// ============================================================
const BUILDING_COLORS: Record<string, number> = {
  barracks:     0x4a7c59,
  radar:        0x2196f3,
  missile_silo: 0xb71c1c,
  anti_missile: 0x7b1fa2,
  wall:         0x607d8b,
};

// ============================================================
// СОЗДАНИЕ ТАНКА (из примитивов, современный вид)
// ============================================================
function createTank(color = 0x4a5c3a): THREE.Group {
  const tank = new THREE.Group();

  const mat = (c: number, metalness = 0.5, roughness = 0.6) =>
    new THREE.MeshStandardMaterial({ color: c, metalness, roughness });

  // Гусеницы (2 шт)
  [-0.65, 0.65].forEach(zOffset => {
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.35, 0.55),
      mat(0x2a2a2a, 0.8, 0.9)
    );
    track.position.set(0, 0, zOffset);
    tank.add(track);

    // Катки
    for (let i = -1.2; i <= 1.2; i += 0.6) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.15, 10),
        mat(0x333333, 0.9, 0.4)
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(i, -0.08, zOffset);
      tank.add(wheel);
    }
  });

  // Корпус
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.6, 1.2),
    mat(color)
  );
  hull.position.y = 0.3;
  tank.add(hull);

  // Скошенный передний бронелист
  const frontArmor = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.55, 1.18),
    mat(color)
  );
  frontArmor.position.set(1.4, 0.32, 0);
  frontArmor.rotation.z = -0.3;
  tank.add(frontArmor);

  // Башня
  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.5, 8),
    mat(color * 0.9)
  );
  turret.position.set(-0.1, 0.85, 0);
  tank.add(turret);

  // Командирский люк
  const hatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.15, 8),
    mat(0x333333, 0.9, 0.3)
  );
  hatch.position.set(-0.2, 1.15, 0);
  tank.add(hatch);

  // Ствол орудия
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8),
    mat(0x1a1a1a, 0.95, 0.2)
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.3, 0.88, 0);
  tank.add(barrel);

  // Дульный тормоз
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.06, 0.25, 8),
    mat(0x111111, 0.95, 0.1)
  );
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(2.52, 0.88, 0);
  tank.add(muzzle);

  // Антенна
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4),
    mat(0x555555)
  );
  antenna.position.set(-0.5, 1.5, 0.3);
  tank.add(antenna);

  tank.castShadow = true;
  return tank;
}

// ============================================================
// СОЗДАНИЕ РАКЕТЫ (баллистическая, современный вид)
// ============================================================
function createMissile3D(): THREE.Group {
  const group = new THREE.Group();

  const mat = (c: number, metalness = 0.8, roughness = 0.2) =>
    new THREE.MeshStandardMaterial({ color: c, metalness, roughness });

  // Основной корпус
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 1.6, 10),
    mat(0xbdbdbd)
  );
  group.add(body);

  // Носовой конус
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.5, 10),
    mat(0xef5350)
  );
  nose.position.y = 1.05;
  group.add(nose);

  // Хвостовые стабилизаторы (4 шт)
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.35, 0.22),
      mat(0x90a4ae)
    );
    fin.position.y = -0.65;
    fin.rotation.y = (Math.PI / 2) * i;
    fin.position.x = Math.sin((Math.PI / 2) * i) * 0.09;
    fin.position.z = Math.cos((Math.PI / 2) * i) * 0.09;
    group.add(fin);
  }

  // Сопло
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.09, 0.2, 8),
    mat(0x37474f, 0.9, 0.5)
  );
  nozzle.position.y = -0.9;
  group.add(nozzle);

  return group;
}

// ============================================================
// ХВОСТ ОГНЯ (particle system)
// ============================================================
function createExhaustParticles(): THREE.Points {
  const count = 120;
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const spread = Math.random() * 0.12;
    const angle  = Math.random() * Math.PI * 2;
    positions[i * 3]     = Math.cos(angle) * spread;
    positions[i * 3 + 1] = -Math.random() * 1.5;
    positions[i * 3 + 2] = Math.sin(angle) * spread;

    // Градиент: жёлтый → оранжевый → красный
    const t = Math.random();
    colors[i * 3]     = 1.0;
    colors[i * 3 + 1] = (1.0 - t) * 0.6;
    colors[i * 3 + 2] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }));
}

// ============================================================
// СОЗДАНИЕ ЗДАНИЯ
// ============================================================
function createBuilding(type: string): THREE.Group {
  const group = new THREE.Group();
  const color = BUILDING_COLORS[type] || 0x888888;

  const mat = (c: number) => new THREE.MeshStandardMaterial({
    color: c, roughness: 0.7, metalness: 0.3
  });

  switch (type) {
    case "barracks": {
      // Главное строение
      const main = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), mat(color));
      main.position.y = 0.45;
      group.add(main);
      // Крыша
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 0.4, 4),
        mat(0x2e7d32)
      );
      roof.position.y = 1.1;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      break;
    }
    case "radar": {
      // Мачта
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6),
        mat(0x546e7a)
      );
      pole.position.y = 0.75;
      group.add(pole);
      // Тарелка радара
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(color)
      );
      dish.position.y = 1.6;
      dish.rotation.x = -0.4;
      group.add(dish);
      // Основание
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), mat(0x37474f));
      base.position.y = 0.1;
      group.add(base);
      break;
    }
    case "missile_silo": {
      // Шахта (углублённая)
      const silo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 1.2, 10),
        mat(color)
      );
      silo.position.y = 0.4;
      group.add(silo);
      // Крышка
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10),
        mat(0x37474f)
      );
      lid.position.y = 1.05;
      group.add(lid);
      // Мини ракета торчит
      const miniMissile = createMissile3D();
      miniMissile.scale.setScalar(0.5);
      miniMissile.position.y = 0.8;
      group.add(miniMissile);
      break;
    }
    case "anti_missile": {
      // Пусковая установка
      const launcher = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), mat(color));
      launcher.position.y = 0.2;
      group.add(launcher);
      // Три трубы
      [-0.25, 0, 0.25].forEach(xOff => {
        const tube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8),
          mat(0x37474f)
        );
        tube.rotation.x = -0.6;
        tube.position.set(xOff, 0.75, -0.1);
        group.add(tube);
      });
      break;
    }
    case "wall": {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.3), mat(color));
      wall.position.y = 0.4;
      group.add(wall);
      // Зубцы
      for (let i = -0.6; i <= 0.6; i += 0.6) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.3), mat(color));
        merlon.position.set(i, 1.0, 0);
        group.add(merlon);
      }
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(color));
      box.position.y = 0.5;
      group.add(box);
    }
  }

  group.castShadow = true;
  group.receiveShadow = true;
  return group;
}

// ============================================================
// ВЗРЫВ
// ============================================================
function createExplosion(scene: THREE.Scene, position: THREE.Vector3) {
  const particles = 80;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(particles * 3);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < particles; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.3,
    ));
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xff6600, size: 0.2, transparent: true, opacity: 1,
  }));
  scene.add(points);

  let frame = 0;
  const animate = () => {
    frame++;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < particles; i++) {
      pos[i * 3]     += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;
      velocities[i].y -= 0.01;
    }
    geo.attributes.position.needsUpdate = true;
    (points.material as THREE.PointsMaterial).opacity = 1 - frame / 40;

    if (frame < 40) requestAnimationFrame(animate);
    else scene.remove(points);
  };
  animate();
}

// ============================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================
export default function ThreeScene({ buildings, missiles, onCellClick }: ThreeSceneProps) {
  const mountRef     = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const buildingMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const missileMeshes  = useRef<Map<string, {
    group: THREE.Group; exhaust: THREE.Points; data: MissileData;
  }>>(new Map());
  const frameRef     = useRef<number>(0);

  // --- ИНИЦИАЛИЗАЦИЯ СЦЕНЫ ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.Fog(0x0a0f1e, 30, 80);
    sceneRef.current = scene;

    // Камера
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 25, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // === ОСВЕЩЕНИЕ ===
    // Тёмно-синий ambient (ночная атмосфера)
    scene.add(new THREE.AmbientLight(0x1a237e, 0.5));

    // Основной направленный свет (луна)
    const moonLight = new THREE.DirectionalLight(0x7986cb, 1.2);
    moonLight.position.set(10, 20, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.camera.left = -30;
    moonLight.shadow.camera.right = 30;
    moonLight.shadow.camera.top = 30;
    moonLight.shadow.camera.bottom = -30;
    scene.add(moonLight);

    // Красный прожектор (боевая атмосфера)
    const warLight = new THREE.PointLight(0xff1744, 1.5, 30);
    warLight.position.set(-5, 8, -5);
    scene.add(warLight);

    // === ЗЕМЛЯ ===
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1b2a1b,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // === СЕТКА ===
    const gridHelper = new THREE.GridHelper(
      GRID_SIZE * CELL_SIZE,
      GRID_SIZE,
      0x263238,
      0x1c313a
    );
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // === ДЕКОРАТИВНЫЕ ТАНКИ ===
    // Два патрульных танка по краям базы
    const tank1 = createTank(0x4a5c3a);
    tank1.position.set(-8, 0, -8);
    tank1.scale.setScalar(0.5);
    scene.add(tank1);

    const tank2 = createTank(0x33691e);
    tank2.position.set(8, 0, 8);
    tank2.rotation.y = Math.PI;
    tank2.scale.setScalar(0.5);
    scene.add(tank2);

    // === КЛИКАБЕЛЬНАЯ ПЛОСКОСТЬ ===
    const clickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickPlane.rotation.x = -Math.PI / 2;
    clickPlane.name = "clickPlane";
    scene.add(clickPlane);

    // === RAYCASTER ДЛЯ КЛИКОВ ===
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(clickPlane);
      if (hits.length > 0 && onCellClick) {
        const p = hits[0].point;
        const gx = Math.floor((p.x + GRID_OFFSET) / CELL_SIZE);
        const gy = Math.floor((p.z + GRID_OFFSET) / CELL_SIZE);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          onCellClick(gx, gy);
        }
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    // === УПРАВЛЕНИЕ КАМЕРОЙ (простое) ===
    let isPointerDown = false;
    let lastX = 0, lastY = 0;
    renderer.domElement.addEventListener("pointerdown", e => {
      isPointerDown = true; lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener("pointerup", () => { isPointerDown = false; });
    renderer.domElement.addEventListener("pointermove", e => {
      if (!isPointerDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      camera.position.x -= dx * 0.05;
      camera.position.z -= dy * 0.05;
      camera.lookAt(camera.position.x, 0, camera.position.z);
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener("wheel", e => {
      camera.position.y = Math.max(5, Math.min(50, camera.position.y + e.deltaY * 0.05));
    });

    // === RESIZE ===
    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // === АНИМАЦИОННЫЙ ЦИКЛ ===
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const now = Date.now();

      // Анимируем танки (патрулирование)
      const t = now * 0.0005;
      tank1.position.x = -8 + Math.sin(t) * 2;
      tank1.rotation.y = Math.sin(t);
      tank2.position.x =  8 + Math.sin(t + Math.PI) * 2;
      tank2.rotation.y = Math.sin(t + Math.PI) + Math.PI;

      // Анимируем ракеты
      missileMeshes.current.forEach((entry, id) => {
        const { group, exhaust, data } = entry;
        const elapsed = (now - data.launchTime) / 1000;
        const total   = (data.impactTime - data.launchTime) / 1000;
        const t = Math.min(elapsed / total, 1);

        // Парабола
        const x = data.startX + (data.targetX - data.startX) * t;
        const z = data.startY + (data.targetY - data.startY) * t;
        const y = 15 * 4 * t * (1 - t); // высота параболы

        group.position.set(
          x * CELL_SIZE - GRID_OFFSET,
          y,
          z * CELL_SIZE - GRID_OFFSET
        );

        // Ракета смотрит по направлению движения
        const t2 = Math.min(t + 0.01, 1);
        const nx = data.startX + (data.targetX - data.startX) * t2;
        const nz = data.startY + (data.targetY - data.startY) * t2;
        const ny = 15 * 4 * t2 * (1 - t2);
        group.lookAt(
          nx * CELL_SIZE - GRID_OFFSET,
          ny,
          nz * CELL_SIZE - GRID_OFFSET
        );

        // Мерцание хвоста
        (exhaust.material as THREE.PointsMaterial).opacity =
          0.6 + Math.sin(now * 0.02) * 0.3;

        // Когда долетела — взрыв
        if (t >= 1) {
          createExplosion(scene, group.position.clone());
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
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // --- СИНХРОНИЗАЦИЯ ЗДАНИЙ ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(buildings.map(b => b.id));

    // Удаляем старые
    buildingMeshes.current.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        buildingMeshes.current.delete(id);
      }
    });

    // Добавляем новые
    buildings.forEach(b => {
      if (buildingMeshes.current.has(b.id)) return;

      const mesh = createBuilding(b.type);
      const wx = b.x * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2;
      const wz = b.y * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2;
      mesh.position.set(wx, 0, wz);

      // Полупрозрачность во время строительства
      if (b.isBuilding) {
        mesh.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).transparent = true;
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5;
          }
        });
      }

      scene.add(mesh);
      buildingMeshes.current.set(b.id, mesh);
    });
  }, [buildings]);

  // --- СИНХРОНИЗАЦИЯ РАКЕТ ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(missiles.map(m => m.id));

    // Удаляем ракеты которых уже нет
    missileMeshes.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        scene.remove(entry.group);
        missileMeshes.current.delete(id);
      }
    });

    // Добавляем новые
    missiles.forEach(m => {
      if (missileMeshes.current.has(m.id)) return;

      const missileGroup = new THREE.Group();
      const missile3d = createMissile3D();
      missileGroup.add(missile3d);

      const exhaust = createExhaustParticles();
      missileGroup.add(exhaust);

      scene.add(missileGroup);
      missileMeshes.current.set(m.id, {
        group: missileGroup,
        exhaust,
        data: m,
      });
    });
  }, [missiles]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%", cursor: "crosshair" }}
    />
  );
}