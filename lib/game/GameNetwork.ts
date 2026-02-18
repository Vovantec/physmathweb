import * as Colyseus from "colyseus.js";

class GameNetwork {
  client: Colyseus.Client;
  room: Colyseus.Room | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const endpoint = `${protocol}://${window.location.hostname}:2567`;
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