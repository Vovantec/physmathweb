import * as PIXI from 'pixi.js';

export class MapManager {
    container: PIXI.Container;
    textureSheet: PIXI.Texture | null = null;
    tileSize: number = 40; 

    constructor() {
        this.container = new PIXI.Container();
        this.container.sortableChildren = true; 
    }

    loadTextures(sheet: PIXI.Texture) {
        this.textureSheet = sheet;
    }

    render(mapData: any[][]) {
        if (!this.textureSheet) return;

        this.container.removeChildren();
        const srcTileSize = 32; 

        mapData.forEach((layer, layerIndex) => {
            if (Array.isArray(layer)) {
                layer.forEach((tile: any, index: number) => {
                    if (!tile || tile.frame === undefined) return;

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

    private getTileSprite(frameId: number, size: number): PIXI.Sprite {
        if (!this.textureSheet) return new PIXI.Sprite();

        const cols = 16;
        const tx = (frameId % cols) * size;
        const ty = Math.floor(frameId / cols) * size;

        const rect = new PIXI.Rectangle(tx, ty, size, size);
        
        // Синтаксис PixiJS v8: объект с source
        const texture = new PIXI.Texture({
            source: this.textureSheet.source, 
            frame: rect
        });
        
        return new PIXI.Sprite(texture);
    }
}