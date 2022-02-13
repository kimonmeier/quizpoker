import WebSocketClient from "@server/connection/WebSocketClient";
import { MemberStatus } from "@shared/message/ServerMessage";

export default class Cache {
    private static instance: Cache;

    public static getInstance() {
        if(Cache.instance == null) {
            Cache.instance = new Cache();
        }

        return Cache.instance;
    }

    private clients: [number, ClientCache][] = [];
    private schaetzungen: [number, number][] = [];
    private fragen: Frage[] = [];

    private constructor() {
        //this.loadFragen();
    }

    public loadFragen(): void {
        
    }

    public getLastFrage(): Frage {
        return this.getUnusedFragen();
    }

    public getUnusedFragen(): Frage {
        return { frage: "Frage 1", hinweis1: "Hinweis 1", hinweis2: "Hinweis 2", antwort: "Antwort", used: false }; 
    }

    public getSchaetzungen(): [number, number][] {
        return this.schaetzungen;
    }

    public setSchaetzung(id: number, schaetzung: number): void {
        this.schaetzungen.push([id, schaetzung]);
    }

    public clearSchaetzungen(): void {
        this.schaetzungen = [];
    }

    public addClient(clientCache: ClientCache): number {
        let maxId = 0;
        for (let index = 0; index < this.clients.length; index++) {
            const element = this.clients[index];
            if(element[0] >= maxId) {
                maxId = element[0];
            }
        }

        maxId += 1;

        this.clients.push([maxId, clientCache]);
        return maxId;
    }

    public updateClient(id: number, client: ClientCache): void {
        this.clients[this.clients.indexOf([id, this.getClientCacheById(id) as ClientCache])] = [id, client]; 
    }

    public removeClient(id: number): void {
        this.clients = this.clients.filter(function(value, index, arr){ 
            return value[0] != id;
        });
    }

    public getClientIdByWebsocket(client: WebSocketClient): number {
        for (let index = 0; index < this.clients.length; index++) {
            const element = this.clients[index];
            if(element[1].client.uuid == client.uuid) {
                return element[0];
            }
        }

        return -1;
    }

    public getClientCacheById(id: number): ClientCache | null {
        for (let index = 0; index < this.clients.length; index++) {
            const element = this.clients[index];
            if(element[0] == id) {
                return element[1];
            }
        }

        return null;
    }

    public getAll(): [number, ClientCache][] {
        return this.clients;
    }
}

export interface ClientCache {
    client: WebSocketClient,
    name: string,
    chips: number,
    status: MemberStatus
}

export interface Frage {
    frage: string,
    hinweis1: string,
    hinweis2: string,
    antwort: string,
    used: boolean
}