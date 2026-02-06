// lib/game/NPC.ts
import * as PIXI from 'pixi.js';
import { Spine } from '../vendor/spine-pixi-v8.mjs';
import { OutlineFilter } from '../vendor/pixi-filters.mjs'; // Импорт фильтров

export class NPC extends PIXI.Container {
    public spine: Spine;
    public id: string;
    private animIdle: string = 'idle'; 
    private outlineFilter: OutlineFilter; // Храним фильтр

    // Добавил scale как необязательный параметр для гибкости (по умолчанию 0.25)
    constructor(id: string, spineAlias: string, scale: number = 0.25) {
        super();
        this.id = id;

        // --- 1. РЕНДЕРИНГ (Ваш рабочий код) ---
        this.spine = Spine.from({
            skeleton: spineAlias,           // например 'npc_assasin_1'
            atlas: spineAlias + '_atlas',   // например 'npc_assasin_1_atlas'
            scale: scale,
            autoUpdate: true,               // Авто-обновление анимации
        });
        
        // Центрируем
        this.spine.x = 0;
        this.spine.y = 0;

        this.addChild(this.spine);

        // --- 2. АНИМАЦИЯ (Ваш рабочий код) ---
        try {
            // В Spine v8 доступ к данным через this.spine.skeleton.data
            const hasIdle = this.spine.skeleton.data.findAnimation(this.animIdle);
            
            if (hasIdle) {
                this.spine.state.setAnimation(0, this.animIdle, true);
            } else {
                const firstAnim = this.spine.skeleton.data.animations[0];
                if (firstAnim) {
                    // console.log(`NPC ${id}: using fallback animation '${firstAnim.name}'`);
                    this.spine.state.setAnimation(0, firstAnim.name, true);
                }
            }
        } catch (e) {
            console.warn(`NPC ${id} animation error:`, e);
        }

        // --- 3. ИНТЕРАКТИВНОСТЬ И ЭФФЕКТЫ (Адаптация) ---
        
        this.eventMode = 'static';
        this.cursor = 'pointer';
        // HitArea чтобы кликать было удобнее (с небольшим запасом вокруг модели)
        this.hitArea = new PIXI.Rectangle(-40, -120, 80, 120);

        // Настройка обводки (Outline)
        this.outlineFilter = new OutlineFilter({ 
            thickness: 3, 
            color: 0x99ff99, 
            quality: 0.5 
        });
        this.outlineFilter.enabled = false; // Скрываем по умолчанию
        this.filters = [this.outlineFilter];

        // События наведения
        this.on('pointerover', () => {
            this.outlineFilter.enabled = true;
        });
        
        this.on('pointerout', () => {
            this.outlineFilter.enabled = false;
        });

        // Событие клика
        this.on('pointertap', (e) => { // pointertap лучше для кликов (down+up)
            e.stopPropagation(); // Блокируем клик по земле (чтобы игрок не бежал к NPC при клике)
            
            console.log(`Interacted with NPC: ${this.id}`);
            
            // Генерируем событие 'interact', которое может слушать GameEngine
            this.emit('interact', this.id, this.x, this.y);
        });
    }
}