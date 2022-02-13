import { ServerMessage } from "@shared/message/ServerMessage";
import * as uuid from 'uuid';
import WebSocket from "ws";
import Client from "./Client";

export default class WebSocketClient implements Client {
	public readonly uuid: string;

	public constructor(private socket: WebSocket, public readonly ip: string) {
		this.uuid = uuid.v4();
	}

	public send(m: ServerMessage): void {
		this.socket.send(JSON.stringify(m));
	}

	public get isOpen(): boolean {
		return this.socket.readyState === WebSocket.OPEN;
	}
}