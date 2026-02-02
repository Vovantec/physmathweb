import * as Colyseus from "colyseus.js";

class GameNetwork {
  client: Colyseus.Client;
  room: Colyseus.Room | null = null;
  
  // URL игрового сервера
  private readonly GAME_SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "ws://localhost:2567";

  constructor() {
    this.client = new Colyseus.Client(this.GAME_SERVER_URL);
  }

  async connect(token: string) {
    if (this.room) return this.room;

    try {
      // Подключаемся к комнате "game", передавая токен авторизации
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

  // Метод для отправки команд (удобная обертка)
  send(type: string, message?: any) {
    if (this.room) {
      this.room.send(type, message);
    } else {
      console.warn("Cannot send message: not connected to room");
    }
  }
}

// Экспортируем единственный экземпляр (Singleton)
export const gameNetwork = new GameNetwork();