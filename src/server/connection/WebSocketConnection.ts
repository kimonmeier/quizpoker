import Connection from "@shared/Connection";
import { ServerEvents } from "@shared/enums/ServerEvents";
import { ServerMessage } from "@shared/message/ServerMessage";
import EventEmitter from "events";
import { IncomingMessage } from "http";
import WebSocket from "ws";
import Client from "./Client";
import WebSocketClient from "./WebSocketClient";


export default class WebSocketConnection
	extends EventEmitter
	implements Connection {
	private socket!: WebSocket.Server;
	private _clients: WebSocketClient[] = [];

	public constructor() {
		super();
	}

	public connect(): void {
		
		this.socket = new WebSocket.Server({
			port: 2222
		});
		
		this.socket.on("connection", this.handleConnect);
	}

	public broadcast(m: ServerMessage): void {
		this.sendTo(this._clients, m);
	}

	public broadcastExcept(m: ServerMessage, ... clients:  WebSocketClient[]): void {
		let arrays = new Array();
		this._clients.forEach(element => {
			if(!clients.includes(element, 0)) {
				arrays.push(element);
			}
		});
		
		this.sendTo(arrays, m);
	}
    
	public sendTo(clients: WebSocketClient[], m: ServerMessage): void {
		for (const client of clients) client.send(m);
	}

	public get clients(): Client[] {
		return this._clients;
	}

	private handleConnect = (clientSocket: WebSocket, request: IncomingMessage) => {
		const ip = request.connection.remoteAddress;

		if (!ip) throw new Error("Connection had no ip");

		const client = new WebSocketClient(clientSocket, ip);

		this._clients.push(client);
		this.emit("connect", client);

		clientSocket.on("close", () => this.handleClose(client));
		clientSocket.on("message", (m) => this.handleMessage(client, m));

		client.send({type: ServerEvents.PING, ms: 0});
	};

	private handleClose = (client: WebSocketClient) => {
		this._clients = this._clients.filter((c) => c !== client);
		this.emit("disconnect", client);
	};
    
	private handleMessage = (client: WebSocketClient, data: WebSocket.Data) => {
		this.emit("message", client, JSON.parse(data.toString()));
	};
}