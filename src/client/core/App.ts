import { PlayerRole } from "../../shared/enums/PlayerRole";
import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import { MemberAction } from "../../shared/message/ClientMessage";
import { FragenPhase, MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import WebSocketClient from "../connection/WebSocketClient";
import CustomHTMLTable, { HighlightColor } from "./CustomHTMLTable";

const roundToNearest5 = (x: number) => Math.round(x/50)*50;

document.addEventListener("DOMContentLoaded", (event) => {
    App.getInstance().startApp();
}); 

window.onbeforeunload = (ev: Event) => {
    App.getInstance().stopApp();
}

export default class App {
    private static readonly CHIP_PREFIX: string = "chips_";
    private static readonly SCHAETZUNG_PREFIX: string = "schaetzung_";
    private static readonly EINSATZ_PREFIX: string = "einsatz_";
    private static readonly PLAYER_PREFIX: string = "player_";

    private static readonly PLAYER_TEMPLATE: string = ''
    + '<div id="' + this.PLAYER_PREFIX + '{{playerId}}" class="player">'
    + ' <iframe src="{{link}}" frameborder="0" allow="autoplay" class="player-cam"></iframe>'
    + '     <div class="player-infos">'
    + '         <div id="' + this.CHIP_PREFIX + '{{playerId}}" class="chips">'
    + '             0'
    + '         </div>'
    + '         <div id="' + this.SCHAETZUNG_PREFIX + '{{playerId}}" class="schaetzung">'
    + '             0'
    + '         </div>'
    + '         <div id="' + this.EINSATZ_PREFIX + '{{playerId}}" class="einsatz">'
    + '             0'
    + '         </div>'
    + '     </div>'
    + '</div>';

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

    private fragenTable!: CustomHTMLTable;
    private id: number = 0;
    private maxChips: number = 10000;
    private pot: number = 0;
    private isInControl: boolean = false;
    private status: MemberStatus = MemberStatus.ON;

    private constructor() {
        App.instance = this;
    }

    public startApp(): void {
        this.declareVariables();
        this.registerListener();

        this.disableInputs(true);
        this.disableSchaetzungen(true, false);

        this.client = new WebSocketClient("ws://localhost:2222");

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
        
        this.fragenTable = new CustomHTMLTable("fragen");
        this.fragenTable.addHeaders(
            { name: "Phase", width: "col-sm-2"},
            { name: "Wert" }
        );

        (document.getElementById("nachdenkmusik") as HTMLAudioElement).volume = 0.3;
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
            const text = (document.getElementById("name")! as HTMLInputElement).value;
            const link = (document.getElementById("url")! as HTMLInputElement).value;

            this.client.send({ 
                type: ClientEvents.MEMBER_LOGIN,
                name: text,
                link: link
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
        App.getInstance().raiseRangeInput.min = (lastBet + 50).toString();
        App.getInstance().raiseTextInput.value = (lastBet + 50).toString();
    }

    private setPot(pot: number): void{
        this.pot = pot;

        document.getElementById("pot")!.innerText = this.pot.toString();
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

    private recieve(m: ServerMessage): void {
        console.log("Neue Nachricht vom Server");
        console.log(m);

        switch(m.type) {
            case ServerEvents.PING:
                console.log("Ping Event");
                App.getInstance().client.send({type: ClientEvents.PING_REPLAY, time: 0})
                break;
                
            case ServerEvents.NEW_MITGLIED:
                if(document.getElementById(App.PLAYER_PREFIX + m.id) != null) {
                    return;
                }

                console.log("Neues Mitglied beigetreten!");
                
                document.getElementById("teilnehmer")!.innerHTML += App.PLAYER_TEMPLATE.replaceAll("{{playerId}}", m.id.toString()).replaceAll("{{link}}", m.link); 

                document.getElementById(App.CHIP_PREFIX + m.id.toString())!.textContent = "10000";
                break;

            case ServerEvents.REMOVED_MITGLIED:
                console.log("Mitglied wurde entfernt!");
                document.getElementById(App.PLAYER_PREFIX + m.id.toString())!.remove();
                break;
                
            case ServerEvents.UPDATED_MITGLIED_VALUES:
                if(m.id == App.getInstance().id) {
                    App.getInstance().setMaxChips(m.chips + m.einsatz);
                    App.getInstance().status = m.status;
                    App.getInstance().setHasControls(m.hasControls, 0);
                }

                document.getElementById(App.CHIP_PREFIX + m.id.toString())!.innerText = m.chips.toString();
                document.getElementById(App.EINSATZ_PREFIX + m.id.toString())!.innerText = m.einsatz.toString();

                if(!m.hasControls || m.status == MemberStatus.FOLDED) {
                    //TODO: App.getInstance().table.unhighlightRowByValue(m.id.toString());
                }

                if(m.status == MemberStatus.PLEITE) {
                    if(!document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.contains(HighlightColor.FOLDED)) {
                        document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.add(HighlightColor.FOLDED);
                    }
                    document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.innerText = "Pleite";

                } else if(m.status == MemberStatus.FOLDED) {
                    if(!document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.contains(HighlightColor.FOLDED)) {
                        document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.add(HighlightColor.FOLDED);
                    }
                    document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.innerText = "Folded";
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
                }
                break;

            case ServerEvents.NAECHSTE_FRAGE:
                if(App.getInstance().status == MemberStatus.PLEITE) {
                    App.getInstance().disableSchaetzungen(true, true);
                } else {
                    App.getInstance().disableSchaetzungen(false, true);
                }
                
                //TODO: App.getInstance().table.unhighlightRows();
                App.getInstance().fragenTable.clearRows();
                App.getInstance().fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.frage);

                (document.getElementById("nachdenkmusik") as HTMLAudioElement).play();
                break;
            
            case ServerEvents.PLAYER_HAS_CONTROLS:
                App.getInstance().setHasControls(m.member_id == App.getInstance().id, m.minimumBet);
                //TODO: App.getInstance().table.highlightRowByValue(m.member_id.toString(), HighlightColor.SELECTED);

            case ServerEvents.GAME_STARTED:
                App.getInstance().visibleControls();
                break;

            case ServerEvents.PLAYER_WON:
                (document.getElementById("nachdenkmusik") as HTMLAudioElement).pause();
                break;
        }
    }
}