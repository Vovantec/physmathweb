import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    tileSize: number = 64; 
    
    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    async render(mapData: any[][]): Promise<{ width: number, height: number }> {
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

                // Пол
                if (cell.frame !== undefined) {
                    const texture = this.getTexture(`/images/map/${cell.frame}.png`);
                    if (texture) {
                        const sprite = new PIXI.Sprite(texture);
                        sprite.x = x; sprite.y = y;
                        sprite.width = this.tileSize; sprite.height = this.tileSize;
                        sprite.zIndex = -1000; // На самом дне
                        sprite.eventMode = 'static'; 
                        this.container.addChild(sprite);
                    }
                }

                // Объект
                if (cell.objects && cell.objects.obj) {
                    const texture = this.getTexture(`/images/map/${cell.objects.obj}.png`);
                    if (texture) {
                        const objSprite = new PIXI.Sprite(texture);
                        const size = cell.objects.size || 1;
                        
                        objSprite.width = this.tileSize * size;
                        
                        // В Legacy коде высота часто подгонялась. Тут сделаем простую логику.
                        // Если спрайт квадратный - ок, если высокий - он будет вытянут вверх
                        const ratio = texture.height / texture.width;
                        objSprite.height = objSprite.width * ratio;

                        // Позиционирование: ставим якорь в низ-центр клетки
                        // Но так как у нас координаты x,y это Top-Left клетки...
                        // Настроим так:
                        objSprite.anchor.set(0.5, 1);
                        objSprite.x = x + (this.tileSize * size) / 2; // Центр по X
                        objSprite.y = y + this.tileSize; // Низ по Y

                        // Сортировка: объект на линии Y должен перекрывать игрока, который выше него
                        objSprite.zIndex = y; 
                        
                        this.container.addChild(objSprite);
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