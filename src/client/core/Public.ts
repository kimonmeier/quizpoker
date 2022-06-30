import { ServerEvents } from "../../shared/enums/ServerEvents";
import { ServerMessage } from "../../shared/message/ServerMessage";
import { SharedApp } from "./Shared";

document.addEventListener("DOMContentLoaded", (event) => {
	App.getInstance().startApp();
});

window.onbeforeunload = (ev: Event) => {
	App.getInstance().stopApp();
};

export default class App extends SharedApp {
	private static instance: App;

	public static getInstance(): App {
		if (App.instance == undefined) {
			new App();
		}

		return App.instance;
	}

	private constructor() {
		super();
		App.instance = this;
	}

	protected override shouldProvideTrack(): boolean {
		return false;
	}

	protected override async recieve(m: ServerMessage): Promise<void> {
		super.recieve(m);

		switch (m.type) {
			case ServerEvents.MEMBER_ISSUED_SCHAETZUNG:
				document.getElementById(App.SCHAETZUNG_PREFIX + m.id)!.innerText =
					m.schaetzung.toString();
				break;
		}
	}
}
