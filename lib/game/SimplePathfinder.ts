type Point = { x: number; y: number };

class Node {
    x: number;
    y: number;
    walkable: boolean;
    g: number = 0; // Стоимость от старта
    h: number = 0; // Эвристика до финиша
    f: number = 0; // Общая стоимость (g + h)
    parent: Node | null = null;

    constructor(x: number, y: number, walkable: boolean) {
        this.x = x;
        this.y = y;
        this.walkable = walkable;
    }
}

export class SimplePathfinder {
    private grid: Node[][] = [];
    private width: number = 0;
    private height: number = 0;
    private tileSize: number = 64;

    constructor() {}

    /**
     * Создает сетку узлов из данных карты
     */
    buildGrid(mapData: any[][]) {
        this.height = mapData.length;
        this.width = mapData[0]?.length || 0;
        this.grid = [];

        for (let y = 0; y < this.height; y++) {
            const row: Node[] = [];
            for (let x = 0; x < this.width; x++) {
                const cell = mapData[y][x];
                // Если есть объекты (дерево/стена) - клетка непроходима
                const isWalkable = !cell?.objects; 
                row.push(new Node(x, y, isWalkable));
            }
            this.grid.push(row);
        }
    }

    /**
     * Основной метод поиска пути A*
     */
    findPath(startX: number, startY: number, endX: number, endY: number): number[][] {
        // Проверки на границы и валидность
        if (!this.isValid(startX, startY) || !this.isValid(endX, endY)) return [];
        
        // Сбрасываем состояние узлов перед новым поиском (важно!)
        const nodes = this.resetNodes();
        
        const startNode = nodes[startY][startX];
        const endNode = nodes[endY][endX];

        if (!endNode.walkable) return []; // Цель внутри стены

        const openList: Node[] = [];
        const closedList: Set<Node> = new Set();

        openList.push(startNode);

        while (openList.length > 0) {
            // 1. Берем узел с самым низким F
            // (Для простоты сортируем массив, для супер-оптимизации нужна BinaryHeap, но тут это не критично)
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift() as Node;

            // 2. Если дошли до финиша
            if (currentNode === endNode) {
                return this.retracePath(currentNode);
            }

            closedList.add(currentNode);

            // 3. Проверяем соседей
            const neighbors = this.getNeighbors(currentNode, nodes);

            for (const neighbor of neighbors) {
                if (closedList.has(neighbor) || !neighbor.walkable) {
                    continue;
                }

                // Стоимость перехода: 10 для прямых, 14 для диагонали (примерно корень из 2 * 10)
                const isDiagonal = currentNode.x !== neighbor.x && currentNode.y !== neighbor.y;
                const costToMove = isDiagonal ? 14 : 10;
                
                const gScore = currentNode.g + costToMove;

                const isInOpen = openList.includes(neighbor);

                if (!isInOpen || gScore < neighbor.g) {
                    neighbor.g = gScore;
                    neighbor.h = this.heuristic(neighbor, endNode);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;

                    if (!isInOpen) {
                        openList.push(neighbor);
                    }
                }
            }
        }

        // Путь не найден
        return [];
    }

    private resetNodes(): Node[][] {
        // Нам нужно работать с чистой копией или сбрасывать параметры
        // Чтобы не пересоздавать объекты (дорого), просто сбросим g, h, f, parent
        // Но так как у нас React и возможны параллельные запросы, 
        // безопаснее быстро пересоздать сетку ссылок или клонировать текущую структуру.
        // Для игры такого размера проще всего использовать текущую this.grid,
        // но перед поиском пройтись и обнулить параметры.
        
        for(let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++) {
                const n = this.grid[y][x];
                n.g = 0; n.h = 0; n.f = 0; n.parent = null;
            }
        }
        return this.grid;
    }

    private getNeighbors(node: Node, grid: Node[][]): Node[] {
        const neighbors: Node[] = [];
        // 8 направлений (включая диагонали)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;

                const checkX = node.x + x;
                const checkY = node.y + y;

                if (this.isValid(checkX, checkY)) {
                    neighbors.push(grid[checkY][checkX]);
                }
            }
        }
        return neighbors;
    }

    private isValid(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Манхэттенское расстояние (быстро и просто)
    // Для диагоналей лучше подходит Diagonal distance, но Manhattan тоже ок
    private heuristic(nodeA: Node, nodeB: Node): number {
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        return (dx + dy) * 10;
    }

    private retracePath(endNode: Node): number[][] {
        const path: number[][] = [];
        let currentNode: Node | null = endNode;

        while (currentNode !== null) {
            path.push([currentNode.x, currentNode.y]);
            currentNode = currentNode.parent;
        }
        
        // Путь идет от конца к началу, разворачиваем
        return path.reverse();
    }

    /**
     * Конвертация пикселей в сетку
     */
    toGrid(pixel: number): number {
        return Math.floor(pixel / this.tileSize);
    }
}