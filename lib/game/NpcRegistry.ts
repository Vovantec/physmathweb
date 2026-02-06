// lib/game/NpcRegistry.ts

export interface NpcDefinition {
    id: string;
    alias: string;
    jsonPath: string;
    atlasPath: string;   // <-- Добавляем путь к атласу
    defaultAnim: string;
    scale: number;
}

export const NPC_REGISTRY: Record<string, NpcDefinition> = {
    "3122": {
        id: "3122",
        alias: "npc_assasin_1",
        jsonPath: "/images/npcs/Assassin_1/Assassin_1.json",
        atlasPath: "/images/npcs/Assassin_1/Assassin_1.atlas", // <-- Укажите верный путь!
        defaultAnim: "idle",
        scale: 0.25
    },
    // Добавьте это поле для остальных NPC...
};

export const getNpcAssetsToLoad = () => {
    const assets = [];
    Object.values(NPC_REGISTRY).forEach(npc => {
        // Загружаем JSON под именем "alias"
        assets.push({ alias: npc.alias, src: npc.jsonPath });
        // Загружаем Atlas под именем "alias_atlas"
        assets.push({ alias: npc.alias + '_atlas', src: npc.atlasPath });
    });
    return assets;
};