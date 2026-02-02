import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    textureSheet: PIXI.Texture | null = null;
    tileSize: number = 40; // Размер тайла в игре

    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
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

        // Размер одного тайла в исходной текстуре
        const srcTileSize = 32; 

        mapData.forEach((layer, layerIndex) => {
            if (Array.isArray(layer)) {
                layer.forEach((tile: any, index: number) => {
                    if (!tile || tile.frame === undefined) return;

                    // Предполагаем ширину карты 100 тайлов (нужно брать из JSON если есть)
                    const mapWidth = 100; 
                    const x = (index % mapWidth) * this.tileSize;
                    const y = Math.floor(index / mapWidth) * this.tileSize;

                    const sprite = this.getTileSprite(tile.frame, srcTileSize);
                    sprite.x = x;
                    sprite.y = y;
                    sprite.width = this.tileSize;
                    sprite.height = this.tileSize;
                    
                    sprite.zIndex = layerIndex; 

                    this.container.addChild(sprite);
                });
            }
        });
    }

    // Получение спрайта из тайлсета по ID кадра
    private getTileSprite(frameId: number, size: number): PIXI.Sprite {
        if (!this.textureSheet) return new PIXI.Sprite();

        const cols = 16; // Количество колонок в тайлсете
        const tx = (frameId % cols) * size;
        const ty = Math.floor(frameId / cols) * size;

        const rect = new PIXI.Rectangle(tx, ty, size, size);
        
        // FIX: Синтаксис PixiJS v8
        const texture = new PIXI.Texture({
            source: this.textureSheet.source, // В v8 baseTexture -> source
            frame: rect
        });
        
        return new PIXI.Sprite(texture);
    }
}