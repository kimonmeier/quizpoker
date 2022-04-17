import { PlayerRole } from "../../shared/enums/PlayerRole";
import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import { MemberAction } from "../../shared/message/ClientMessage";
import { FragenPhase, GamePhase, MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import WebSocketClient from "../connection/WebSocketClient";
import CustomHTMLTable, { HighlightColor } from "./CustomHTMLTable";
import { GameType } from "@shared/enums/GameType";

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
    private static readonly CAM_PREFIX: string = "cam_";

    private static readonly PLAYER_TEMPLATE: string = ''
    + '<div id="' + this.PLAYER_PREFIX + '{{playerId}}" class="player">'
    + ' <iframe id="' + this.CAM_PREFIX + '" src="{{link}}" frameborder="0" allow="autoplay" class="player-cam"></iframe>'
    + '     <div class="player-infos">'
    + '         <div id="' + this.CHIP_PREFIX + '{{playerId}}" class="chips">'
    + '             0'
    + '         </div>'
    + '         <div id="' + this.SCHAETZUNG_PREFIX + '{{playerId}}" class="schaetzung">'
    + '             Schätzung'
    + '         </div>'
    + '         <div id="' + this.EINSATZ_PREFIX + '{{playerId}}" class="einsatz">'
    + '             0'
    + '         </div>'
    + '     </div>'
    + '</div>';

    private static readonly EMPTY_CAM_TEMPALTE: string = '<img id="' + this.CAM_PREFIX + '{{playerId}}" src="{{baseUrl}}/assets/emptyCam.png"></img>'

    private static instance: App;

    public static getInstance(): App {
        if(App.instance == undefined) {
            new App();
        }

        return App.instance;
    }

    private client!: WebSocketClient;

    private fragenTable!: CustomHTMLTable;
    private maxChips: number = 10000;
    private pot: number = 0;
    private lastControlled: number = 0;
    private currentGameState: GamePhase = GamePhase.START;

    private constructor() {
        App.instance = this;
    }

    public startApp(): void {
        this.declareVariables();

        this.client = new WebSocketClient("wss://gameshow.k-meier.ch");

        this.client.recieve = this.recieve;
    }

    public stopApp(): void {
        this.client.send({
            type: ClientEvents.MEMBER_LEAVT
        })
    }
    
    private declareVariables(): void {        
        this.fragenTable = new CustomHTMLTable("fragen");
        this.fragenTable.addHeaders(
            { name: "Phase", width: "col-sm-2"},
            { name: "Wert" }
        );

        (document.getElementById("nachdenkmusik") as HTMLAudioElement).volume = 0.15;
        (document.getElementById("antwortmusik") as HTMLAudioElement).volume = 0.2;
    }

    private setPot(pot: number): void{
        this.pot = pot;

        document.getElementById("pot")!.innerText = this.pot.toString();
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
            
                if(App.getInstance().currentGameState != GamePhase.START) {
                    return;
                }

                document.getElementById("teilnehmer")!.innerHTML += App.PLAYER_TEMPLATE.replaceAll("{{playerId}}", m.id.toString()).replaceAll("{{link}}", m.link); 

                document.getElementById(App.CHIP_PREFIX + m.id.toString())!.textContent = App.getInstance().maxChips.toString();
                break;

            case ServerEvents.REMOVED_MITGLIED:
                console.log("Mitglied wurde entfernt!");

                if(App.getInstance().currentGameState != GamePhase.START) {
                    document.getElementById(App.PLAYER_PREFIX + m.id.toString())!.removeChild(document.getElementById(App.CAM_PREFIX + m.id.toString())!)
                    
                    document.getElementById(App.PLAYER_PREFIX + m.id.toString())!.innerHTML += App.EMPTY_CAM_TEMPALTE.replace("{{playerId}}", m.id.toString()).replace("{{baseUrl}}", document.baseURI);
                } else {
                    document.getElementById(App.PLAYER_PREFIX + m.id.toString())!.remove();
                }
                break;
                
            case ServerEvents.UPDATED_MITGLIED_VALUES:
                if(m.chips == 0) {
                    if(!document.getElementById(App.CHIP_PREFIX + m.id.toString())!.classList.contains(HighlightColor.FOLDED)) {
                        document.getElementById(App.CHIP_PREFIX + m.id.toString())!.classList.add(HighlightColor.FOLDED);
                    }
                    document.getElementById(App.CHIP_PREFIX + m.id.toString())!.innerText = "All-In";
                } else {
                    if(document.getElementById(App.CHIP_PREFIX + m.id.toString())!.classList.contains(HighlightColor.FOLDED)) {
                        document.getElementById(App.CHIP_PREFIX + m.id.toString())!.classList.remove(HighlightColor.FOLDED);
                    }
                    if(m.status == MemberStatus.PLEITE) {
                        document.getElementById(App.CHIP_PREFIX + m.id.toString())!.innerText = "0";
                    } else {
                        document.getElementById(App.CHIP_PREFIX + m.id.toString())!.innerText = m.chips.toString();
                    }
                }
                document.getElementById(App.EINSATZ_PREFIX + m.id.toString())!.innerText = m.einsatz.toString();

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
                } else {
                    if(!document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.contains(HighlightColor.FOLDED)) {
                        document.getElementById(App.SCHAETZUNG_PREFIX + m.id.toString())!.classList.remove(HighlightColor.FOLDED);
                    }
                }

                break;

            case ServerEvents.UPDATED_GAME_VALUES:
                App.getInstance().setPot(m.pot);
                break;

            case ServerEvents.NAECHSTE_PHASE:
                if(m.phase != FragenPhase.PAUSE) {
                    App.getInstance().fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.hinweis);
                } else {
                    App.getInstance().fragenTable.clearRows();
                }

                if(m.phase == FragenPhase.ANTWORT) {
                    (document.getElementById("nachdenkmusik") as HTMLAudioElement).pause();
                    (document.getElementById("antwortmusik") as HTMLAudioElement).play();
                }
                break;

            case ServerEvents.PLAYER_HAS_CONTROLS:
                if(m.member_id != 0) {
                    document.getElementById(App.SCHAETZUNG_PREFIX + App.getInstance().lastControlled.toString())!.classList.remove(HighlightColor.SELECTED);
                }
                document.getElementById(App.SCHAETZUNG_PREFIX + m.member_id.toString())!.classList.add(HighlightColor.SELECTED);

                App.getInstance().lastControlled = m.member_id;
                break;

            case ServerEvents.NAECHSTE_FRAGE:                
                //TODO: App.getInstance().table.unhighlightRows();
                App.getInstance().fragenTable.clearRows();
                App.getInstance().fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.frage);

                (document.getElementById("nachdenkmusik") as HTMLAudioElement).play();
                break;

            case ServerEvents.PLAYER_WON:
                (document.getElementById("antwortmusik") as HTMLAudioElement).pause();
                break;

            case ServerEvents.MEMBER_ISSUED_SCHAETZUNG:
                (document.getElementById(App.SCHAETZUNG_PREFIX + m.id))!.innerText = m.schaetzung.toString(); 
                break;
        }
    }
}