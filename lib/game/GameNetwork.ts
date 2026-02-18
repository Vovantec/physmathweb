import * as Colyseus from "colyseus.js";

class GameNetwork {
  client: Colyseus.Client | null = null;
  room: Colyseus.Room | null = null;

  constructor() {
    
  }

  // Метод для динамического получения/создания клиента
  private getClient(): Colyseus.Client {
    if (this.client) return this.client; // Если уже создан, возвращаем его

    let endpoint;

    // Проверяем URL только в момент реального коннекта (когда мы 100% в браузере)
    if (!endpoint && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Если это локальная разработка (localhost или локальный IP)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        endpoint = `ws://${hostname}:2567`;
      } else {
        // Универсальное подключение для physmathlab.ru и любого другого домена
        // Автоматически подбирает wss:// для защищенного соединения
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        endpoint = `ws://${hostname}:2567`;
      }
    } else if (!endpoint) {
      // Резервный вариант, если вдруг вызывается вне браузера
      endpoint = "ws://localhost:2567";
    }

    this.client = new Colyseus.Client(endpoint);
    return this.client;
  }

  async connect(token: string) {
    if (this.room) return this.room;

    try {
      // Инициализируем клиента именно здесь
      const client = this.getClient();
      
      this.room = await client.joinOrCreate("game", { token });
      console.log("Joined room successfully!", this.room.sessionId);
      return this.room;
    } catch (e) {
      console.error("Join error:", e);
      throw e;
    }
  }

  leave() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  send(type: string, message?: any) {
    if (this.room) {
      this.room.send(type, message);
    } else {
      console.warn("Cannot send message: not connected to room");
    }
  }
}

export const gameNetwork = new GameNetwork();