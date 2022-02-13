import { PlayerRole } from "../../shared/enums/PlayerRole";
import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import { MemberAction } from "../../shared/message/ClientMessage";
import { FragenPhase, MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import WebSocketClient from "../connection/WebSocketClient";
import CustomHTMLTable from "./CustomHTMLTable";

const roundToNearest5 = (x: number) => Math.round(x/50)*50;

document.addEventListener("DOMContentLoaded", (event) => {
    App.getInstance().startApp();
}); 

window.onbeforeunload = (ev: Event) => {
    App.getInstance().stopApp();
}

export default class App {
    private static instance: App;

    public static getInstance(): App {
        if(App.instance == undefined) {
            new App();
        }

        return App.instance;
    }

    private client!: WebSocketClient;

    private schaetzungTextInput!: HTMLInputElement;
    private raiseTextInput!: HTMLInputElement;
    private raiseRangeInput!: HTMLInputElement;

    private table!: CustomHTMLTable;
    private fragenTable!: CustomHTMLTable;
    private id: number = 0;
    private maxChips: number = 10000;
    private pot: number = 0;
    private isInControl: boolean = false;
    private lastBet: number = 0;
    private status: MemberStatus = MemberStatus.ON;

    private constructor() {
        App.instance = this;
    }

    public startApp(): void {
        this.declareVariables();
        this.registerListener();

        this.disableInputs(true);
        this.disableSchaetzungen(true, false);

        this.client = new WebSocketClient("ws://gameshow.k-meier.ch:2222");

        this.client.recieve = this.recieve;
    }

    public stopApp(): void {
        this.client.send({
            type: ClientEvents.MEMBER_LEAVT
        })
    }
    
    private declareVariables(): void {
        this.raiseTextInput = document.getElementById("raisetext") as HTMLInputElement;
        this.raiseRangeInput = document.getElementById("raiserange") as HTMLInputElement;
        this.schaetzungTextInput = document.getElementById("schaetzungText") as HTMLInputElement;

        this.table = new CustomHTMLTable("teilnehmer");
        this.table.addHeaders(
            { name: "Name"},
            { name: "Chips" },
            { name: "Einsatz" },
            { name: "Rolle", width: "col-sm-1" }
        );
        
        this.fragenTable = new CustomHTMLTable("fragen");
        this.fragenTable.addHeaders(
            { name: "Phase", width: "col-sm-2"},
            { name: "Wert" }
        );
    }

    private registerListener(): void {        
        this.raiseRangeInput.oninput = (e: Event) => {
            this.raiseTextInput.value = this.raiseRangeInput.value;
        };

        this.raiseTextInput.oninput = (e: Event) => {
            let currentNumber: number = Number.parseInt(this.raiseTextInput.value); 
            if(this.raiseTextInput.value.length == 0) {
                currentNumber = 0;
            } else if(Number.isNaN(+this.raiseTextInput.value)) {
                this.raiseTextInput.value = this.raiseRangeInput.value;
                return;
            }
            
            if(this.raiseTextInput.value.length == 0) {
                currentNumber = 0;
            } else if(this.raiseTextInput.value.length > 2) {
                currentNumber = roundToNearest5(currentNumber);
            } 
            if(currentNumber >= this.maxChips) {
               currentNumber = this.maxChips;
            }   

            this.raiseRangeInput.value = currentNumber.toString();
            this.raiseTextInput.value = currentNumber.toString();
        }

        this.schaetzungTextInput.oninput = (e: Event) => {
            let currentNumber: number = Number.parseInt(this.schaetzungTextInput.value); 

            if(Number.isNaN(currentNumber)) {
                currentNumber = 0;
            }

            this.schaetzungTextInput.value = currentNumber.toString();
        }

        document.getElementById("btnLogin")!.onclick = (event) => {
            var text = (document.getElementById("name")! as HTMLInputElement).value;
            
            this.client.send({ 
                type: ClientEvents.MEMBER_LOGIN,
                name: text
            });
        };

        document.getElementById("btnSubmitSchaetzung")!.onclick = (event) => {
            this.disableSchaetzungen(true, true);
            
            var text = App.getInstance().schaetzungTextInput.value;

            this.client.send({
                type: ClientEvents.SCHAETZUNG_ABGEBEN,
                id: App.getInstance().id,
                schaetzung: Number.parseInt(text)
            });
        }

        document.getElementById("btnRaise")!.onclick = (event) => {
            this.client.send({
                type: ClientEvents.MITGLIED_ACTION,
                action: MemberAction.RAISE,
                value: Number.parseInt(this.raiseTextInput.value)
            })
        }

        
        document.getElementById("btnCall")!.onclick = (event) => {
            this.client.send({
                type: ClientEvents.MITGLIED_ACTION,
                action: MemberAction.CALL,
                value: 0
            })
        }

        
        document.getElementById("btnFold")!.onclick = (event) => {
            this.client.send({
                type: ClientEvents.MITGLIED_ACTION,
                action: MemberAction.FOLD,
                value: 0
            })
        }
    }

    private disableSchaetzungen(locked: boolean, visible: boolean): void {
        document.getElementById("schaetzung")!.hidden = !visible;
        if(locked) {
            $("#schaetzung").find("button, input").attr("disabled", "disabled");
        } else {
            $("#schaetzung").find("button, input").removeAttr("disabled");
        }
    }

    private disableInputs(locked: boolean): void {
        if(locked) {
            $("#game-controls").find("button, input").attr("disabled", "disabled");
        } else {
            $("#game-controls").find("button, input").removeAttr("disabled");
        }
    }

    private setId(id: number): void {
        App.getInstance().id = id;

        document.getElementById("btnLogin")!.hidden = true;

        document.getElementById("loginAlert")!.hidden = false;
    }

    private visibleControls(): void {
        document.getElementById("login")!.hidden = true;
        document.getElementById("play")!.hidden = false;
    }

    private setLastBet(lastBet: number): void {
        App.getInstance().lastBet = lastBet; 

        App.getInstance().raiseRangeInput.min = (lastBet + 50).toString();
        App.getInstance().raiseTextInput.value = (lastBet + 50).toString();
    }

    private setPot(pot: number): void{
        this.pot = pot;
    }

    private setMaxChips(maxChips: number): void {
        this.maxChips = maxChips;

        this.raiseRangeInput.max = maxChips.toString();
    }

    private setHasControls(setHasControls: boolean, minimumBet: number): void {
        App.getInstance().isInControl = setHasControls;

        if(App.getInstance().isInControl) {
            App.getInstance().setLastBet(minimumBet);
        }

        App.getInstance().disableInputs(!App.getInstance().isInControl);
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
            if(App.getInstance().table.getRow(i) == undefined) {
                break;
            }

            App.getInstance().table.editRowValueByIdx(i, "Rolle", "");
        }
    }

    private recieve(m: ServerMessage): void {
        console.log("Neue Nachricht vom Server");
        console.log(m);        

        switch(m.type) {
            case ServerEvents.PING:
                console.log("Ping Event");
                App.getInstance().client.send({type: ClientEvents.PING_REPLAY, time: 0})
                break;
                
            case ServerEvents.NEW_MITGLIED:
                if(App.getInstance().table.getRowByValue(m.id.toString()) != null) {
                    return;
                }

                console.log("Neues Mitglied beigetreten!");
                App.getInstance().table.addRow(m.id.toString(), m.name, "10000", "0", App.getInstance().getRole(PlayerRole.PLAYER));
                break;

            case ServerEvents.REMOVED_MITGLIED:
                console.log("Mitglied wurde entfernt!");
                App.getInstance().table.deleteRowById(m.id.toString());
                break;
                
            case ServerEvents.UPDATED_MITGLIED_VALUES:
                if(m.id == App.getInstance().id) {
                    App.getInstance().setMaxChips(m.chips);
                    App.getInstance().status = m.status;
                    App.getInstance().setHasControls(m.hasControls, 0);
                }

                App.getInstance().table.editRowValueByValue(m.id.toString(), "Chips", m.chips.toString());
                App.getInstance().table.editRowValueByValue(m.id.toString(), "Einsatz", m.einsatz.toString())

                if(m.status == MemberStatus.PLEITE) {
                    App.getInstance().table.editRowValueByValue(m.id.toString(), "Chips", "Pleite");
                    App.getInstance().table.editRowValueByValue(m.id.toString(), "Einsatz", "");
                }

                break;

            case ServerEvents.UPDATED_GAME_VALUES:
                App.getInstance().setPot(m.pot);
                break;

            case ServerEvents.MITGLIED_SUCCESSFULL_LOGIN:
                App.getInstance().setId(m.id);
                break;

            case ServerEvents.NAECHSTE_PHASE:
                if(m.phase != FragenPhase.PAUSE) {
                    App.getInstance().fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.hinweis);
                } else {
                    App.getInstance().fragenTable.clearRows();
                    App.getInstance().clearRoles();
                }
                break;

            case ServerEvents.NAECHSTE_FRAGE:
                if(App.getInstance().status == MemberStatus.PLEITE) {
                    App.getInstance().disableSchaetzungen(true, true);
                } else {
                    App.getInstance().disableSchaetzungen(false, true);
                }
                
                App.getInstance().table.unhighlightRows();
                App.getInstance().fragenTable.clearRows();
                App.getInstance().fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.frage);
                break;
            
            case ServerEvents.PLAYER_HAS_CONTROLS:
                App.getInstance().setHasControls(m.member_id == App.getInstance().id, m.minimumBet);
                App.getInstance().table.highlightRowByValue(m.member_id.toString());
                // TODO: Player farbig markieren!

            case ServerEvents.GAME_STARTED:
                App.getInstance().visibleControls();
                break;

            case ServerEvents.ROLES_SELECTED:
                App.getInstance().clearRoles();

                App.getInstance().table.editRowValueByValue(m.small_blind.toString(), "Rolle", App.getInstance().getRole(PlayerRole.SMALL_BLIND));
                App.getInstance().table.editRowValueByValue(m.big_blind.toString(), "Rolle", App.getInstance().getRole(PlayerRole.BIG_BLIND));
                break;
        }
    }
}