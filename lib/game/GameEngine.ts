import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

export class GameEngine {
  app: PIXI.Application;
  viewport: Viewport;
  room: Room | null = null;
  mapManager: MapManager;
  
  players: Map<string, PIXI.Container> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Инициализация камеры
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, // Увеличили мир
      worldHeight: 4000,
      events: this.app.renderer.events
    });

    this.app.stage.addChild(this.viewport);
    this.viewport.drag().pinch().wheel().decelerate();

    // Инициализация карты
    this.mapManager = new MapManager();
    this.viewport.addChild(this.mapManager.container);

    // Загрузка ресурсов (Пример)
    this.loadAssets();

    window.addEventListener('resize', this.onResize);
  }

  async loadAssets() {
    // Здесь нужно указать реальные пути к вашим текстурам
    // PIXI.Assets.add('tileset', '/images/tileset.png');
    // const textures = await PIXI.Assets.load(['tileset']);
    
    // this.mapManager.loadTextures(textures.tileset);
    
    // Временно: Загрузим карту (нужно перенести maps.json в public/maps.json)
    try {
        const response = await fetch('/maps.json'); // Путь к файлу в public
        if (response.ok) {
            const mapData = await response.json();
            // Берем первый слой карты для теста
            this.mapManager.render(mapData); 
        }
    } catch (e) {
        console.error("Failed to load map:", e);
    }
  }

  attachRoom(room: Room) {
    this.room = room;
    
    room.state.players.onAdd = (player: any, sessionId: string) => {
       this.createPlayer(sessionId, player);
       
       // Если это наш игрок - следим камерой
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
     
     // Графика игрока (Заглушка -> Заменить на Спрайт)
     const graphics = new PIXI.Graphics();
     const color = sessionId === this.room?.sessionId ? 0x00FF00 : 0xFF0000;
     graphics.beginFill(color);
     graphics.drawCircle(0, 0, 15);
     graphics.endFill();
     
     // Имя
     const text = new PIXI.Text(data.name, { 
         fontSize: 12, 
         fill: 0xffffff,
         stroke: 0x000000,
         strokeThickness: 2
     });
     text.anchor.set(0.5, 2.0);

     container.addChild(graphics);
     container.addChild(text);
     
     container.x = data.x;
     container.y = data.y;

     // Игроки выше карты
     container.zIndex = 100; 

     this.viewport.addChild(container);
     this.players.set(sessionId, container);
  }

  updatePlayer(sessionId: string, data: any) {
      const p = this.players.get(sessionId);
      if (p) {
          // TODO: Добавить интерполяцию (GSAP или lerp)
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
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.viewport.resize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.app.destroy(true, { children: true });
  }
}