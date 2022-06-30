import WebSocketClient from "../connection/WebSocketClient";
import { ClientEvents } from "../../shared/enums/ClientEvents";
import { ServerEvents } from "../../shared/enums/ServerEvents";
import {
	FragenPhase,
	GamePhase,
	MemberStatus,
	ServerMessage,
} from "../../shared/message/ServerMessage";
import CustomHTMLTable, { HighlightColor } from "./CustomHTMLTable";
import { connect } from "http2";

export abstract class SharedApp {
	protected static readonly CHIP_PREFIX: string = "chips_";
	protected static readonly SCHAETZUNG_PREFIX: string = "schaetzung_";
	protected static readonly EINSATZ_PREFIX: string = "einsatz_";
	protected static readonly PLAYER_PREFIX: string = "player_";
	protected static readonly CAM_PREFIX: string = "cam_";

	protected static readonly PLAYER_TEMPLATE: string =
		"" +
		'<div id="' +
		this.PLAYER_PREFIX +
		'{{playerId}}" class="player">' +
		' <video id="' +
		this.CAM_PREFIX +
		'{{playerId}}" frameborder="0" autoplay="true" class="player-cam"></video>' +
		'     <div class="player-infos">' +
		'         <div id="' +
		this.CHIP_PREFIX +
		'{{playerId}}" class="chips">' +
		"             0" +
		"         </div>" +
		'         <div id="' +
		this.SCHAETZUNG_PREFIX +
		'{{playerId}}" class="schaetzung">' +
		"             Schätzung" +
		"         </div>" +
		'         <div id="' +
		this.EINSATZ_PREFIX +
		'{{playerId}}" class="einsatz">' +
		"             0" +
		"         </div>" +
		"     </div>" +
		"</div>";

	protected static readonly EMPTY_CAM_TEMPALTE: string =
		'<img id="' +
		this.CAM_PREFIX +
		'{{playerId}}" src="{{baseUrl}}/assets/emptyCam.png"></img>';

	protected fragenTable!: CustomHTMLTable;
	protected maxChips = 10000;
	protected pot = 0;
	protected lastControlled = 0;
	protected currentGameState: GamePhase = GamePhase.START;
	protected id = -1;

	protected instance!: SharedApp;
	protected client!: WebSocketClient;
	protected webRTCConnections!: [number, RTCPeerConnection][];
	protected deviceId!: string;

	public startApp(): void {
		this.declareVariables();
		this.registerListener();

		this.disableInputsAtBeginning();

		this.client = new WebSocketClient("ws://localhost:2222");

		this.client.recieve = (message: ServerMessage) => this.recieve(message);
	}

	public stopApp(): void {
		this.client.send({
			type: ClientEvents.MEMBER_LEAVT,
		});
	}

	protected declareVariables(): void {
		this.fragenTable = new CustomHTMLTable("fragen");
		this.fragenTable.addHeaders(
			{ name: "Phase", width: "col-sm-2" },
			{ name: "Wert" }
		);

		(
			document.getElementById("nachdenkmusik") as HTMLAudioElement
		).volume = 0.15;
		(document.getElementById("antwortmusik") as HTMLAudioElement).volume = 0.2;

		this.webRTCConnections = [];
	}

	protected abstract shouldProvideTrack(): boolean;

	protected registerListener(): void {}

	protected disableInputsAtBeginning(): void {}

	protected setPot(pot: number): void {
		this.pot = pot;

		document.getElementById("pot")!.innerText = this.pot.toString();
	}

	protected async recieve(m: ServerMessage): Promise<void> {
		console.log("Neue Nachricht vom Server");
		console.log(m);

		switch (m.type) {
			case ServerEvents.PING:
				console.log("Ping Event");
				this.client.send({ type: ClientEvents.PING_REPLAY, time: 0 });
				break;

			case ServerEvents.NEW_MITGLIED:
				if (document.getElementById(SharedApp.PLAYER_PREFIX + m.id) != null) {
					return;
				}

				console.log("Neues Mitglied beigetreten!");

				document.getElementById("teilnehmer")!.innerHTML +=
					SharedApp.PLAYER_TEMPLATE.replaceAll("{{playerId}}", m.id.toString());

				document.getElementById(
					SharedApp.CHIP_PREFIX + m.id.toString()
				)!.textContent = "10000";

				if (this.id != m.id) {
					const connection = this.createWebRtcConnection(m.id);
					this.webRTCConnections.push([m.id, connection]);

					const offer = await connection.createOffer({
						offerToReceiveVideo: true,
						offerToReceiveAudio: false,
						iceRestart: true,
					});
					await connection.setLocalDescription(offer);

					this.client.send({
						type: ClientEvents.WEBRTC_OFFER,
						source_member_id: this.id,
						target_member_id: m.id,
						offer: offer,
					});
				} else {
					(
						document.getElementById(
							SharedApp.CHIP_PREFIX + m.id.toString()
						) as HTMLVideoElement
					).srcObject = await navigator.mediaDevices.getUserMedia({
						video: { deviceId: this.deviceId },
					});
				}
				break;

			case ServerEvents.REMOVED_MITGLIED:
				console.log("Mitglied wurde entfernt!");

				if (this.currentGameState != GamePhase.START) {
					document
						.getElementById(SharedApp.PLAYER_PREFIX + m.id.toString())!
						.removeChild(
							document.getElementById(SharedApp.CAM_PREFIX + m.id.toString())!
						);

					document.getElementById(
						SharedApp.PLAYER_PREFIX + m.id.toString()
					)!.innerHTML += SharedApp.EMPTY_CAM_TEMPALTE.replace(
						"{{playerId}}",
						m.id.toString()
					).replace("{{baseUrl}}", document.baseURI);
				} else {
					document
						.getElementById(SharedApp.PLAYER_PREFIX + m.id.toString())!
						.remove();
				}
				break;

			case ServerEvents.UPDATED_MITGLIED_VALUES:
				if (m.chips == 0) {
					if (
						!document
							.getElementById(SharedApp.CHIP_PREFIX + m.id.toString())!
							.classList.contains(HighlightColor.FOLDED)
					) {
						document
							.getElementById(SharedApp.CHIP_PREFIX + m.id.toString())!
							.classList.add(HighlightColor.FOLDED);
					}
					document.getElementById(
						SharedApp.CHIP_PREFIX + m.id.toString()
					)!.innerText = "All-In";
				} else {
					if (
						document
							.getElementById(SharedApp.CHIP_PREFIX + m.id.toString())!
							.classList.contains(HighlightColor.FOLDED)
					) {
						document
							.getElementById(SharedApp.CHIP_PREFIX + m.id.toString())!
							.classList.remove(HighlightColor.FOLDED);
					}
					if (m.status == MemberStatus.PLEITE) {
						document.getElementById(
							SharedApp.CHIP_PREFIX + m.id.toString()
						)!.innerText = "0";
					} else {
						document.getElementById(
							SharedApp.CHIP_PREFIX + m.id.toString()
						)!.innerText = m.chips.toString();
					}
				}
				document.getElementById(
					SharedApp.EINSATZ_PREFIX + m.id.toString()
				)!.innerText = m.einsatz.toString();

				if (m.status == MemberStatus.PLEITE) {
					if (
						!document
							.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.id.toString())!
							.classList.contains(HighlightColor.FOLDED)
					) {
						document
							.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.id.toString())!
							.classList.add(HighlightColor.FOLDED);
					}
					document.getElementById(
						SharedApp.SCHAETZUNG_PREFIX + m.id.toString()
					)!.innerText = "Pleite";
				} else if (m.status == MemberStatus.FOLDED) {
					if (
						!document
							.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.id.toString())!
							.classList.contains(HighlightColor.FOLDED)
					) {
						document
							.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.id.toString())!
							.classList.add(HighlightColor.FOLDED);
					}
					document.getElementById(
						SharedApp.SCHAETZUNG_PREFIX + m.id.toString()
					)!.innerText = "Folded";
				} else {
					document
						.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.id.toString())!
						.classList.remove(HighlightColor.FOLDED);
				}

				break;

			case ServerEvents.UPDATED_GAME_VALUES:
				this.setPot(m.pot);
				break;

			case ServerEvents.NAECHSTE_PHASE:
				if (m.phase != FragenPhase.PAUSE) {
					this.fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.hinweis);
				} else {
					this.fragenTable.clearRows();
				}

				if (m.phase == FragenPhase.ANTWORT) {
					(
						document.getElementById("nachdenkmusik") as HTMLAudioElement
					).pause();
					(document.getElementById("antwortmusik") as HTMLAudioElement).play();
				}
				break;

			case ServerEvents.NAECHSTE_FRAGE:
				this.fragenTable.clearRows();
				this.fragenTable.addRow(m.phase, m.phase.replace("_", ""), m.frage);

				(document.getElementById("nachdenkmusik") as HTMLAudioElement).play();
				break;

			case ServerEvents.PLAYER_HAS_CONTROLS:
				if (m.member_id != 0) {
					document
						.getElementById(
							SharedApp.SCHAETZUNG_PREFIX + this.lastControlled.toString()
						)!
						.classList.remove(HighlightColor.SELECTED);
				}
				document
					.getElementById(SharedApp.SCHAETZUNG_PREFIX + m.member_id.toString())!
					.classList.add(HighlightColor.SELECTED);

				this.lastControlled = m.member_id;
				break;

			case ServerEvents.PLAYER_WON:
				(document.getElementById("antwortmusik") as HTMLAudioElement).pause();
				break;

			case ServerEvents.MEMBER_KICK:
				document
					.getElementById(SharedApp.PLAYER_PREFIX + m.id.toString())!
					.remove();
				break;

			case ServerEvents.WEBRTC_OFFER_RECIEVED:
				const newOfferConnection = this.webRTCConnections.find(
					(x) => x[0] == m.id
				);

				if (newOfferConnection == undefined) {
					return;
				}

				newOfferConnection[1].setRemoteDescription(
					new RTCSessionDescription(m.offer)
				);

				newOfferConnection[1].createAnswer().then((answer) => {
					newOfferConnection![1].setLocalDescription(answer).then(() => {
						this.client.send({
							type: ClientEvents.WEBRTC_ANSWER,
							answer: answer,
							source_member_id: this.id,
							target_member_id: m.id,
						});
					});
				});
				break;

			case ServerEvents.WEBRTC_ANSWER_RECIEVED:
				const webRTCConnection = this.webRTCConnections.find(
					(x) => x[0] == m.source_member_id
				)?.[1];
				const remoteDesc = new RTCSessionDescription(m.answer);

				if (webRTCConnection) {
					webRTCConnection
						.setRemoteDescription(remoteDesc)
						.then((x) => console.log(x));
				} else {
					console.log(
						"The connection for the client coulnd't be found. SOMETHIGN IS WRONG!"
					);
				}

				break;

			case ServerEvents.WEBRTC_NEW_CANDIDATE:
				const connectionForCandidate = this.webRTCConnections.find(
					(x) => x[0] == m.source_member_id
				)?.[1];

				try {
					console.log(m.candidate);

					if (m.candidate && connectionForCandidate) {
						await connectionForCandidate?.addIceCandidate(
							new RTCIceCandidate(m.candidate)
						);
						const channel = await connectionForCandidate.createDataChannel(
							"data"
						);
						channel.onopen = (event) => {
							channel.send("TEST");
						};
						channel.onerror = (event) => {
							console.log(event);
						};
					} else {
						throw new Error("The ice candidate is empty!");
					}
				} catch (error) {
					console.error("Error adding received ice candidate", error);
				}
				break;
		}
	}

	private createWebRtcConnection(id: number): RTCPeerConnection {
		console.log("Created Connection");
		const connection = new RTCPeerConnection({
			//iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});

		if (this.shouldProvideTrack()) {
			navigator.mediaDevices
				.getUserMedia({
					video: { deviceId: this.deviceId },
				})
				.then((stream) => {
					stream.getTracks().forEach(function (track) {
						console.log(track);
						connection.addTrack(track, stream);
					});
				});
		}

		connection.ontrack = async (event) => {
			console.log("NEW TRACK");
			console.log(event);
			const [remoteStream] = event.streams;
			(
				document.getElementById(
					SharedApp.CAM_PREFIX + id.toString()
				) as HTMLVideoElement
			).srcObject = remoteStream;
		};
		connection.addEventListener("icecandidate", (event) => {
			if (event.candidate) {
				this.client.send({
					type: ClientEvents.WEBRTC_CANDIDATE_AVAILABLE,
					candidate: event.candidate!,
					source_member_id: this.id,
					target_member_id: id,
				});
			}
		});

		connection.addEventListener("datachannel", (event) => {
			console.log(event);
		});

		connection.addEventListener("connectionstatechange", (event) => {
			console.log(event);
		});

		return connection;
	}
}
