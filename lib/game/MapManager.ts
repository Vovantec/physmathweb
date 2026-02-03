import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 40; // Размер тайла как в main.js (sizeObj)
    
    constructor() {
        this.container = new PIXI.Container();
        // Тайлы всегда на заднем плане, но внутри контейнера карты
        this.container.zIndex = 0; 
    }

    /**
     * Рендерит карту и возвращает размеры мира в пикселях
     */
    async render(mapData: any[][]): Promise<{ width: number, height: number }> {
        if (!mapData || mapData.length === 0) return { width: 0, height: 0 };

        this.container.removeChildren();
        console.log(`Starting map render. Rows: ${mapData.length}, Cols: ${mapData[0]?.length}`);

        // 1. Сбор уникальных ID тайлов для загрузки
        const uniqueFrames = new Set<string>();
        for (let i = 0; i < mapData.length; i++) {
            if (!Array.isArray(mapData[i])) continue;
            for (let j = 0; j < mapData[i].length; j++) {
                const tile = mapData[i][j];
                // Проверка: в legacy коде frame мог быть объектом или числом
                if (tile && tile.frame !== undefined) {
                    uniqueFrames.add(String(tile.frame));
                }
            }
        }

        // 2. Предзагрузка ассетов
        const assetsToLoad: { alias: string, src: string }[] = [];
        uniqueFrames.forEach(id => {
            const alias = `tile_${id}`;
            if (!PIXI.Assets.cache.has(alias)) {
                assetsToLoad.push({ alias: alias, src: `/images/map/${id}.png` });
            }
        });

        if (assetsToLoad.length > 0) {
            try {
                await PIXI.Assets.load(assetsToLoad);
            } catch (e) {
                console.warn("Some tiles failed to load:", e);
            }
        }

        // 3. Отрисовка сетки
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
                        
                        // Тайлы пола не перекрывают игроков
                        sprite.zIndex = -1; 
                        
                        // Чтобы клик по карте работал (для перемещения)
                        sprite.eventMode = 'static'; 
                        
                        this.container.addChild(sprite);
                    }
                } catch {}
            }
        }

        // Возвращаем размеры мира: Ширина * РазмерТайла
        return {
            width: (mapData[0]?.length || 0) * this.tileSize,
            height: mapData.length * this.tileSize
        };
    }
}