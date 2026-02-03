import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 40;
    
    // Кэш текстур, чтобы не грузить одну и ту же картинку 100 раз
    private textureCache: Map<string, PIXI.Texture> = new Map();

    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    // Метод loadTextures больше не нужен, удаляем или оставляем пустым
    loadTextures(sheet: any) {}

    async render(mapData: any[][]) {
        this.container.removeChildren();

        // Проходимся по всей карте
        for (let i = 0; i < mapData.length; i++) {
            for (let j = 0; j < mapData[i].length; j++) {
                const tileData = mapData[i][j];
                
                // В старом коде frame - это номер картинки (например, "1")
                // Путь: images/map/1.png
                if (!tileData || tileData.frame === undefined) continue;

                const frameId = tileData.frame; 
                const textureUrl = `/images/map/${frameId}.png`;

                try {
                    let texture = this.textureCache.get(textureUrl);

                    if (!texture) {
                        // Если текстуры нет в кэше — загружаем
                        texture = await PIXI.Assets.load(textureUrl);
                        if (texture) this.textureCache.set(textureUrl, texture);
                    }

                    if (texture) {
                        const sprite = new PIXI.Sprite(texture);
                        
                        // Координаты
                        sprite.x = j * this.tileSize;
                        sprite.y = i * this.tileSize;
                        
                        // Размеры
                        sprite.width = this.tileSize;
                        sprite.height = this.tileSize;
                        
                        // Z-index (слои)
                        sprite.zIndex = 0; 

                        this.container.addChild(sprite);
                    }
                } catch (e) {
                    // Игнорируем ошибки загрузки отдельных тайлов (пустота)
                }
            }
        }
    }
}