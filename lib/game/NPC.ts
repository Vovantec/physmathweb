import * as PIXI from 'pixi.js';
import { Spine } from '../vendor/spine-pixi-v8.mjs';

export class NPC extends PIXI.Container {
    public spine: Spine;
    public id: string;
    
    // Названия анимаций нужно проверить в ваших файлах!
    // Обычно это 'idle', 'walk', 'animation', 'stand' и т.д.
    // Если анимация не работает, проверьте консоль на ошибки "Animation not found".
    private animIdle: string = 'idle'; 

    constructor(id: string, spineData: any) {
        super();
        this.id = id;

        // Создаем Spine объект из загруженных данных
        this.spine = new Spine(spineData);
        
        // Масштаб (подберите под размер игры)
        this.spine.scale.set(0.25); 
        
        // Центрируем (если точка привязки в ногах, то y=0, x=0 отлично)
        this.spine.x = 0;
        this.spine.y = 0;

        this.addChild(this.spine);

        // Пытаемся запустить анимацию
        // Метод state.setAnimation(trackIndex, animationName, loop)
        try {
            // Проверка на наличие анимации (чтобы не крашилось)
            // У spineData может быть skeleton.data.findAnimation
            const hasIdle = this.spine.skeleton.data.findAnimation(this.animIdle);
            if (hasIdle) {
                this.spine.state.setAnimation(0, this.animIdle, true);
            } else {
                // Если 'idle' нет, пробуем первую попавшуюся
                const firstAnim = this.spine.skeleton.data.animations[0];
                if (firstAnim) {
                    console.log(`NPC ${id}: using fallback animation '${firstAnim.name}'`);
                    this.spine.state.setAnimation(0, firstAnim.name, true);
                }
            }
        } catch (e) {
            console.error(`NPC ${id} animation error:`, e);
        }

        // Интерактивность
        this.eventMode = 'static';
        this.cursor = 'pointer';
        
        // Зона клика (прямоугольник вокруг NPC)
        // x, y, width, height
        this.hitArea = new PIXI.Rectangle(-40, -120, 80, 120);

        this.on('pointerdown', (e) => {
            e.stopPropagation(); // Не двигаемся при клике на NPC
            console.log(`Clicked NPC: ${this.id}`);
            // Тут вызовем диалог
        });
    }
}