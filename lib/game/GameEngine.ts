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
    sprite: PIXI.AnimatedSprite;
    targetX: number;
    targetY: number;
    pathQueue: number[][];
    speed: number;
    currentDir: Direction;
    currentAction: Action;
    textures: Record<string, PIXI.Texture[]>;
}

export class GameEngine {
    app: PIXI.Application | undefined;
    viewport: Viewport | undefined;
    room: Room | null = null;
    npcs: Map<string, NPC> = new Map();

    mapManager: MapManager | undefined;
    pathfindingManager: SimplePathfinder;

    // Курсор (хайлайт клетки)
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

        // 1. Создаем приложение
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

        if (this.isDestroyed) {
            this.hardDestroy();
            return false;
        }

        // 2. Создаем камеру
        if (!this.app.renderer) return false;

        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 4000,
            worldHeight: 4000,
            events: this.app.renderer.events // Подключаем события Pixi
        });

        this.app.stage.addChild(this.viewport);

        // Включаем сортировку (Z-Index), чтобы персонажи перекрывали деревья
        this.viewport.sortableChildren = true;

        this.viewport.drag().pinch().wheel().decelerate().clamp({ direction: 'all' });

        // 3. Создаем Курсор (Хайлайт)
        this.createCursor();

        // 4. Загрузка Ассетов
        await this.loadAssetsGlobal();
        if (this.isDestroyed) return false;

        // 5. Инициализация карты
        this.mapManager = new MapManager();
        if (!this.viewport.destroyed) {
            this.viewport.addChild(this.mapManager.container);
        }

        // 6. Запускаем игровой цикл
        this.app.ticker.add((ticker) => {
            this.updateLoop(ticker.deltaTime);
        });

        // 7. Слушаем движение мыши для обновления курсора
        // Используем 'pointermove' на stage, чтобы ловить движение везде
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen; // Вся область экрана активна
        this.app.stage.on('pointermove', (e) => this.onPointerMove(e));

        setTimeout(() => {
            // Используем алиас 'npc_demon', который мы объявили выше
            //this.createNPC("Assassin_1", "npc_assasin_1", 500, 400);

            // Можно проверить и других:
            // this.createNPC("dragon_1", "npc_dragon", 700, 400);
        }, 1000);

        window.addEventListener('resize', this.onResize);
        return true;
    }

    // --- ЛОГИКА КУРСОРА ---
    createCursor() {
        if (!this.viewport) return;

        this.cursor = new PIXI.Graphics();

        // Рисуем квадрат
        this.cursor.rect(0, 0, this.tileSize, this.tileSize);

        // Стиль:
        this.cursor.fill({ color: 0xffffff, alpha: 0.2 }); // Чуть поднял прозрачность до 0.2
        this.cursor.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

        // ИСПРАВЛЕНИЕ:
        // Было -500 (рисовался под картой).
        // Ставим 1 (рисуется ПОВЕРХ карты, которая имеет 0).
        // Игроки имеют zIndex = player.y (например, 100, 200...), поэтому они будут ПОВЕРХ курсора.
        this.cursor.zIndex = 1;

        this.viewport.addChild(this.cursor);
    }

    onPointerMove(e: PIXI.FederatedPointerEvent) {
        if (!this.viewport || !this.cursor || this.isDestroyed) return;

        // 1. Конвертируем координаты экрана (global) в координаты мира (world)
        // pixi-viewport делает это через toWorld
        const worldPos = this.viewport.toWorld(e.global);

        // 2. Снэппинг к сетке (округляем вниз до ближайшего tileSize)
        const gridX = Math.floor(worldPos.x / this.tileSize);
        const gridY = Math.floor(worldPos.y / this.tileSize);

        // 3. Обновляем позицию
        this.cursor.x = gridX * this.tileSize;
        this.cursor.y = gridY * this.tileSize;

        // Опционально: можно менять цвет курсора, если клетка непроходима
        // const isWalkable = this.pathfindingManager.isWalkable(gridX, gridY);
        // this.cursor.tint = isWalkable ? 0xffffff : 0xff0000; 
    }

    // --- ИГРОВОЙ ЦИКЛ ---
    updateLoop(deltaTime: number) {
        if (this.isDestroyed) return;

        this.players.forEach((player, sessionId) => {
            // Передаем sessionId, чтобы узнать, "мой" ли это игрок
            this.processPlayerMovement(player, deltaTime, sessionId);
        });

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
                // Шаг завершен, встаем точно в точку
                player.x = targetPixelX;
                player.y = targetPixelY;
                player.pathQueue.shift(); // Удаляем точку из очереди

                // Если очередь опустела — значит мы прибыли!
                if (player.pathQueue.length === 0) {
                    this.setAnimation(player, 'stand', player.currentDir);

                    // ПРОВЕРКА: Если это МОЙ игрок, вызываем событие прибытия
                    if (this.room && sessionId === this.room.sessionId) {
                        if (this.onPlayerArrived) {
                            console.log("Engine: Player arrived at destination");
                            this.onPlayerArrived();
                        }
                    }
                }
            } else {
                // Продолжаем движение
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
        player.zIndex = player.y;
    }

    setAnimation(player: PlayerContainer, action: Action, dir: Direction) {
        if (player.currentAction === action && player.currentDir === dir) return;

        const animKey = `${action}_${dir}`;
        if (player.textures && player.textures[animKey]) {
            player.sprite.textures = player.textures[animKey];
            player.sprite.play();
            player.currentAction = action;
            player.currentDir = dir;
        }
    }

    async loadAssetsGlobal() {
        // 1. Обычные спрайты (ваши старые)
        const requiredAssets = [
            { alias: 'warrior', src: '/images/character_sprite/warrior.png' },
            { alias: 'knight', src: '/images/character_sprite/knight.png' },
            { alias: 'archer', src: '/images/character_sprite/archer.png' },
            { alias: 'mage', src: '/images/character_sprite/mage.png' },
            { alias: 'priest', src: '/images/character_sprite/priest.png' }
        ];

        // 2. Spine ассеты берем из реестра
        const spineAssets = getNpcAssetsToLoad();

        const assetsToLoad = [
            ...requiredAssets.filter(a => !PIXI.Assets.cache.has(a.alias)),
            ...spineAssets.filter(a => !PIXI.Assets.cache.has(a.alias))
        ];

        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
                console.log("Global Assets loaded");
            } catch (e) {
                console.warn("Assets loading warning:", e);
            }
        }
    }

    createNPC(id: string, type: string, x: number, y: number) {
        if (this.npcs.has(id)) return;

        if (!PIXI.Assets.cache.has(type)) {
            console.error(`Assets for NPC '${type}' not found!`);
            return;
        }

        const npc = new NPC(id, type, 0.25);

        npc.x = x;
        npc.y = y;
        npc.zIndex = y;

        // --- ДОБАВЛЕНИЕ КЛИКА ---
        npc.on('pointertap', (e) => {
            // Предотвращаем клик по карте "сквозь" NPC (stopPropagation)
            e.stopPropagation();

            console.log(`Clicked on NPC: ${id}`);

            // Если React подписался на событие, вызываем его
            if (this.onNpcInteract) {
                this.onNpcInteract(id, x, y);
            }
        });
        // ------------------------

        npc.on('interact', (npcId, npcX, npcY) => {
            console.log(`GameEngine: Event 'interact' received from ${npcId}`);

            // Передаем сигнал наверх в React
            if (this.onNpcInteract) {
                this.onNpcInteract(npcId, npcX, npcY);
            }
        });

        if (this.viewport && !this.viewport.destroyed) {
            this.viewport.addChild(npc);
            this.npcs.set(id, npc);
        }
    }

    attachRoom(room: Room) {
        if (this.isDestroyed) return;
        this.room = room;

        room.onMessage("mapData", async (mapData: any[][]) => {
            if (this.isDestroyed || !this.mapManager) return;

            this.pathfindingManager.buildGrid(mapData);

            // Очищаем старых NPC перед рендером новой карты
            this.npcs.forEach(npc => {
                npc.destroy();
                if (this.viewport) this.viewport.removeChild(npc);
            });
            this.npcs.clear();

            // Передаем callback для создания NPC
            const dims = await this.mapManager.render(mapData, (id, type, x, y) => {
                this.createNPC(id, type, x, y);
            });

            if (this.viewport && !this.viewport.destroyed) {
                this.viewport.resize(window.innerWidth, window.innerHeight, dims.width, dims.height);
                this.viewport.plugins.remove('clamp');
                this.viewport.clamp({ direction: 'all' });
            }
        });

        room.send("requestMap");

        this.players.forEach(p => p.destroy());
        this.players.clear();

        room.state.players.forEach((player: any, sessionId: string) => {
            this.handlePlayerAdd(player, sessionId);
        });

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

        this.createPlayer(sessionId, playerData);

        const p = this.players.get(sessionId);

        if (this.room && sessionId === this.room.sessionId) {
            if (p && this.viewport && !this.viewport.destroyed) {
                this.viewport.follow(p, { speed: 0 });
            }
        }

        playerData.onChange = () => {
            if (!this.isDestroyed && p) {
                if (p.pathQueue.length === 0) {
                    p.x = playerData.x;
                    p.y = playerData.y;
                    p.zIndex = playerData.y;
                }
            }
        };
    }

    getCharacterTextures(skinName: string) {
        if (!PIXI.Assets.cache.has(skinName)) return null;

        const baseTexture = PIXI.Assets.get(skinName).source;
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
        } else {
            const g = new PIXI.Graphics().circle(0, 0, 20).fill({ color: 0xff0000 });
            container.addChild(g);
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
        container.zIndex = data.y;

        if (this.viewport && !this.viewport.destroyed) {
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