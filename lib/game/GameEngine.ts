import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

export class GameEngine {
  app!: PIXI.Application;
  viewport!: Viewport;
  room: Room | null = null;
  mapManager!: MapManager;
  
  // Кэш текстур персонажей
  characterTextures: Record<number, PIXI.Texture> = {};
  
  players: Map<string, PIXI.Container> = new Map();

  constructor() { }

  async init(canvas: HTMLCanvasElement) {
    // 1. Инициализация PixiJS v8
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

    // 2. Инициализация камеры (pixi-viewport v6+)
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, 
      worldHeight: 4000,
      events: this.app.renderer.events // Исправление для v8
    });

    this.app.stage.addChild(this.viewport);
    this.viewport.drag().pinch().wheel().decelerate();

    // 3. Загрузка ресурсов (ВАЖНО!)
    await this.loadAssets();

    // 4. Инициализация карты
    this.mapManager = new MapManager();
    this.viewport.addChild(this.mapManager.container);
    
    // Передаем загруженный тайлсет в менеджер карт
    // Предполагаем, что у вас есть общий tileset.png. 
    // Если его нет, создайте его или используйте атлас.
    try {
        const tileset = PIXI.Assets.get('tileset');
        if (tileset) {
            this.mapManager.loadTextures(tileset);
        }
    } catch (e) { console.warn("Tileset texture not found"); }

    window.addEventListener('resize', this.onResize);
  }

  async loadAssets() {
    // Здесь мы загружаем графику.
    // Если файлов нет, Pixi выдаст ошибку, но игра не упадет.
    const assets = [
        { alias: 'tileset', src: '/images/tileset.png' },
        { alias: 'warrior', src: '/images/character_sprite/warrior.png' },
        { alias: 'knight', src: '/images/character_sprite/knight.png' },
        { alias: 'archer', src: '/images/character_sprite/archer.png' },
        { alias: 'mage', src: '/images/character_sprite/mage.png' },
        { alias: 'priest', src: '/images/character_sprite/priest.png' },
    ];

    try {
        await PIXI.Assets.load(assets);
    } catch (e) {
        console.error("Ошибка загрузки ассетов:", e);
    }
  }

  attachRoom(room: Room) {
    this.room = room;

    // 1. Слушаем приход карты
    room.onMessage("mapData", (mapData: any[][]) => {
        console.log("Map data received, rendering...");
        this.mapManager.render(mapData);
    });

    // 2. Запрашиваем карту (ТЕПЕРЬ БЕЗОПАСНО, т.к. слушатель выше уже готов)
    room.send("requestMap");

    // Обработка игроков
    room.state.players.onAdd = (player: any, sessionId: string) => {
       this.createPlayer(sessionId, player);
       
       if (sessionId === room.sessionId) {
           const p = this.players.get(sessionId);
           if (p) this.viewport.follow(p);
       }

       player.onChange = () => {
           this.updatePlayer(sessionId, player);
       };
    };

    room.state.players.onRemove = (player: any, sessionId: string) => {
       this.removePlayer(sessionId);
    };
  }

  createPlayer(sessionId: string, data: any) {
     const container = new PIXI.Container();
     
     // Попытка создать спрайт вместо кружка
     let sprite: PIXI.Sprite | PIXI.Graphics;
     
     const classNames = ['warrior', 'knight', 'archer', 'mage', 'priest'];
     const skinName = classNames[data.skin] || 'warrior';
     
     try {
         // Пытаемся взять текстуру из загруженных
         const texture = PIXI.Assets.get(skinName);
         if (texture) {
             // Если это спрайтшит (как в старом коде), нужно вырезать кадр.
             // Для простоты берем весь кадр или верхний левый квадрат 64x64
             // В старом коде p=64, Rectangle(0, 10*p, p, p) - standSouth
             const frameSize = 64;
             // Создаем текстуру для стояния (примерно как в старом коде)
             const standTexture = new PIXI.Texture({
                 source: texture.source,
                 frame: new PIXI.Rectangle(0, 10 * frameSize, frameSize, frameSize)
             });
             
             sprite = new PIXI.Sprite(standTexture);
             sprite.anchor.set(0.5);
             sprite.width = 60; // sizeObj * 1.5 примерно
             sprite.height = 60;
         } else {
             throw new Error("No texture");
         }
     } catch (e) {
         // Фолбек на кружок, если текстура не загрузилась
         const graphics = new PIXI.Graphics();
         const color = sessionId === this.room?.sessionId ? 0x00FF00 : 0xFF0000;
         graphics.circle(0, 0, 15);
         graphics.fill(color);
         sprite = graphics;
     }

     const text = new PIXI.Text({
         text: data.name, 
         style: {
             fontSize: 14, 
             fill: 0xffffff,
             stroke: { width: 3, color: 0x000000 },
             fontWeight: 'bold'
         }
     });
     text.anchor.set(0.5, 2.5); // Над головой

     container.addChild(sprite);
     container.addChild(text);
     
     container.x = data.x;
     container.y = data.y;
     container.zIndex = 100; 

     this.viewport.addChild(container);
     this.players.set(sessionId, container);
  }

  updatePlayer(sessionId: string, data: any) {
      const p = this.players.get(sessionId);
      if (p) {
          // Плавная интерполяция была бы лучше, но пока телепорт
          p.x = data.x;
          p.y = data.y;
      }
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