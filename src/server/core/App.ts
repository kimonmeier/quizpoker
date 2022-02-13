import WebSocketClient from "@server/connection/WebSocketClient";
import WebSocketConnection from "@server/connection/WebSocketConnection";
import GameManager from "@server/game/GameManager";
import Bet from "@shared/entities/Bet";
import { ClientEvents } from "@shared/enums/ClientEvents";
import { ServerEvents } from "@shared/enums/ServerEvents";
import { ClientMessage, GameMasterAction, MemberAction } from "@shared/message/ClientMessage";
import { FragenPhase, MemberStatus } from "@shared/message/ServerMessage";
import { runInThisContext } from "vm";
import Cache, { Frage } from "./Cache";

export default class App {
    public readonly WebSocket: WebSocketConnection;
    public readonly GameManager: GameManager;
    public lastControlled: number = 0;

    public constructor() {
        this.WebSocket = new WebSocketConnection();
        this.GameManager = new GameManager();
    }

    public startApp(): void {
        console.log("Websocket wurde gestartet!");

        this.WebSocket.connect();

        this.WebSocket.addListener("message", (client: WebSocketClient, message: ClientMessage) => {
            console.log("Neue Nachricht vo dem Client: " + client.ip);
            console.log(message);
            
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
                            this.lastControlled = message.member_id!;

                            this.WebSocket.broadcast({
                                type: ServerEvents.PLAYER_HAS_CONTROLS,
                                member_id: message.member_id as number,
                                minimumBet: this.GameManager.getLastBet().bet
                            });
                            
                            break;
                        
                        case GameMasterAction.NEXT_QUESTION:
                            this.GameManager.flushChips();

                            Cache.getInstance().getAll().forEach((element) => {

                                if(element[1].chips <= 0) {
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

                            this.GameManager.forwardRoles();

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

                            this.WebSocket.broadcast({
                                type: ServerEvents.ROLES_SELECTED,
                                big_blind: this.GameManager.getBigBlind(),
                                small_blind: this.GameManager.getSmallBlind()
                            });

                            this.GameManager.addBet({ bet: 100, player_id: this.GameManager.getSmallBlind() });
                            this.GameManager.addBet({ bet: 200, player_id: this.GameManager.getBigBlind() });

                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                chips: this.GameManager.getRemainingChips(this.GameManager.getSmallBlind()),
                                einsatz: this.GameManager.getBetValues(this.GameManager.getSmallBlind()),
                                hasControls: false,
                                id: this.GameManager.getSmallBlind(),
                                status: MemberStatus.ON
                            });

                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                chips: this.GameManager.getRemainingChips(this.GameManager.getBigBlind()),
                                einsatz: this.GameManager.getBetValues(this.GameManager.getBigBlind()),
                                hasControls: false,
                                id: this.GameManager.getBigBlind(),
                                status: MemberStatus.ON
                            });

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

                            this.GameManager.initRoles();

                            break;
                        
                        case GameMasterAction.UPDATE_MEMBER:
                            if(this.GameManager.getRemainingChips(message.member_id!) != message.chips) {
                                const updateClient = Cache.getInstance().getClientCacheById(message.member_id!)!;

                                updateClient.chips = message.chips! - this.GameManager.getBetValues(message.member_id!);

                                Cache.getInstance().updateClient(message.member_id!, updateClient);
                            }


                            if(this.GameManager.getBetValues(message.member_id!) != message.einsatz!) {
                                this.GameManager.clearBetFromPlayer(message.member_id!);
                                this.GameManager.addBet({ player_id: message.member_id!, bet: message.einsatz! });
                            }

                            this.WebSocket.broadcast({
                                type: ServerEvents.UPDATED_MITGLIED_VALUES,
                                chips: this.GameManager.getRemainingChips(message.member_id!),
                                einsatz: this.GameManager.getBetValues(message.member_id!),
                                hasControls: this.lastControlled == message.member_id!,
                                id: message.member_id!,
                                status: MemberStatus.ON
                            })
                            break;
                        case GameMasterAction.WON_GAME:
                            this.WebSocket.broadcast({
                                type: ServerEvents.PLAYER_WON,
                                chips: this.GameManager.getPot(),
                                id: message.member_id!
                            });
                    }

                    break;
                    
                case ClientEvents.MITGLIED_ACTION:
                    const userId = Cache.getInstance().getClientIdByWebsocket(client);
                    const user = Cache.getInstance().getClientCacheById(userId);
                    const lastBet = this.GameManager.getLastBet();
                    const newBet: Bet =  { player_id: userId, bet: lastBet.bet };

                    switch(message.action) {
                        case MemberAction.CALL:
                            this.GameManager.addBet(newBet);

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
                            newBet.bet += message.value;
                            this.GameManager.addBet(newBet); 

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