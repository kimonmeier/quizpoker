import { ServerEvents } from "../../shared/enums/ServerEvents";
import { FragenPhase, GamePhase, MemberStatus, ServerMessage } from "../../shared/message/ServerMessage";
import { SharedApp } from "./Shared";
import { HighlightColor } from "./CustomHTMLTable";

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

    private constructor() {
        super();
        App.instance = this;
    }

    protected override recieve(m: ServerMessage): void {
        super.recieve(m);

        switch(m.type) {
            case ServerEvents.MEMBER_ISSUED_SCHAETZUNG:
                (document.getElementById(App.SCHAETZUNG_PREFIX + m.id))!.innerText = m.schaetzung.toString(); 
                break;
        }
    }
}