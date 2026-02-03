import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

export class GameEngine {
  app!: PIXI.Application;
  viewport!: Viewport;
  room: Room | null = null;
  mapManager!: MapManager;
  
  players: Map<string, PIXI.Container> = new Map();

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

    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, 
      worldHeight: 4000,
      events: this.app.renderer.events
    });

    this.app.stage.addChild(this.viewport);
    this.viewport.drag().pinch().wheel().decelerate();

    // Загружаем только персонажей (карта будет грузиться динамически)
    await this.loadCharacterAssets();

    this.mapManager = new MapManager();
    this.viewport.addChild(this.mapManager.container);

    window.addEventListener('resize', this.onResize);
  }

  async loadCharacterAssets() {
    // Пути как в Legacy коде
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

    // 1. Принимаем карту и рендерим её
    room.onMessage("mapData", (mapData: any[][]) => {
        console.log("Получена карта, начинаем рендер...");
        this.mapManager.render(mapData);
    });

    // 2. Запрашиваем карту только когда готовы
    room.send("requestMap");

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
     
     // Выбор спрайта
     const classNames = ['warrior', 'knight', 'archer', 'mage', 'priest'];
     // В Legacy 'skin' был индексом в массиве
     const skinIndex = data.skin !== undefined ? data.skin : 0; 
     const skinName = classNames[skinIndex] || 'warrior';
     
     try {
         const texture = PIXI.Assets.get(skinName);
         // Legacy спрайты - это листы. Берем первый кадр (Stand South)
         // В main.js: new PIXI.Rectangle(0, 10*64, 64, 64)
         const frameSize = 64;
         const standTexture = new PIXI.Texture({
             source: texture.source,
             frame: new PIXI.Rectangle(0, 10 * frameSize, frameSize, frameSize)
         });
         
         const sprite = new PIXI.Sprite(standTexture);
         sprite.anchor.set(0.5);
         sprite.width = 60; 
         sprite.height = 60;
         container.addChild(sprite);
         
     } catch (e) {
         // Фолбек - красный круг
         const graphics = new PIXI.Graphics();
         graphics.circle(0, 0, 15);
         graphics.fill({ color: 0xFF0000 });
         container.addChild(graphics);
     }

     // Имя
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
     text.anchor.set(0.5, 2.5);

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