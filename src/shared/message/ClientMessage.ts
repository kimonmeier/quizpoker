import { ClientEvents } from "@shared/enums/ClientEvents";
import { FragenPhase } from "./ServerMessage";

interface ConnectionSuccessEvent {
    type: ClientEvents.CONNECTION_SUCCESS;
    uuid: string;
}

interface MemberLoginEvent {
    type: ClientEvents.MEMBER_LOGIN,
    name: string,
    link: string
}

interface MemberLeftEvent {
    type: ClientEvents.MEMBER_LEAVT,
}

interface PingReplayEvent {
    type: ClientEvents.PING_REPLAY;
    time: number;
}

interface SchaetzungAbgegebenEvent {
    type: ClientEvents.SCHAETZUNG_ABGEBEN,
    id: number,
    schaetzung: number
}

interface MemberActionEvent {
    type: ClientEvents.MITGLIED_ACTION,
    action: MemberAction,
    value: number
}

interface GameMasterActionEvent {
    type: ClientEvents.GAME_MASTER_ACTION,
    action: GameMasterAction,
    member_id?: number,
    last_member?: number,
    phase?: FragenPhase,
    chips?: number,
    einsatz?: number;
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
    FOLD
}

export type ClientMessage = GameMasterActionEvent | MemberActionEvent | SchaetzungAbgegebenEvent | ConnectionSuccessEvent | MemberLoginEvent | MemberLeftEvent | PingReplayEvent;