import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';

export class GameEngine {
  // Помечаем, что app будет инициализировано позже
  app!: PIXI.Application;
  viewport!: Viewport;
  room: Room | null = null;
  mapManager!: MapManager;
  
  players: Map<string, PIXI.Container> = new Map();

  constructor() {
    // Конструктор теперь пустой или выполняет только базовую настройку полей
  }

  // Создаем асинхронный метод инициализации
  async init(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application();

    // В PixiJS v8 инициализация асинхронна
    await this.app.init({
      canvas: canvas, // Используем свойство canvas вместо view
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Теперь this.app.renderer инициализирован и events доступны
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 4000, 
      worldHeight: 4000,
      events: this.app.renderer.events // Ошибка исчезнет здесь
    } as any);

    this.app.stage.addChild(this.viewport as any);
    this.viewport.drag().pinch().wheel().decelerate();

    // Инициализация карты
    this.mapManager = new MapManager();
    this.viewport.addChild(this.mapManager.container as any);

    // Загрузка ресурсов
    await this.loadAssets();

    window.addEventListener('resize', this.onResize);
  }

  async loadAssets() {
    try {
        const response = await fetch('/maps.json'); 
        if (response.ok) {
            const mapData = await response.json();
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
       
       if (sessionId === room.sessionId) {
           const p = this.players.get(sessionId);
           if (p) this.viewport.follow(p as any);
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
     graphics.circle(0, 0, 15); // В v8 drawCircle -> circle, хотя drawCircle тоже поддерживается через alias
     graphics.fill(color);      // В v8 beginFill/endFill -> fill
     
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

     this.viewport.addChild(container as any);
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
          this.viewport.removeChild(p as any);
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
    // Проверяем инициализацию перед уничтожением
    if (this.app) {
        this.app.destroy(true, { children: true });
    }
  }
}