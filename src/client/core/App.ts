import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import { MemberAction } from "../../shared/message/ClientMessage";
import { MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import { SharedApp } from "./Shared";

const roundToNearest5 = (x: number) => Math.round(x/50)*50;

document.addEventListener("DOMContentLoaded", (event) => {
    App.getInstance().startApp();
}); 

window.onbeforeunload = (ev: Event) => {
    App.getInstance().stopApp();
}

export default class App extends SharedApp {
    private static instance: App;

    public static getInstance(): App {
        if(App.instance == undefined) {
            new App();
        }

        return App.instance;
    }

    private schaetzungTextInput!: HTMLInputElement;
    private raiseTextInput!: HTMLInputElement;
    private raiseRangeInput!: HTMLInputElement;

    private isInControl: boolean = false;
    private memberStatus: MemberStatus = MemberStatus.ON;

    private constructor() {
        super();
        App.instance = this;
    }

    protected override registerListener(): void {
        this.raiseRangeInput.oninput = (e: Event) => this.raiseTextInput.value = this.raiseRangeInput.value;

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

    protected override disableInputsAtBeginning(): void {
        this.disableInputs(true, false);
        this.disableSchaetzungen(true, false);
    }
    
    protected override declareVariables(): void {
        super.declareVariables();

        this.raiseTextInput = document.getElementById("raisetext") as HTMLInputElement;
        this.raiseRangeInput = document.getElementById("raiserange") as HTMLInputElement;
        this.schaetzungTextInput = document.getElementById("schaetzungText") as HTMLInputElement;
    }

    private disableSchaetzungen(locked: boolean, visible: boolean): void {
        document.getElementById("schaetzung")!.hidden = !visible;
        if(locked) {
            $("#schaetzung").find("button, input").attr("disabled", "disabled");
        } else {
            $("#schaetzung").find("button, input").removeAttr("disabled");
        }
    }

    private disableInputs(locked: boolean, allIn: boolean): void {
        if(locked) {
            $("#game-controls").find("button, input").attr("disabled", "disabled");
        } else {
            $("#game-controls").find("button, input").removeAttr("disabled");

            if(allIn) {
                $("#btnRaise").attr("disabled", "disabled");
            }
        }
    }

    private setId(id: number): void {
        this.id = id;

        document.getElementById("btnLogin")!.hidden = true;

        document.getElementById("loginAlert")!.hidden = false;
    }

    private visibleControls(): void {
        document.getElementById("login")!.hidden = true;
        document.getElementById("play")!.hidden = false;
    }

    private setLastBet(lastBet: number): void {
        this.raiseRangeInput.min = (lastBet + 50).toString();
        this.raiseTextInput.value = (lastBet + 50).toString();
    }

    private setMaxChips(maxChips: number): void {
        this.maxChips = maxChips;

        this.raiseRangeInput.max = maxChips.toString();
    }

    private setHasControls(setHasControls: boolean, minimumBet: number): void {
        this.isInControl = setHasControls;

        if(this.isInControl) {
            this.setLastBet(minimumBet);
        }

        this.disableInputs(!this.isInControl, minimumBet >= this.maxChips);

        
        if(minimumBet >= this.maxChips) {
            document.getElementById("btnCall")!.innerText = "All-In";
        } else {
            document.getElementById("btnCall")!.innerText = "Call";
        }

    }

    protected override recieve(m: ServerMessage): void {
        super.recieve(m);

        switch(m.type) {
            case ServerEvents.UPDATED_MITGLIED_VALUES:
                if(m.id == App.getInstance().id) {
                    this.setMaxChips(m.chips + m.einsatz);
                    this.memberStatus = m.status;
                    this.setHasControls(m.hasControls, 0);
                }
                break;

            case ServerEvents.MITGLIED_SUCCESSFULL_LOGIN:
                App.getInstance().setId(m.id);
                break;

            case ServerEvents.NAECHSTE_FRAGE:
                if(App.getInstance().memberStatus == MemberStatus.PLEITE) {
                    App.getInstance().disableSchaetzungen(true, true);
                } else {
                    App.getInstance().disableSchaetzungen(false, true);
                }

                break;
            
            case ServerEvents.PLAYER_HAS_CONTROLS:
                App.getInstance().setHasControls(m.member_id == App.getInstance().id, m.minimumBet);

            case ServerEvents.GAME_STARTED:
                App.getInstance().visibleControls();
                break;

            case ServerEvents.PLAYER_WON:
                (document.getElementById("antwortmusik") as HTMLAudioElement).pause();
                break;

            case ServerEvents.SHOW_SCHAETZUNG:
                (document.getElementById(App.SCHAETZUNG_PREFIX + m.id))!.innerText = m.schaetzung.toString();
                break;
        }
    }
}