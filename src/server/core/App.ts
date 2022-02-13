import WebSocketClient from "@server/connection/WebSocketClient";
import WebSocketConnection from "@server/connection/WebSocketConnection";
import GameManager from "@server/game/GameManager";
import { ClientEvents } from "@shared/enums/ClientEvents";
import { ServerEvents } from "@shared/enums/ServerEvents";
import { ClientMessage, GameMasterAction, MemberAction } from "@shared/message/ClientMessage";
import { FragenPhase, MemberStatus } from "@shared/message/ServerMessage";
import Cache, { Frage } from "./Cache";

export default class App {
    public readonly WebSocket: WebSocketConnection;
    public readonly GameManager: GameManager;

    public constructor() {
        this.WebSocket = new WebSocketConnection();
        this.GameManager = new GameManager();
    }

    public startApp(): void {
        console.log("Websocket wurde gestartet!");

        this.WebSocket.connect();

        this.WebSocket.addListener("message", (client: WebSocketClient, message: ClientMessage) => {
            console.log("Neue Nachricht vo dem Client: " + client.ip);
            
            switch(message.type) {
                case ClientEvents.MEMBER_LOGIN:
                    Cache.getInstance().getAll().forEach(element => {
                        client.send({
                            type: ServerEvents.NEW_MITGLIED,
                            id: element[0],
                            name: element[1].name
                        })
                    });
                
                    var id: number = Cache.getInstance().addClient({ chips: 10000, name: message.name, client: client, status: MemberStatus.ON });
                    client.send({ type: ServerEvents.MITGLIED_SUCCESSFULL_LOGIN, id: id });
                    this.WebSocket.broadcast({type: ServerEvents.NEW_MITGLIED, id: id, name: message.name});
                    break;

                case ClientEvents.MEMBER_LEAVT:
                    var id: number = Cache.getInstance().getClientIdByWebsocket(client);
                    Cache.getInstance().removeClient(id);
                    this.WebSocket.broadcastExcept({type: ServerEvents.REMOVED_MITGLIED, id: id}, client);
                    break;

                case ClientEvents.SCHAETZUNG_ABGEBEN:
                    var id: number = Cache.getInstance().getClientIdByWebsocket(client);
                    Cache.getInstance().setSchaetzung(id, message.schaetzung);

                    this.WebSocket.broadcast({
                        type: ServerEvents.MEMBER_ISSUED_SCHAETZUNG,
                        schaetzung: message.schaetzung.toString(),
                        id: message.id
                    })
                    break;

                case ClientEvents.GAME_MASTER_ACTION:
                    switch(message.action) {
                        case GameMasterAction.CONTROLS_SELECTED:
                            this.WebSocket.broadcast({
                                type: ServerEvents.PLAYER_HAS_CONTROLS,
                                member_id: message.member_id as number,
                                minimumBet: this.GameManager.getLastBet().bet
                            });
                            
                            break;
                        
                        case GameMasterAction.NEXT_QUESTION:
                            Cache.getInstance().getAll().forEach((element) => {

                                if(element[1].chips <= 0) { //TODO: Small und BigBlinds) {
                                    element[1].status = MemberStatus.PLEITE;
                                    Cache.getInstance().updateClient(element[0], element[1]);
                                }
                                
                                this.WebSocket.broadcast({
                                    type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                    id: element[0],
                                    chips: element[1].chips,
                                    einsatz: 0,
                                    hasControls: false,
                                    status: element[1].status
                                })
                            })

                            let frage = Cache.getInstance().getUnusedFragen();
                            this.GameManager.clearBets();

                            client.send({
                                type: ServerEvents.GAME_MASTER_QUESTION,
                                answer: frage.antwort,
                                einheit: "",
                                hinweis1: frage.hinweis1,
                                hinweis2: frage.hinweis2,
                                question: frage.frage
                            })

                            this.WebSocket.broadcast({
                                type: ServerEvents.NAECHSTE_FRAGE,
                                einheit: "",
                                frage: frage.frage,
                                phase: FragenPhase.FRAGE
                            })
                            break;

                        case GameMasterAction.SHOW_HINWEIS:
                            const old_frage: Frage = Cache.getInstance().getLastFrage();

                            var hinweisToSend: string = "";
                            
                            switch(message.phase as FragenPhase) {
                                case FragenPhase.FRAGE:
                                    hinweisToSend = old_frage.frage;
                                    break;
                                case FragenPhase.RUNDE_1:
                                    hinweisToSend = old_frage.hinweis1;
                                    break;
                                case FragenPhase.RUNDE_2:
                                    hinweisToSend = old_frage.hinweis2;
                                    break;
                                case FragenPhase.ANTWORT:
                                    hinweisToSend = old_frage.antwort;
                                    break;
                            }

                            this.WebSocket.broadcast({
                                type: ServerEvents.NAECHSTE_PHASE,
                                hinweis: hinweisToSend,
                                phase: message.phase as FragenPhase
                            })
                            break;

                        case GameMasterAction.START_GAME:
                            this.WebSocket.broadcast({
                                type: ServerEvents.GAME_STARTED
                            });

                            break;
                    }

                    break;
                    
                case ClientEvents.MITGLIED_ACTION:
                    const userId = Cache.getInstance().getClientIdByWebsocket(client);
                    const user = Cache.getInstance().getClientCacheById(userId);
                    const lastBet = this.GameManager.getLastBet();
                    lastBet.player_id = userId;

                    switch(message.action) {
                        case MemberAction.CALL:
                            this.GameManager.addBet(lastBet);

                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                id: userId,
                                einsatz: this.GameManager.getBetValues(userId),
                                chips: this.GameManager.getRemainingChips(userId),
                                hasControls: false,
                                status: MemberStatus.ON
                            });
                            
                            break;
                        case MemberAction.RAISE:
                            lastBet.bet += message.value;
                            this.GameManager.addBet(lastBet); 

                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                id: userId,
                                einsatz: this.GameManager.getBetValues(userId),
                                chips: this.GameManager.getRemainingChips(userId),
                                hasControls: false,
                                status: MemberStatus.ON
                            });

                            break;
                        case MemberAction.FOLD:
                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                id: userId,
                                einsatz: this.GameManager.getBetValues(userId),
                                chips: this.GameManager.getRemainingChips(userId),
                                hasControls: false,
                                status: MemberStatus.FOLDED
                            });

                            break;
                    }
                
                this.WebSocket.broadcast({
                    type: ServerEvents.UPDATED_GAME_VALUES,
                    phase: 0,
                    pot: this.GameManager.getPot()
                })
            }
        });
    }

    public stopApp(): void {
    }
}