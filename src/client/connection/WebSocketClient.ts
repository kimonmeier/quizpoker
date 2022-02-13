import { ClientMessage } from "@shared/message/ClientMessage";
import { ServerMessage } from "@shared/message/ServerMessage";

export default class WebSocketClient {
    private readonly socket: WebSocket;

	public constructor(public readonly ip: string) {
        this.socket = new WebSocket(ip)
		this.socket.onmessage = (event) => {this.recieve(JSON.parse(event.data as string))};
	}

	public send(m: ClientMessage): void {
		this.socket.send(JSON.stringify(m));
	}

    public recieve(m: ServerMessage): void {
        
    }

	public get isOpen(): boolean {
		return this.socket.readyState === WebSocket.OPEN;
	}
}