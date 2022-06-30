import { ClientEvents } from "@shared/enums/ClientEvents";
import { FragenPhase } from "./ServerMessage";

interface ConnectionSuccessEvent {
	type: ClientEvents.CONNECTION_SUCCESS;
	uuid: string;
}

interface MemberLoginEvent {
	type: ClientEvents.MEMBER_LOGIN;
	name: string;
}

interface MemberLeftEvent {
	type: ClientEvents.MEMBER_LEAVT;
}

interface PingReplayEvent {
	type: ClientEvents.PING_REPLAY;
	time: number;
}

interface SchaetzungAbgegebenEvent {
	type: ClientEvents.SCHAETZUNG_ABGEBEN;
	id: number;
	schaetzung: number;
}

interface MemberActionEvent {
	type: ClientEvents.MITGLIED_ACTION;
	action: MemberAction;
	value: number;
}

interface GameMasterActionEvent {
	type: ClientEvents.GAME_MASTER_ACTION;
	action: GameMasterAction;
	member_id?: number;
	last_member?: number;
	phase?: FragenPhase;
	chips?: number;
	einsatz?: number;
}

interface WebRTCOfferEvent {
	type: ClientEvents.WEBRTC_OFFER;
	offer: RTCSessionDescriptionInit;
	source_member_id: number;
	target_member_id: number;
}

interface WebRTCAnswerEvent {
	type: ClientEvents.WEBRTC_ANSWER;
	answer: RTCSessionDescriptionInit;
	source_member_id: number;
	target_member_id: number;
}

interface WebRtcCandidateReadyEvent {
	type: ClientEvents.WEBRTC_CANDIDATE_AVAILABLE;
	source_member_id: number;
	target_member_id: number;
	candidate: RTCIceCandidate;
}

export enum GameMasterAction {
	CONTROLS_SELECTED,
	NEXT_QUESTION,
	SHOW_HINWEIS,
	START_GAME,
	WON_GAME,
	UPDATE_MEMBER,
	SHOW_SCHAETZUNG,
}

export enum MemberAction {
	CALL,
	RAISE,
	FOLD,
}

export type ClientMessage =
	| GameMasterActionEvent
	| MemberActionEvent
	| SchaetzungAbgegebenEvent
	| ConnectionSuccessEvent
	| MemberLoginEvent
	| MemberLeftEvent
	| PingReplayEvent
	| WebRTCOfferEvent
	| WebRTCAnswerEvent
	| WebRtcCandidateReadyEvent;
