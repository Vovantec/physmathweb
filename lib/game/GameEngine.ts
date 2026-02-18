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

interface MobContainer extends PIXI.Container {
    id: string;
    hp: number;
    maxHp: number;
}

export class GameEngine {
    app: PIXI.Application | undefined;
    viewport: Viewport | undefined;
    room: Room | null = null;
    
    npcs: Map<string, NPC> = new Map();
    mobs: Map<string, MobContainer> = new Map();

    mapManager: MapManager | undefined;
    pathfindingManager: SimplePathfinder;
    
    background: PIXI.Graphics | undefined;

    cursor: PIXI.Graphics | undefined;
    selectionIndicator: PIXI.Graphics | undefined;
    selectedTarget: PIXI.Container | null = null;

    players: Map<string, PlayerContainer> = new Map();
    tileSize = 64;

    public onNpcInteract: ((id: string, x: number, y: number) => void) | null = null;
    public onMobInteract: ((id: string) => void) | null = null;
    public onPlayerArrived: (() => void) | null = null;
    public onGroundClick: ((x: number, y: number) => void) | null = null; 

    public isDestroyed = false;

    constructor() {
        this.pathfindingManager = new SimplePathfinder();
    }

    async init(canvas: HTMLCanvasElement): Promise<boolean> {
        this.isDestroyed = false;

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

        if (!this.app.renderer) return false;

        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 4000, 
            worldHeight: 4000,
            events: this.app.renderer.events
        });

        this.viewport.drag().pinch().wheel().clamp({ direction: 'all' });
        this.app.stage.addChild(this.viewport);
        
        // ВАЖНО: Включаем сортировку, чтобы zIndex работал
        this.viewport.sortableChildren = true; 
        
        this.viewport.drag().pinch().wheel().decelerate().clamp({ direction: 'all' });

        // --- ФОН (ЗЕМЛЯ) ---
        this.background = new PIXI.Graphics();
        this.background.rect(0, 0, 4000, 4000); 
        this.background.fill({ color: 0x000000, alpha: 0 }); 
        this.background.zIndex = -1000; 
        this.background.eventMode = 'static';
        
        this.background.on('pointertap', (e) => {
             const localPoint = this.background!.toLocal(e.global);
             
             // Если мы кликнули по земле - сбрасываем цель
             this.deselectTarget();

             if (this.onGroundClick) {
                 this.onGroundClick(localPoint.x, localPoint.y);
             }
        });

        this.viewport.addChild(this.background);

        this.createCursor();
        this.createSelectionIndicator();

        await this.loadAssetsGlobal();
        if (this.isDestroyed) return false;

        this.mapManager = new MapManager();
        if (!this.viewport.destroyed) {
            this.viewport.addChild(this.mapManager.container);
            this.mapManager.container.zIndex = -100; 
        }

        this.app.ticker.add((ticker) => {
            this.updateLoop(ticker.deltaTime);
        });

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
        this.cursor.zIndex = 99999;
        this.viewport.addChild(this.cursor);
    }

    // --- ЗЕЛЕНОЕ ВЫДЕЛЕНИЕ ---
    createSelectionIndicator() {
        if (!this.viewport) return;
        this.selectionIndicator = new PIXI.Graphics();
        
        // Рисуем жирный зеленый круг и еще один для контраста
        this.selectionIndicator.circle(0, 0, 40); 
        this.selectionIndicator.stroke({ width: 4, color: 0x00FF00 }); 
        this.selectionIndicator.circle(0, 0, 44); 
        this.selectionIndicator.stroke({ width: 2, color: 0x000000 }); 

        // ВАЖНО: Самый высокий слой, чтобы не перекрывалось картой или игроками
        this.selectionIndicator.zIndex = Number.MAX_SAFE_INTEGER; 
        
        this.selectionIndicator.visible = false;
        this.viewport.addChild(this.selectionIndicator);
    }

    selectTarget(target: PIXI.Container) {
        console.log("Selecting target:", target);
        this.selectedTarget = target;
        if (this.selectionIndicator) {
            this.selectionIndicator.visible = true;
            this.selectionIndicator.x = target.x;
            this.selectionIndicator.y = target.y;
            // Принудительно ставим поверх всего еще раз
            this.selectionIndicator.zIndex = Number.MAX_SAFE_INTEGER;
        }
    }

    deselectTarget() {
        this.selectedTarget = null;
        if (this.selectionIndicator) {
            this.selectionIndicator.visible = false;
        }
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

        // Следим кольцом за целью (если она двигается)
        if (this.selectedTarget && this.selectionIndicator && !this.selectedTarget.destroyed) {
            this.selectionIndicator.x = this.selectedTarget.x;
            this.selectionIndicator.y = this.selectedTarget.y;
        } else if (this.selectedTarget?.destroyed) {
            this.deselectTarget();
        }

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
        player.zIndex = player.y + 10; 
    }

    // Восстановленный метод движения
    movePlayerAlongPath(sessionId: string, path: number[][]) {
        const p = this.players.get(sessionId);
        if (!p) return;
        const pixelPath = path.map(point => [
            point[0] * this.tileSize + this.tileSize / 2,
            point[1] * this.tileSize + this.tileSize / 2
        ]);
        p.pathQueue = pixelPath;
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
            { alias: 'priest', src: '/images/character_sprite/priest.png' },
        ];
        const spineAssets = getNpcAssetsToLoad() || [];
        const assetsToLoad = [...requiredAssets, ...spineAssets]
            .filter(a => a && a.alias && a.src && a.src.trim() !== '' && !PIXI.Assets.cache.has(a.alias));

        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
                console.log("Global Assets loaded");
            } catch (e) {
                console.warn("Assets loading warning:", e);
            }
        }
    }

    // --- МОБЫ ---
    createMob(id: string, data: any) {
        if (this.mobs.has(id)) return;

        const container = new PIXI.Container() as MobContainer;
        container.id = id;
        container.x = data.x;
        container.y = data.y;
        container.zIndex = data.y + 20;
        
        // Включаем интерактивность для всех версий Pixi
        container.eventMode = 'static';
        container.interactive = true; 
        container.cursor = 'pointer';

        // --- DEBUG HIT AREA (ВИДИМЫЙ БЕЛЫЙ КВАДРАТ) ---
        // Если ты видишь этот квадрат - кликай по нему.
        const debugHit = new PIXI.Graphics();
        debugHit.rect(-32, -60, 64, 80);
        debugHit.fill({ color: 0xFFFFFF, alpha: 0.3 }); // 30% прозрачности
        container.addChild(debugHit);
        
        // Невидимая зона клика (дублируем для надежности)
        container.hitArea = new PIXI.Rectangle(-32, -60, 64, 80);

        const g = new PIXI.Graphics();
        g.circle(0, 0, 25); 
        g.fill({ color: 0xFF0000 });
        g.stroke({ width: 2, color: 0x000000 });
        container.addChild(g);

        const hpBar = new PIXI.Graphics();
        hpBar.rect(-20, -35, 40, 5);
        hpBar.fill({ color: 0x00FF00 });
        container.addChild(hpBar);

        const text = new PIXI.Text({
            text: data.name || "Enemy",
            style: { fontSize: 12, fill: 0xFFFFFF, stroke: { width: 2, color: 0x000000 } }
        });
        text.anchor.set(0.5, 1.5);
        container.addChild(text);

        container.on('pointertap', (e) => {
            e.stopPropagation();
            this.selectTarget(container); 
            console.log("Clicked mob:", id);
            if (this.onMobInteract) this.onMobInteract(id);
        });

        if (this.viewport && !this.viewport.destroyed) {
            this.viewport.addChild(container);
            this.mobs.set(id, container);
        }

        data.onChange = () => {
            if (!container || container.destroyed) return;
            container.x = data.x;
            container.y = data.y;
            container.zIndex = data.y + 20;
            const hpPercent = Math.max(0, data.hp / data.maxHp);
            hpBar.clear();
            hpBar.rect(-20, -35, 40, 5);
            hpBar.fill({ color: 0x000000 });
            hpBar.rect(-20, -35, 40 * hpPercent, 5);
            hpBar.fill({ color: 0x00FF00 });
        };
    }

    removeMob(id: string) {
        const mob = this.mobs.get(id);
        if (mob) {
            if (this.selectedTarget === mob) this.deselectTarget();
            mob.destroy();
            if (this.viewport) this.viewport.removeChild(mob);
            this.mobs.delete(id);
        }
    }

    createNPC(id: string, type: string, x: number, y: number) {
        if (this.npcs.has(id)) return;
        if (!PIXI.Assets.cache.has(type)) return;

        const npc = new NPC(id, type, 0.25);
        npc.x = x;
        npc.y = y;
        npc.zIndex = y + 20;
        
        npc.eventMode = 'static';
        npc.interactive = true;
        npc.cursor = 'pointer';
        
        // --- DEBUG HIT AREA (ВИДИМЫЙ БЕЛЫЙ КВАДРАТ) ---
        const debugHit = new PIXI.Graphics();
        debugHit.rect(-32, -60, 64, 80);
        debugHit.fill({ color: 0xFFFFFF, alpha: 0.3 });
        npc.addChild(debugHit);

        npc.hitArea = new PIXI.Rectangle(-32, -60, 64, 80);

        npc.on('pointertap', (e) => {
            e.stopPropagation();
            this.selectTarget(npc); 
            console.log("Clicked NPC:", id);
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

        room.onMessage("mapData", async (mapData: any[][]) => {
            if (this.isDestroyed || !this.mapManager) return;
            this.pathfindingManager.buildGrid(mapData);
            this.npcs.forEach(npc => { npc.destroy(); if (this.viewport) this.viewport.removeChild(npc); });
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

        room.send("requestMap");

        this.players.forEach(p => p.destroy());
        this.players.clear();

        room.state.players.forEach((player: any, sessionId: string) => this.handlePlayerAdd(player, sessionId));
        room.state.players.onAdd = (player: any, sessionId: string) => this.handlePlayerAdd(player, sessionId);
        room.state.players.onRemove = (player: any, sessionId: string) => this.removePlayer(sessionId);

        this.mobs.forEach(m => m.destroy());
        this.mobs.clear();

        if (room.state.mobs) {
            room.state.mobs.forEach((mob: any, id: string) => this.createMob(id, mob));
            room.state.mobs.onAdd = (mob: any, id: string) => this.createMob(id, mob);
            room.state.mobs.onRemove = (mob: any, id: string) => this.removeMob(id);
        }
    }

    handlePlayerAdd(playerData: any, sessionId: string) {
        if (this.isDestroyed) return;
        if (this.players.has(sessionId)) return;
        this.createPlayer(sessionId, playerData);
        const p = this.players.get(sessionId);
        if (this.room && sessionId === this.room.sessionId && p && this.viewport) {
             this.viewport.moveCenter(p.x, p.y);
             this.viewport.follow(p, { speed: 0 });
        }
        playerData.onChange = () => {
            if (!this.isDestroyed && p && p.pathQueue.length === 0) {
                p.x = playerData.x;
                p.y = playerData.y;
                p.zIndex = playerData.y + 10;
            }
        };
    }
    
    getCharacterTextures(skinName: string) {
        if (!PIXI.Assets.cache.has(skinName)) return null;
        const baseTexture = PIXI.Assets.get(skinName).source;
        if (!baseTexture || baseTexture.width < 10) return null;
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
        container.zIndex = data.y + 10;

        if (this.viewport) this.viewport.addChild(container);
        this.players.set(sessionId, container);
    }
    
    removePlayer(sessionId: string) {
        const p = this.players.get(sessionId);
        if (p) {
            if (this.viewport) this.viewport.removeChild(p);
            p.destroy();
            this.players.delete(sessionId);
        }
    }

    onResize = () => {
        if (this.app?.renderer) this.app.renderer.resize(window.innerWidth, window.innerHeight);
        if (this.viewport) this.viewport.resize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        this.isDestroyed = true;
        window.removeEventListener('resize', this.onResize);
        if (this.room) {
             try {
                this.room.state.players.onAdd = undefined;
                this.room.state.players.onRemove = undefined;
                if (this.room.state.mobs) {
                    this.room.state.mobs.onAdd = undefined;
                    this.room.state.mobs.onRemove = undefined;
                }
             } catch(e) {}
             this.room = null;
        }
        if (this.app) {
            this.app.ticker?.stop();
            this.app.destroy({ removeView: true, texture: false, textureSource: false, context: true } as any);
            this.app = undefined;
        }
    }
    
    hardDestroy() {
        this.destroy();
        PIXI.Assets.reset();
    }
}