import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    textureSheet: PIXI.Texture | null = null;
    tileSize: number = 40; // Размер тайла, как в main.js (sizeObj)

    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; // Для правильного наложения (Z-index)
    }

    // Загрузка текстур (тайлсета)
    loadTextures(sheet: PIXI.Texture) {
        this.textureSheet = sheet;
    }

    // Рендер карты из JSON данных
    render(mapData: any[][]) {
        if (!this.textureSheet) {
            console.warn("Map texture not loaded!");
            return;
        }

        this.container.removeChildren();

        // Размер одного тайла в текстуре (предположим 32px или как в оригинале)
        // В main.js использовалось: new PIXI.Rectangle(3*p, 11*p, p, p)
        // Нам нужно знать размер тайла в исходной картинке. Пусть будет 32.
        const srcTileSize = 32; 

        mapData.forEach((layer, layerIndex) => {
            // mapData - это массив слоев? Или плоский массив?
            // Судя по maps.json: [[{frame:5}, ...]] - это массив слоев.
            // Однако в main.js renderMap перебирает i и j. 
            // Предположим, что mapData это массив объектов тайлов с координатами или одномерный массив.
            
            // Если mapData это [layer1, layer2], обрабатываем слои
            if (Array.isArray(layer)) {
                layer.forEach((tile: any, index: number) => {
                    if (!tile || tile.frame === undefined) return;

                    // Вычисляем координаты X, Y в мире
                    // Предполагаем, что карта квадратная или ширина фиксирована.
                    // В main.js координаты считались в цикле.
                    // Для простоты: допустим ширина карты 100 тайлов.
                    const mapWidth = 100; 
                    const x = (index % mapWidth) * this.tileSize;
                    const y = Math.floor(index / mapWidth) * this.tileSize;

                    const sprite = this.getTileSprite(tile.frame, srcTileSize);
                    sprite.x = x;
                    sprite.y = y;
                    sprite.width = this.tileSize;
                    sprite.height = this.tileSize;
                    
                    // Z-index: земля (0) ниже объектов
                    sprite.zIndex = layerIndex; 

                    this.container.addChild(sprite);
                });
            }
        });
    }

    // Получение спрайта из тайлсета по ID кадра
    private getTileSprite(frameId: number, size: number): PIXI.Sprite {
        if (!this.textureSheet) return new PIXI.Sprite();

        // Рассчитываем позицию в тайлсете
        // Допустим, тайлсет 16x16 тайлов
        const cols = 16; 
        const tx = (frameId % cols) * size;
        const ty = Math.floor(frameId / cols) * size;

        const rect = new PIXI.Rectangle(tx, ty, size, size);
        const texture = new PIXI.Texture(this.textureSheet.baseTexture, rect);
        
        return new PIXI.Sprite(texture);
    }
}