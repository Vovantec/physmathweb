import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 40;
    
    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    loadTextures(sheet: any) {}

    async render(mapData: any[][]) {
        if (!mapData || mapData.length === 0) return;

        this.container.removeChildren();
        console.log(`Starting map render. Size: ${mapData.length}x${mapData[0]?.length}`);

        // 1. Сбор уникальных ID тайлов
        const uniqueFrames = new Set<string>();
        for (let i = 0; i < mapData.length; i++) {
            if (!Array.isArray(mapData[i])) continue; // Проверка на валидность ряда
            for (let j = 0; j < mapData[i].length; j++) {
                const tile = mapData[i][j];
                if (tile && tile.frame !== undefined) {
                    uniqueFrames.add(String(tile.frame));
                }
            }
        }

        console.log(`Found ${uniqueFrames.size} unique tiles to load.`);

        // 2. Формируем список для загрузки
        const assetsToLoad: { alias: string, src: string }[] = [];
        uniqueFrames.forEach(id => {
            const alias = `tile_${id}`;
            if (!PIXI.Assets.cache.has(alias)) {
                assetsToLoad.push({ alias: alias, src: `/images/map/${id}.png` });
            }
        });

        // 3. Загружаем
        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
            } catch (e) {
                console.warn("Some tiles failed to load.");
            }
        }

        // 4. Отрисовка
        for (let i = 0; i < mapData.length; i++) {
            if (!Array.isArray(mapData[i])) continue;
            for (let j = 0; j < mapData[i].length; j++) {
                const tileData = mapData[i][j];
                if (!tileData || tileData.frame === undefined) continue;

                const alias = `tile_${tileData.frame}`;
                try {
                    const texture = PIXI.Assets.get(alias);
                    if (texture) {
                        const sprite = new PIXI.Sprite(texture);
                        sprite.x = j * this.tileSize;
                        sprite.y = i * this.tileSize;
                        sprite.width = this.tileSize;
                        sprite.height = this.tileSize;
                        sprite.zIndex = 0; 
                        sprite.eventMode = 'none'; 
                        this.container.addChild(sprite);
                    }
                } catch {}
            }
        }
        console.log("Map render complete!");
    }
}