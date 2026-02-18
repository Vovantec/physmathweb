import * as Colyseus from "colyseus.js";

class GameNetwork {
  client: Colyseus.Client;
  room: Colyseus.Room | null = null;

  constructor() {
    let endpoint = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
    
    // Если переменная не задана в .env, динамически подставляем текущий домен
    if (!endpoint && typeof window !== 'undefined') {
      // Если сайт на https, используем защищенный wss://, иначе ws://
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Берем текущий домен (например, physmathlab.ru) и добавляем порт 2567
      endpoint = `${protocol}://${window.location.hostname}:2567`;
    } else if (!endpoint) {
      endpoint = "ws://localhost:2567";
    }

    this.client = new Colyseus.Client(endpoint);
  }

  async connect(token: string) {
    if (this.room) return this.room;

    try {
      this.room = await this.client.joinOrCreate("game", { token });
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