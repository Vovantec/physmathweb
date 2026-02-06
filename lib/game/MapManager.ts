import * as PIXI from 'pixi.js';
import { NPC_REGISTRY } from './NpcRegistry';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 64; 
    
    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    async render(mapData: any[][], onFoundNPC: (id: string, type: string, x: number, y: number) => void): Promise<{ width: number, height: number }> {
        if (!mapData || mapData.length === 0) return { width: 0, height: 0 };

        this.container.removeChildren();
        
        // 1. Сбор ресурсов
        const assetsToLoad = new Set<string>();

        for (let i = 0; i < mapData.length; i++) {
            if (!Array.isArray(mapData[i])) continue;
            for (let j = 0; j < mapData[i].length; j++) {
                const cell = mapData[i][j];
                if (!cell) continue;
                
                // Тайл (пол)
                if (cell.frame !== undefined) assetsToLoad.add(`/images/map/${cell.frame}.png`);
                // Объект (дерево/стена)
                if (cell.objects && cell.objects.obj) assetsToLoad.add(`/images/map/${cell.objects.obj}.png`);
            }
        }

        const assetsArray = Array.from(assetsToLoad).map(src => ({ alias: src, src }));
        if (assetsArray.length > 0) {
            try {
                await PIXI.Assets.load(assetsArray);
            } catch (e) {
                console.warn("Assets load warning:", e);
            }
        }

        // 2. Отрисовка
        for (let i = 0; i < mapData.length; i++) {
            if (!Array.isArray(mapData[i])) continue;
            for (let j = 0; j < mapData[i].length; j++) {
                const cell = mapData[i][j];
                if (!cell) continue;

                const x = j * this.tileSize;
                const y = i * this.tileSize;

                // ... (код отрисовки пола/тайлов) ...

                // Объект (NPC или Декорация)
                if (cell.objects && cell.objects.obj) {
                    const objId = cell.objects.obj; // Например "3122"

                    // ПРОВЕРКА: Это NPC или обычная картинка?
                    if (NPC_REGISTRY[objId]) {
                        // Это NPC! Не рисуем его как спрайт, а сообщаем GameEngine
                        const npcDef = NPC_REGISTRY[objId];
                        // Центрируем NPC в клетке (x + половина тайла)
                        onFoundNPC(
                            `npc_${x}_${y}`, // Уникальный ID для сцены
                            npcDef.alias,    // Алиас Spine (npc_assasin_1)
                            x + this.tileSize / 2, 
                            y + this.tileSize      // Обычно NPC стоят ногами на низу клетки
                        );
                    } else {
                        // Это обычная декорация (дерево, камень), рисуем как раньше
                        const texture = this.getTexture(`/images/map/${objId}.png`);
                        if (texture) {
                            const objSprite = new PIXI.Sprite(texture);
                            // ... ваш старый код настройки спрайта ...
                            const size = cell.objects.size || 1;
                            objSprite.width = this.tileSize * size;
                            const ratio = texture.height / texture.width;
                            objSprite.height = objSprite.width * ratio;
                            objSprite.anchor.set(0.5, 1);
                            objSprite.x = x + (this.tileSize * size) / 2;
                            objSprite.y = y + this.tileSize;
                            objSprite.zIndex = y; 
                            this.container.addChild(objSprite);
                        }
                    }
                }
            }
        }

        return {
            width: (mapData[0]?.length || 0) * this.tileSize,
            height: mapData.length * this.tileSize
        };
    }

    private getTexture(src: string): PIXI.Texture | null {
        try { return PIXI.Assets.get(src); } catch { return null; }
    }
}