import { PlayerRole } from "../../shared/enums/PlayerRole";
import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import { GameMasterAction } from "../../shared/message/ClientMessage";
import { FragenPhase, MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import WebSocketClient from "../connection/WebSocketClient";
import CustomHTMLTable from "./CustomHTMLTable";

document.addEventListener("DOMContentLoaded", (event) => {
    GameMasterApp.getInstance().startApp();
}); 

window.onbeforeunload = (ev: Event) => {
    GameMasterApp.getInstance().stopApp();
}

export default class GameMasterApp {
    private static instance: GameMasterApp;

    public static getInstance(): GameMasterApp {
        if(GameMasterApp.instance == undefined) {
            new GameMasterApp();
        }

        return GameMasterApp.instance;
    }

    private client!: WebSocketClient;

    private teilnehmerTable!: CustomHTMLTable;
    private fragenTable!: CustomHTMLTable;

    private constructor() {
        GameMasterApp.instance = this;
    }

    public startApp(): void {
        this.client = new WebSocketClient("ws://gameshow.k-meier.ch:2222");

        this.declareVariables();
        this.registerListener();

        this.client.recieve = this.recieve;
    }

    public stopApp(): void {
        this.client.send({
            type: ClientEvents.MEMBER_LEAVT
        })
    }

    private declareVariables(): void {
        this.fragenTable = new CustomHTMLTable("fragenTable");
        this.fragenTable.addHeaders(
            { name: "Kategorie", width: "col-sm-1" },
            { name: "Fragen" },
            { name: "Aufdecken", width: "col-sm-1" }
        );

        this.teilnehmerTable = new CustomHTMLTable("teilnehmnerTable");
        this.teilnehmerTable.addHeaders(
            { name: "Name" },
            { name: "Chips" },
            { name: "Einsatz" },
            { name: "Schätzung" },
            { name: "Rolle", width: "col-sm-1" },
            { name: "Kontrolle", width: "col-sm-1" },
            { name: "Update", width: "col-sm-1" },
            { name: "Won", width: "col-sm-1" }
        );
    }

    private registerListener(): void {
        document.getElementById("btnNextQuestion")!.onclick = (event) => {
            this.client.send({
                type: ClientEvents.GAME_MASTER_ACTION,
                action: GameMasterAction.NEXT_QUESTION
            });
        };

        document.getElementById("btnStartGame")!.onclick = (event: MouseEvent) => {
            this.client.send({
                type: ClientEvents.GAME_MASTER_ACTION,
                action: GameMasterAction.START_GAME
            });
            
            document.getElementById("btnStartGame")!.hidden = true;
        }
    }

    private getRole(role: PlayerRole): string {
        const element = document.createElement('div') as HTMLDivElement;

        switch(role) {
            case PlayerRole.SMALL_BLIND:
                element.textContent = "Small Blind";
                element.classList.add("alert");
                element.classList.add("alert-warning")
                break;
            case PlayerRole.BIG_BLIND:
                element.textContent = "Big Blind";
                element.classList.add("alert");
                element.classList.add("alert-success")
                break;
        }

        return element.outerHTML;
    }

    private clearRoles(): void {
        for(var i = 0; true; i++) {
            if(GameMasterApp.getInstance().teilnehmerTable.getRow(i) == undefined) {
                break;
            }

            GameMasterApp.getInstance().teilnehmerTable.editRowValueByIdx(i, "Rolle", "");
        }
    }

    private recieve(m: ServerMessage): void {
        switch(m.type) {
            case ServerEvents.PING:
                console.log("Ping Event");
                GameMasterApp.getInstance().client.send({type: ClientEvents.PING_REPLAY, time: 0})
                break;
                
            case ServerEvents.NEW_MITGLIED:
                console.log("Neues Mitglied beigetreten!");
                GameMasterApp.getInstance().teilnehmerTable.addRow(
                    m.id.toString(),
                    { value: m.name },
                    { value: "10000", isTextbox: true, id: "chips_" + m.id.toString() },
                    { value: "0", isTextbox: true, id: "einsatz_" + m.id.toString() },
                    { value: "" },
                    { value: "" },
                    { value: "Kontrolle", isButton: true, click: () => {
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.CONTROLS_SELECTED,
                            member_id: m.id
                        });
                        console.log("Der Member hat die Kontrolle bekommen!");
                    }},
                    { value: "Update", isButton: true, click: () => {
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.UPDATE_MEMBER,
                            member_id: m.id,
                            chips: Number.parseInt((document.getElementById("chips_" + m.id.toString()) as HTMLInputElement).value),
                            einsatz: Number.parseInt((document.getElementById("einsatz_" + m.id.toString()) as HTMLInputElement).value)
                        });
                        console.log("Es wurde die Values geupdated von einem der Clients");
                    }},
                    { value: "Win", isButton: true, click: () => {
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.WON_GAME,
                            member_id: m.id
                        });
                        console.log("Jemand wurde zum Gewinner gekürt!");
                    }}
                );
                break;

            case ServerEvents.REMOVED_MITGLIED:
                GameMasterApp.getInstance().teilnehmerTable.deleteRowById(m.id.toString());
                break;
                
            case ServerEvents.UPDATED_MITGLIED_VALUES:
                (document.getElementById("chips_" + m.id) as HTMLInputElement).value =  m.chips.toString();
                (document.getElementById("einsatz_" + m.id) as HTMLInputElement).value =  m.einsatz.toString();
                //GameMasterApp.getInstance().teilnehmerTable.hideRowValue(m.id.toString(), "Kontrolle", !m.hasControls);

                if(m.status == MemberStatus.PLEITE) {
                    GameMasterApp.getInstance().teilnehmerTable.editRowValueByValue(m.id.toString(), "Kontrolle", "Pleite", true);
                }
                break;

            case ServerEvents.UPDATED_GAME_VALUES:
                console.log("Neuer Pot: " + m.pot);
                break;

            case ServerEvents.MEMBER_ISSUED_SCHAETZUNG:
                GameMasterApp.getInstance().teilnehmerTable.editRowValueByValue(m.id.toString(), "Schätzung", m.schaetzung);
                break;

            case ServerEvents.PLAYER_HAS_CONTROLS:
                GameMasterApp.getInstance().teilnehmerTable.highlightRowByValue(m.member_id.toString());
                break;

            case ServerEvents.GAME_MASTER_QUESTION:
                GameMasterApp.getInstance().teilnehmerTable.unhighlightRows();
                GameMasterApp.getInstance().fragenTable.clearRows();

                GameMasterApp.getInstance().fragenTable.addRow(
                    "Frage",
                    { value: "Frage" },
                    { value: m.question },
                    { value: "Aufdecken", isButton: true, click: () => { 
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.SHOW_HINWEIS,
                            phase: FragenPhase.FRAGE
                        });
                    }}
                );

                GameMasterApp.getInstance().fragenTable.addRow(
                    "Hinweis1",
                    { value: "Hinweis 1" },
                    { value: m.hinweis1 },
                    { value: "Aufdecken", isButton: true, click: () => { 
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.SHOW_HINWEIS,
                            phase: FragenPhase.RUNDE_1
                        });
                    }}
                );

                GameMasterApp.getInstance().fragenTable.addRow(
                    "Hinweis2",
                    { value: "Hinweis 2" },
                    { value: m.hinweis2 },
                    { value: "Aufdecken", isButton: true, click: () => { 
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.SHOW_HINWEIS,
                            phase: FragenPhase.RUNDE_2
                        });
                    }}
                );

                GameMasterApp.getInstance().fragenTable.addRow(
                    "Antwort",
                    { value: "Antwort" },
                    { value: m.answer },
                    { value: "Aufdecken", isButton: true, click: () => { 
                        GameMasterApp.getInstance().client.send({
                            type: ClientEvents.GAME_MASTER_ACTION,
                            action: GameMasterAction.SHOW_HINWEIS,
                            phase: FragenPhase.ANTWORT
                        });
                    }}
                );
                break;

            case ServerEvents.ROLES_SELECTED: 
                GameMasterApp.getInstance().clearRoles(),

                GameMasterApp.getInstance().teilnehmerTable.editRowValueByValue(m.small_blind.toString(), "Rolle", GameMasterApp.getInstance().getRole(PlayerRole.SMALL_BLIND));
                GameMasterApp.getInstance().teilnehmerTable.editRowValueByValue(m.big_blind.toString(), "Rolle", GameMasterApp.getInstance().getRole(PlayerRole.BIG_BLIND));
                break;
        }
    }
}