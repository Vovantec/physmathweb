import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

export class GameEngine {
  app!: PIXI.Application;
  viewport!: Viewport;
  room: Room | null = null;
  mapManager!: MapManager;
  
  // Храним ссылки на контейнеры игроков
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

    // Создаем камеру (Viewport)
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 1000, // Временное значение, обновится при загрузке карты
      worldHeight: 1000,
      events: this.app.renderer.events // Важно для обработки кликов Pixi 8
    });

    this.app.stage.addChild(this.viewport);
    
    // Включаем сортировку внутри вьюпорта (для Z-Index)
    this.viewport.sortableChildren = true;

    // Плагины камеры
    this.viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clamp({ direction: 'all' }); // Запрещаем улетать за карту

    // Загрузка спрайтов персонажей
    await this.loadCharacterAssets();

    // Инициализация менеджера карты
    this.mapManager = new MapManager();
    // Добавляем контейнер карты в вьюпорт
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

    // 1. Принимаем карту, рендерим и обновляем границы камеры
    room.onMessage("mapData", async (mapData: any[][]) => {
        console.log("Получена карта...");
        const dims = await this.mapManager.render(mapData);
        
        // Обновляем размеры мира камеры
        this.viewport.resize(window.innerWidth, window.innerHeight, dims.width, dims.height);
        
        // Обновляем плагин ограничения границ
        this.viewport.plugins.remove('clamp');
        this.viewport.clamp({ direction: 'all' });
        
        console.log(`Мир обновлен: ${dims.width}x${dims.height}`);
    });

    room.send("requestMap");

    // Обработка игроков
    room.state.players.onAdd = (player: any, sessionId: string) => {
       this.createPlayer(sessionId, player);
       
       // Если это наш персонаж — следим камерой
       if (sessionId === room.sessionId) {
           const p = this.players.get(sessionId);
           if (p) this.viewport.follow(p, { speed: 0, acceleration: 0 }); // Мгновенное слежение
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
     
     const classNames = ['warrior', 'knight', 'archer', 'mage', 'priest'];
     const skinIndex = data.skin !== undefined ? data.skin : 0; 
     const skinName = classNames[skinIndex] || 'warrior';
     
     try {
         const texture = PIXI.Assets.get(skinName);
         // Берем первый кадр (Stand South) как в main.js
         const frameSize = 64;
         const standTexture = new PIXI.Texture({
             source: texture.source,
             frame: new PIXI.Rectangle(0, 10 * frameSize, frameSize, frameSize)
         });
         
         const sprite = new PIXI.Sprite(standTexture);
         sprite.anchor.set(0.5, 0.5); // Центрируем спрайт
         sprite.width = 60; 
         sprite.height = 60;
         container.addChild(sprite);
         
     } catch (e) {
         // Фолбек
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
     text.anchor.set(0.5, 2.0); // Текст над головой
     container.addChild(text);
     
     container.x = data.x;
     container.y = data.y;
     
     // ВАЖНО: Устанавливаем Z-Index равным Y координате для правильного перекрытия
     container.zIndex = data.y;

     this.viewport.addChild(container);
     this.players.set(sessionId, container);
  }

  updatePlayer(sessionId: string, data: any) {
      const p = this.players.get(sessionId);
      if (p) {
          p.x = data.x;
          p.y = data.y;
          // Обновляем слой при движении
          p.zIndex = data.y;
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