import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

// Типы для управления анимациями
type Direction = 'south' | 'north' | 'west' | 'east';
type Action = 'stand' | 'walk';

interface PlayerContainer extends PIXI.Container {
    sprite: PIXI.AnimatedSprite;
    lastX: number;
    lastY: number;
    currentDir: Direction;
    currentAction: Action;
    textures: Record<string, PIXI.Texture[]>; // Кэш текстур для этого класса
}

export class GameEngine {
  app!: PIXI.Application;
  viewport!: Viewport;
  room: Room | null = null;
  mapManager!: MapManager;
  
  players: Map<string, PlayerContainer> = new Map();

  // Размеры из Legacy кода
  tileSize = 64; // Размер кадра в спрайтшите

  constructor() {}

  async init(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application();
    
    await this.app.init({
      canvas: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: 'webgl',
    });

    // 1. Создаем камеру
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, 
      worldHeight: 4000,
      events: this.app.renderer.events
    });

    this.app.stage.addChild(this.viewport);

    // 2. ВАЖНО: Включаем сортировку для Z-Index (чтобы персонаж заходил ЗА объекты)
    this.viewport.sortableChildren = true;

    // Настройки камеры
    this.viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clamp({ direction: 'all' });

    // 3. Загружаем ресурсы
    await this.loadCharacterAssets();

    // 4. Инициализируем карту
    this.mapManager = new MapManager();
    // Контейнер карты тоже добавляем в viewport
    this.viewport.addChild(this.mapManager.container);

    window.addEventListener('resize', this.onResize);
  }

  async loadCharacterAssets() {
    const assets = [
        { alias: 'warrior', src: '/images/character_sprite/warrior.png' },
        { alias: 'knight', src: '/images/character_sprite/knight.png' },
        { alias: 'archer', src: '/images/character_sprite/archer.png' },
        { alias: 'mage', src: '/images/character_sprite/mage.png' },
        { alias: 'priest', src: '/images/character_sprite/priest.png' },
    ];

    try {
        await PIXI.Assets.load(assets);
    } catch (e) {
        console.error("Ошибка загрузки персонажей:", e);
    }
  }

  attachRoom(room: Room) {
    this.room = room;

    // Обработка карты
    room.onMessage("mapData", async (mapData: any[][]) => {
        const dims = await this.mapManager.render(mapData);
        this.viewport.resize(window.innerWidth, window.innerHeight, dims.width, dims.height);
        this.viewport.plugins.remove('clamp');
        this.viewport.clamp({ direction: 'all' });
    });

    room.send("requestMap");

    // Обработка игроков
    room.state.players.onAdd = (player: any, sessionId: string) => {
       this.createPlayer(sessionId, player);
       
       // ПРИВЯЗКА КАМЕРЫ (Как в Legacy)
       if (sessionId === room.sessionId) {
           const p = this.players.get(sessionId);
           if (p) {
               console.log("Camera attached to player:", player.name);
               this.viewport.follow(p, { speed: 0 }); // speed: 0 = мгновенное следование
           }
       }

       player.onChange = () => {
           this.updatePlayer(sessionId, player);
       };
    };

    room.state.players.onRemove = (player: any, sessionId: string) => {
       this.removePlayer(sessionId);
    };
  }

  /**
   * Нарезка текстур по правилам Legacy main.js
   */
  getCharacterTextures(skinName: string) {
      const baseTexture = PIXI.Assets.get(skinName).source;
      const w = this.tileSize;
      const h = this.tileSize;

      // Вспомогательная функция для создания массива текстур
      const createAnim = (row: number, colStart: number, count: number) => {
          const textures = [];
          for (let i = 0; i < count; i++) {
              textures.push(new PIXI.Texture({
                  source: baseTexture,
                  frame: new PIXI.Rectangle((colStart + i) * w, row * w, w, h)
              }));
          }
          return textures;
      };

      // Схема из Legacy кода:
      // standSouth: Row 10, Col 0 (1 frame)
      // walkSouth:  Row 10, Col 1..8 (8 frames)
      // standWest:  Row 9, Col 0
      // walkWest:   Row 9, Col 1..8
      // standNorth: Row 8, Col 0
      // walkNorth:  Row 8, Col 1..8
      // standEast:  Row 11, Col 0
      // walkEast:   Row 11, Col 1..8
      
      return {
          'stand_south': createAnim(10, 0, 1),
          'walk_south':  createAnim(10, 1, 8),
          
          'stand_west':  createAnim(9, 0, 1),
          'walk_west':   createAnim(9, 1, 8),
          
          'stand_north': createAnim(8, 0, 1),
          'walk_north':  createAnim(8, 1, 8),
          
          'stand_east':  createAnim(11, 0, 1),
          'walk_east':   createAnim(11, 1, 8),
      };
  }

  createPlayer(sessionId: string, data: any) {
     const container = new PIXI.Container() as PlayerContainer;
     
     const classNames = ['warrior', 'knight', 'archer', 'mage', 'priest'];
     const skinIndex = data.skin !== undefined ? data.skin : 0; 
     const skinName = classNames[skinIndex] || 'warrior';

     // 1. Нарезаем текстуры
     try {
         container.textures = this.getCharacterTextures(skinName);
     } catch(e) {
         console.error("Texture error", e);
         // Fallback если текстура не загрузилась
         const g = new PIXI.Graphics().circle(0,0,20).fill({color: 0xff0000});
         container.addChild(g);
         this.players.set(sessionId, container);
         this.viewport.addChild(container);
         return;
     }

     // 2. Создаем AnimatedSprite (по умолчанию стоит лицом вниз)
     const sprite = new PIXI.AnimatedSprite(container.textures['stand_south']);
     sprite.anchor.set(0.5, 0.5); // Центр спрайта
     sprite.animationSpeed = 0.2; // Скорость анимации
     sprite.width = 60;
     sprite.height = 60;
     sprite.play();
     
     container.sprite = sprite;
     container.addChild(sprite);

     // 3. Имя персонажа
     const text = new PIXI.Text({
         text: data.name, 
         style: {
             fontSize: 14, 
             fill: 0xffffff,
             stroke: { width: 3, color: 0x000000 },
             fontWeight: 'bold',
             fontFamily: 'Arial'
         }
     });
     text.anchor.set(0.5, 2.0);
     container.addChild(text);
     
     // 4. Координаты
     container.x = data.x;
     container.y = data.y;
     
     // Инициализируем данные для дельты
     container.lastX = data.x;
     container.lastY = data.y;
     container.currentDir = 'south';
     container.currentAction = 'stand';

     // 5. Z-Index (Сортировка по Y)
     container.zIndex = data.y;

     this.viewport.addChild(container);
     this.players.set(sessionId, container);
  }

  updatePlayer(sessionId: string, data: any) {
      const p = this.players.get(sessionId);
      if (!p || !p.sprite) return;

      const newX = data.x;
      const newY = data.y;

      // 1. Вычисляем направление движения (Дельта)
      const dx = newX - p.lastX;
      const dy = newY - p.lastY;

      // Порог чувствительности (чтобы не дергался из-за микросдвигов)
      const threshold = 0.5;
      
      let isMoving = false;
      let newDir = p.currentDir;

      // Определение направления (приоритет Y, как в изометрии часто бывает, или по большей дельте)
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          isMoving = true;
          if (Math.abs(dx) > Math.abs(dy)) {
              newDir = dx > 0 ? 'east' : 'west';
          } else {
              newDir = dy > 0 ? 'south' : 'north';
          }
      }

      // 2. Обновляем анимацию только если изменилось состояние
      const newAction = isMoving ? 'walk' : 'stand';
      const animKey = `${newAction}_${newDir}`; // например 'walk_north'

      if (p.currentAction !== newAction || p.currentDir !== newDir) {
          if (p.textures[animKey]) {
              p.sprite.textures = p.textures[animKey];
              p.sprite.play();
          }
          p.currentDir = newDir;
          p.currentAction = newAction;
      }

      // 3. Обновляем позицию
      p.x = newX;
      p.y = newY;
      
      // 4. Обновляем историю
      p.lastX = newX;
      p.lastY = newY;

      // 5. Обновляем Z-Index для перекрытия (персонаж ниже - слой выше)
      p.zIndex = newY;
  }

  removePlayer(sessionId: string) {
      const p = this.players.get(sessionId);
      if (p) {
          this.viewport.removeChild(p);
          p.destroy();
          this.players.delete(sessionId);
      }
  }

  onResize = () => {
    if (!this.app || !this.app.renderer) return;
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.viewport.resize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.app) {
        this.app.destroy(true, { children: true });
    }
  }
}