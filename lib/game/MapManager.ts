import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 40;
    
    // Кэш текстур
    private textureCache: Map<string, PIXI.Texture> = new Map();

    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    loadTextures(sheet: any) {}

    async render(mapData: any[][]) {
        if (!mapData || mapData.length === 0) return;

        this.container.removeChildren();
        console.log(`Starting map render. Size: ${mapData.length}x${mapData[0].length}`);

        // 1. Сбор уникальных ID тайлов, чтобы не грузить дубликаты
        const uniqueFrames = new Set<string>();
        for (let i = 0; i < mapData.length; i++) {
            for (let j = 0; j < mapData[i].length; j++) {
                const tile = mapData[i][j];
                // Проверяем, что frame существует. В легаси коде это число (ID картинки)
                if (tile && tile.frame !== undefined) {
                    uniqueFrames.add(String(tile.frame));
                }
            }
        }

        console.log(`Found ${uniqueFrames.size} unique tiles to load.`);

        // 2. Формируем список ассетов для загрузки
        // Путь совпадает с легаси: images/map/1.png
        const assetsToLoad: { alias: string, src: string }[] = [];
        
        uniqueFrames.forEach(id => {
            const alias = `tile_${id}`;
            // Проверяем, есть ли уже в кэше Pixi
            if (!PIXI.Assets.cache.has(alias)) {
                assetsToLoad.push({
                    alias: alias,
                    src: `/images/map/${id}.png`
                });
            }
        });

        // 3. Загружаем всё пачкой (параллельно)
        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
            } catch (e) {
                console.warn("Some tiles failed to load (likely invisible/logic tiles). Continuing...");
            }
        }

        // 4. Синхронная отрисовка карты (теперь это будет быстро)
        for (let i = 0; i < mapData.length; i++) {
            for (let j = 0; j < mapData[i].length; j++) {
                const tileData = mapData[i][j];
                if (!tileData || tileData.frame === undefined) continue;

                const frameId = String(tileData.frame); 
                const alias = `tile_${frameId}`;
                
                // Пытаемся получить текстуру
                let texture: PIXI.Texture;
                try {
                    texture = PIXI.Assets.get(alias);
                } catch {
                    // Если текстуры нет (например, логический блок без картинки), пропускаем
                    continue;
                }

                if (texture) {
                    const sprite = new PIXI.Sprite(texture);
                    
                    sprite.x = j * this.tileSize;
                    sprite.y = i * this.tileSize;
                    sprite.width = this.tileSize;
                    sprite.height = this.tileSize;
                    sprite.zIndex = 0; 
                    
                    // Оптимизация: отключаем события мыши для тайлов земли
                    sprite.eventMode = 'none'; 

                    this.container.addChild(sprite);
                }
            }
        }
        
        console.log("Map render complete!");
    }
}