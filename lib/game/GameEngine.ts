import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Room } from 'colyseus.js';
import { MapManager } from './MapManager';
import { SimplePathfinder } from './SimplePathfinder';
import { NPC } from './NPC';
import { getNpcAssetsToLoad } from './NpcRegistry';

type Direction = 'south' | 'north' | 'west' | 'east';
type Action = 'stand' | 'walk';

interface PlayerContainer extends PIXI.Container {
    sprite?: PIXI.AnimatedSprite;
    targetX: number;
    targetY: number;
    pathQueue: number[][];
    speed: number;
    currentDir: Direction;
    currentAction: Action;
    textures?: Record<string, PIXI.Texture[]>;
}

export class GameEngine {
    app: PIXI.Application | undefined;
    viewport: Viewport | undefined;
    room: Room | null = null;
    npcs: Map<string, NPC> = new Map();

    mapManager: MapManager | undefined;
    pathfindingManager: SimplePathfinder;

    cursor: PIXI.Graphics | undefined;
    players: Map<string, PlayerContainer> = new Map();
    tileSize = 64;

    public onNpcInteract: ((id: string, x: number, y: number) => void) | null = null;
    public onPlayerArrived: (() => void) | null = null;

    public isDestroyed = false;

    constructor() {
        this.pathfindingManager = new SimplePathfinder();
    }

    async init(canvas: HTMLCanvasElement): Promise<boolean> {
        this.isDestroyed = false;

        this.app = new PIXI.Application();
        // Инициализация PixiJS
        await this.app.init({
            canvas: canvas,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1099bb,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            preference: 'webgl',
        });

        if (this.isDestroyed) {
            this.hardDestroy();
            return false;
        }

        if (!this.app.renderer) return false;

        // Настройка камеры (Viewport)
        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 4000,
            worldHeight: 4000,
            events: this.app.renderer.events
        });

        this.viewport
            .drag()
            .pinch()
            .wheel()
            .clamp({ direction: 'all' });

        this.app.stage.addChild(this.viewport);
        
        // ВАЖНО: Включаем сортировку детей по zIndex
        this.viewport.sortableChildren = true;

        this.viewport.drag().pinch().wheel().decelerate().clamp({ direction: 'all' });

        this.createCursor();

        await this.loadAssetsGlobal();
        if (this.isDestroyed) return false;

        // Инициализация менеджера карты
        this.mapManager = new MapManager();
        if (!this.viewport.destroyed) {
            this.viewport.addChild(this.mapManager.container);
            // ВАЖНО: Убираем карту на задний план
            this.mapManager.container.zIndex = -100;
        }

        // Игровой цикл
        this.app.ticker.add((ticker) => {
            this.updateLoop(ticker.deltaTime);
        });

        // Debug logger: Раз в 2 секунды пишем в консоль состояние игрока
        setInterval(() => {
            if (this.isDestroyed || !this.room) return;
            const myPlayer = this.players.get(this.room.sessionId);
            if (myPlayer) {
                console.log(`Debug Pos: ${Math.round(myPlayer.x)}:${Math.round(myPlayer.y)} | Z: ${myPlayer.zIndex} | Visible: ${myPlayer.visible}`);
            }
        }, 2000);

        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen; 
        this.app.stage.on('pointermove', (e) => this.onPointerMove(e));

        window.addEventListener('resize', this.onResize);
        return true;
    }

    createCursor() {
        if (!this.viewport) return;
        this.cursor = new PIXI.Graphics();
        this.cursor.rect(0, 0, this.tileSize, this.tileSize);
        this.cursor.fill({ color: 0xffffff, alpha: 0.2 });
        this.cursor.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
        this.cursor.zIndex = 1000; // Курсор всегда сверху
        this.viewport.addChild(this.cursor);
    }

    onPointerMove(e: PIXI.FederatedPointerEvent) {
        if (!this.viewport || !this.cursor || this.isDestroyed) return;
        const worldPos = this.viewport.toWorld(e.global);
        const gridX = Math.floor(worldPos.x / this.tileSize);
        const gridY = Math.floor(worldPos.y / this.tileSize);
        this.cursor.x = gridX * this.tileSize;
        this.cursor.y = gridY * this.tileSize;
    }

    updateLoop(deltaTime: number) {
        if (this.isDestroyed) return;
        
        this.players.forEach((player, sessionId) => {
            this.processPlayerMovement(player, deltaTime, sessionId);
        });

        // Сортировка слоев каждый кадр (персонажи перекрывают друг друга правильно)
        if (this.viewport && !this.viewport.destroyed && this.app?.ticker?.started) {
            this.viewport.children.sort((a, b) => a.zIndex - b.zIndex);
        }
    }

    processPlayerMovement(player: PlayerContainer, deltaTime: number, sessionId: string) {
        if (player.pathQueue.length > 0) {
            const target = player.pathQueue[0];
            const targetPixelX = target[0];
            const targetPixelY = target[1];

            const dx = targetPixelX - player.x;
            const dy = targetPixelY - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const moveStep = player.speed * deltaTime;

            if (dist <= moveStep) {
                player.x = targetPixelX;
                player.y = targetPixelY;
                player.pathQueue.shift();

                if (player.pathQueue.length === 0) {
                    this.setAnimation(player, 'stand', player.currentDir);
                    if (this.room && sessionId === this.room.sessionId) {
                        if (this.onPlayerArrived) this.onPlayerArrived();
                    }
                }
            } else {
                player.x += (dx / dist) * moveStep;
                player.y += (dy / dist) * moveStep;
                let newDir = player.currentDir;
                if (Math.abs(dx) > Math.abs(dy)) {
                    newDir = dx > 0 ? 'east' : 'west';
                } else {
                    newDir = dy > 0 ? 'south' : 'north';
                }
                this.setAnimation(player, 'walk', newDir);
            }
        }
        // Обновляем Z-Index по Y координате.
        // Добавляем 10, чтобы быть точно выше карты (у которой -100)
        player.zIndex = player.y + 10; 
    }

    setAnimation(player: PlayerContainer, action: Action, dir: Direction) {
        if (player.currentAction === action && player.currentDir === dir) return;
        if (!player.sprite || !player.textures) return;

        const animKey = `${action}_${dir}`;
        if (player.textures[animKey]) {
            player.sprite.textures = player.textures[animKey];
            player.sprite.play();
            player.currentAction = action;
            player.currentDir = dir;
        }
    }

    async loadAssetsGlobal() {
        const requiredAssets = [
            { alias: 'warrior', src: '/images/character_sprite/warrior.png' },
            { alias: 'knight', src: '/images/character_sprite/knight.png' },
            { alias: 'archer', src: '/images/character_sprite/archer.png' },
            { alias: 'mage', src: '/images/character_sprite/mage.png' },
            { alias: 'priest', src: '/images/character_sprite/priest.png' }
        ];

        const spineAssets = getNpcAssetsToLoad() || [];

        // Фильтруем пустые/битые пути, чтобы избежать ошибки <illegal path>
        const assetsToLoad = [
            ...requiredAssets,
            ...spineAssets
        ].filter(a => a && a.alias && a.src && a.src.trim() !== '' && !PIXI.Assets.cache.has(a.alias));

        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
                console.log("Global Assets loaded");
            } catch (e) {
                console.warn("Assets loading warning (some assets failed):", e);
                // Не прерываем выполнение, играем с тем, что загрузилось
            }
        }
    }

    createNPC(id: string, type: string, x: number, y: number) {
        if (this.npcs.has(id)) return;
        
        // Если ассет не загрузился, используем заглушку, но не крашимся
        if (!PIXI.Assets.cache.has(type)) {
            console.warn(`Assets for NPC '${type}' not found, skipping render.`);
            return;
        }
        
        const npc = new NPC(id, type, 0.25);
        npc.x = x;
        npc.y = y;
        npc.zIndex = y; // NPC тоже сортируются по Y
        
        npc.on('pointertap', (e) => {
            e.stopPropagation();
            if (this.onNpcInteract) this.onNpcInteract(id, x, y);
        });
        
        if (this.viewport && !this.viewport.destroyed) {
            this.viewport.addChild(npc);
            this.npcs.set(id, npc);
        }
    }

    attachRoom(room: Room) {
        if (this.isDestroyed) return;
        this.room = room;

        console.log("GameEngine: Attaching room...");

        room.onMessage("mapData", async (mapData: any[][]) => {
            if (this.isDestroyed || !this.mapManager) return;
            this.pathfindingManager.buildGrid(mapData);
            
            // Очищаем NPC
            this.npcs.forEach(npc => {
                npc.destroy();
                if (this.viewport) this.viewport.removeChild(npc);
            });
            this.npcs.clear();
            
            const dims = await this.mapManager.render(mapData, (id, type, x, y) => {
                this.createNPC(id, type, x, y);
            });
            
            if (this.viewport && !this.viewport.destroyed) {
                this.viewport.resize(window.innerWidth, window.innerHeight, dims.width, dims.height);
                this.viewport.plugins.remove('clamp');
                this.viewport.clamp({ direction: 'all' });
            }
        });

        // Отправляем запрос карты
        room.send("requestMap");

        // Очищаем текущих игроков перед синхронизацией
        this.players.forEach(p => p.destroy());
        this.players.clear();

        // 1. Обработка УЖЕ существующих игроков
        room.state.players.forEach((player: any, sessionId: string) => {
            this.handlePlayerAdd(player, sessionId);
        });

        // 2. Подписка на НОВЫХ игроков
        // ВАЖНО: Мы переопределяем onAdd, удаляя старые подписки "призрачных" движков
        room.state.players.onAdd = (player: any, sessionId: string) => {
            this.handlePlayerAdd(player, sessionId);
        };

        room.state.players.onRemove = (player: any, sessionId: string) => {
            this.removePlayer(sessionId);
        };
    }

    handlePlayerAdd(playerData: any, sessionId: string) {
        if (this.isDestroyed) return;
        if (this.players.has(sessionId)) return;

        console.log(`GameEngine: Adding player ${sessionId} at ${playerData.x}:${playerData.y}`);

        this.createPlayer(sessionId, playerData);
        const p = this.players.get(sessionId);

        // КАМЕРА: Если это мой игрок
        if (this.room && sessionId === this.room.sessionId) {
            if (p && this.viewport && !this.viewport.destroyed) {
                console.log("GameEngine: Focusing camera on MY player.");
                
                // Сначала прыгаем в точку игрока
                this.viewport.moveCenter(p.x, p.y);
                // Потом включаем слежение
                this.viewport.follow(p, { speed: 0 });
            } else {
                console.warn("GameEngine: Could not find player container to follow!");
            }
        }

        playerData.onChange = () => {
            if (!this.isDestroyed && p) {
                if (p.pathQueue.length === 0) {
                    p.x = playerData.x;
                    p.y = playerData.y;
                    p.zIndex = playerData.y + 10;
                }
            }
        };
    }

    getCharacterTextures(skinName: string) {
        if (!PIXI.Assets.cache.has(skinName)) return null;

        const baseTexture = PIXI.Assets.get(skinName).source;
        // Проверка на битую текстуру (404 часто возвращает HTML страницу)
        if (!baseTexture || baseTexture.width < 10) {
            console.warn(`Texture ${skinName} seems invalid (width < 10)`);
            return null;
        }

        const w = this.tileSize; const h = this.tileSize;
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
        return {
            'stand_south': createAnim(10, 0, 1),
            'walk_south': createAnim(10, 1, 8),
            'stand_west': createAnim(9, 0, 1),
            'walk_west': createAnim(9, 1, 8),
            'stand_north': createAnim(8, 0, 1),
            'walk_north': createAnim(8, 1, 8),
            'stand_east': createAnim(11, 0, 1),
            'walk_east': createAnim(11, 1, 8),
        };
    }

    createPlayer(sessionId: string, data: any) {
        const container = new PIXI.Container() as PlayerContainer;
        container.pathQueue = [];
        container.speed = 4;
        container.targetX = data.x;
        container.targetY = data.y;

        // --- DEBUG BOX (Красный квадрат) ---
        // Если спрайт не прогрузится, мы увидим этот квадрат. 
        // Если видите квадрат - значит координаты верны, но текстуры нет.
        const debugBox = new PIXI.Graphics();
        debugBox.rect(-20, -20, 40, 40); // 40x40 px
        debugBox.fill({ color: 0xFF0000, alpha: 0.5 }); // Красный полупрозрачный
        debugBox.stroke({ width: 2, color: 0xFFFF00 }); // Желтая рамка
        container.addChild(debugBox);
        // -----------------------------------

        const classNames = ['warrior', 'knight', 'archer', 'mage', 'priest'];
        const skinIndex = data.skin !== undefined ? data.skin : 0;
        const skinName = classNames[skinIndex] || 'warrior';

        const textures = this.getCharacterTextures(skinName);

        if (textures) {
            container.textures = textures;
            const sprite = new PIXI.AnimatedSprite(container.textures['stand_south']);
            sprite.anchor.set(0.5, 0.5);
            sprite.animationSpeed = 0.2;
            sprite.width = 60; sprite.height = 60;
            sprite.play();
            container.sprite = sprite;
            container.addChild(sprite);
            // Если текстуры есть, скрываем debugBox (или можно оставить для отладки)
            // debugBox.visible = false; 
        } else {
            console.warn(`Using fallback graphics for player ${data.name}`);
        }

        const text = new PIXI.Text({
            text: data.name,
            style: { fontSize: 14, fill: 0xffffff, stroke: { width: 3, color: 0x000000 }, fontWeight: 'bold', fontFamily: 'Arial' }
        });
        text.anchor.set(0.5, 2.0);
        container.addChild(text);

        container.x = data.x;
        container.y = data.y;
        container.currentDir = 'south';
        container.currentAction = 'stand';
        
        // Z-Index выше карты
        container.zIndex = data.y + 10;

        if (this.viewport) {
            this.viewport.addChild(container);
        }
        this.players.set(sessionId, container);
    }

    movePlayerAlongPath(sessionId: string, path: number[][]) {
        const p = this.players.get(sessionId);
        if (!p) return;
        const pixelPath = path.map(point => [
            point[0] * this.tileSize + this.tileSize / 2,
            point[1] * this.tileSize + this.tileSize / 2
        ]);
        p.pathQueue = pixelPath;
    }

    removePlayer(sessionId: string) {
        const p = this.players.get(sessionId);
        if (p) {
            if (this.viewport && !this.viewport.destroyed) this.viewport.removeChild(p);
            p.destroy();
            this.players.delete(sessionId);
        }
    }

    onResize = () => {
        if (!this.app || !this.app.renderer) return;
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        if (this.viewport && !this.viewport.destroyed) {
            this.viewport.resize(window.innerWidth, window.innerHeight);
        }
    }

    destroy() {
        this.isDestroyed = true;
        window.removeEventListener('resize', this.onResize);

        // ВАЖНО: Очищаем колбэки комнаты, чтобы этот "мертвый" движок перестал слушать события
        if (this.room) {
            try {
                this.room.state.players.onAdd = undefined;
                this.room.state.players.onRemove = undefined;
                this.room.state.players.onChange = undefined;
            } catch (e) { console.warn("Error cleaning up room callbacks", e); }
            this.room = null;
        }

        if (this.app) {
            try {
                this.app.ticker?.stop();
                if (this.app.renderer) {
                    this.app.destroy({
                        removeView: true,
                        texture: false,
                        textureSource: false,
                        context: true
                    } as any);
                }
            } catch (e) {
                console.error("GameEngine destroy error:", e);
            }
            this.app = undefined;
        }
    }

    hardDestroy() {
        this.destroy();
        PIXI.Assets.reset();
    }
}