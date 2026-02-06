// lib/game/NPC.ts
import * as PIXI from 'pixi.js';
import { Spine } from '../vendor/spine-pixi-v8.mjs';

export class NPC extends PIXI.Container {
    public spine: Spine;
    public id: string;
    private animIdle: string = 'idle'; 

    // Изменили аргумент: принимаем alias (строку), а не объект данных
    constructor(id: string, spineAlias: string, scale: number = 0.25) {
        super();
        this.id = id;

        // ИСПОЛЬЗУЕМ Spine.from - это ключевое исправление
        this.spine = Spine.from({
            skeleton: spineAlias,           // Имя JSON в кэше
            atlas: spineAlias + '_atlas',   // Имя Atlas в кэше (мы добавили суффикс в Registry)
            scale: scale,
            autoUpdate: true,
        });
        
        // Центрируем
        this.spine.x = 0;
        this.spine.y = 0;
        
        this.addChild(this.spine);

        // Запуск анимации
        try {
            const hasIdle = this.spine.skeleton.data.findAnimation(this.animIdle);
            if (hasIdle) {
                this.spine.state.setAnimation(0, this.animIdle, true);
            } else {
                const firstAnim = this.spine.skeleton.data.animations[0];
                if (firstAnim) {
                    this.spine.state.setAnimation(0, firstAnim.name, true);
                }
            }
        } catch (e) {
            console.warn(`Animation error for NPC ${id}:`, e);
        }
    }
}