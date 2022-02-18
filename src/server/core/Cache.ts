import WebSocketClient from "@server/connection/WebSocketClient";
import { MemberStatus } from "@shared/message/ServerMessage";
import ArrayHelper from "@shared/utils/ArrayUtils";
import * as fragen from "./frage.json";

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
    private currentFrage: Frage | null = null;

    private constructor() {
        this.loadFragen();
    }

    public loadFragen(): void {
        for(const element in fragen) {
            const current = fragen[element];

            this.fragen.push({
                frage: current.Frage,
                hinweis1: current.Hinweis_1,
                hinweis2: current.Hinweis_2,
                antwort: current.Antwort,
                einheit: current.Einheit ?? "",
                used: false
            })
        }

        this.fragen = ArrayHelper.shuffleArray(this.fragen);
    }

    public getLastFrage(): Frage | null {
        return this.currentFrage;
    }

    public saveFrage(): void {
        if (this.currentFrage == null) {
            return;
        }

        const idx = this.fragen.findIndex(x => x == this.currentFrage) as number;
        this.fragen[idx].used = true;
    }

    public getUnusedFragen(): Frage {
        const currentFrage = this.fragen.filter(x => !x.used)[0];;
        this.currentFrage = currentFrage;
        return currentFrage;
    }

    public getSchaetzungen(): [number, number][] {
        return this.schaetzungen;
    }

    public getSchaetzung(memberId: number): number {
        if(this.schaetzungen.filter(x => x[0] == memberId)[0] == null || this.schaetzungen.filter(x => x[0] == memberId)[0] == undefined) {
            return 0;
        }

        return this.schaetzungen.filter(x => x[0] == memberId)[0][1];
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

    public getHighestId(): number {
        var highestId = 0;

        for (let index = 0; index < this.clients.length; index++) {
            const element = this.clients[index];

            if(element[0] >= highestId) {
                highestId = element[0];
            }
        }

        return highestId;
    }
}

export interface ClientCache {
    client: WebSocketClient,
    name: string,
    link: string,
    chips: number,
    status: MemberStatus
}

export interface Frage {
    frage: string,
    hinweis1: string,
    hinweis2: string,
    antwort: string,
    einheit: string,
    used: boolean
}