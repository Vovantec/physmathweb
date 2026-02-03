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

  constructor() {
    // Конструктор пустой, инициализация в init()
  }

  async init(canvas: HTMLCanvasElement) {
    // 1. Создаем приложение (v8 style)
    this.app = new PIXI.Application();
    
    await this.app.init({
      canvas: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: 'webgl', // Рекомендуется для v8
    });

    // 2. Инициализируем камеру (pixi-viewport v6)
    // В v8 нужно обязательно передать events: app.renderer.events
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, 
      worldHeight: 4000,
      events: this.app.renderer.events // <--- Исправление ошибки isInteractive
    });

    this.app.stage.addChild(this.viewport);
    
    // Включаем плагины камеры
    this.viewport.drag().pinch().wheel().decelerate();

    // 3. Инициализация менеджера карты
    this.mapManager = new MapManager();
    this.viewport.addChild(this.mapManager.container);

    window.addEventListener('resize', this.onResize);
  }

  attachRoom(room: Room) {
    this.room = room;

    // === ЗАПРОС КАРТЫ С СЕРВЕРА ===
    // 1. Слушаем ответ
    room.onMessage("mapData", (mapData: any[][]) => {
        console.log("Карта загружена с сервера!");
        this.mapManager.render(mapData);
    });

    // 2. Отправляем запрос
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
     
     const graphics = new PIXI.Graphics();
     const color = sessionId === this.room?.sessionId ? 0x00FF00 : 0xFF0000;
     
     // Синтаксис v8
     graphics.circle(0, 0, 15);
     graphics.fill(color);
     
     const text = new PIXI.Text({
         text: data.name,
         style: {
             fontSize: 12, 
             fill: 0xffffff,
             stroke: { width: 2, color: 0x000000 }
         }
     });
     text.anchor.set(0.5, 2.0);

     container.addChild(graphics);
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