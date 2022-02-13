import { PlayerRole } from "@shared/enums/PlayerRole";
import { ServerEvents } from "@shared/enums/ServerEvents";

interface PingServerEvent {
    type: ServerEvents.PING;
    ms: number;
}

interface NewMemberEvent {
    type: ServerEvents.NEW_MITGLIED;
    name: string;
    id: number;
}

interface MemberSelectedEvent {
    type: ServerEvents.MITGLIED_SELECTED,
    id: number
}

interface RemoveMemberEvent {
    type: ServerEvents.REMOVED_MITGLIED,
    id:number
}

interface MemberUpdateValuesEvent {
    type: ServerEvents.UPDATED_MITGLIED_VALUES,
    id: number,
    chips: number,
    einsatz: number,
    hasControls: boolean,
    status: MemberStatus
}

interface GameUpdatedValuesEvent {
    type: ServerEvents.UPDATED_GAME_VALUES,
    pot: number,
    phase: GamePhase
}

interface NextQuestionEvent {
    type: ServerEvents.NAECHSTE_FRAGE,
    phase: FragenPhase.FRAGE
    frage: string,
    einheit: string
}

interface NextPhaseEvent {
    type: ServerEvents.NAECHSTE_PHASE
    phase: FragenPhase,
    hinweis: string
}
interface SuccesFullLoginEvent {
    type: ServerEvents.MITGLIED_SUCCESSFULL_LOGIN,
    id: number;
}

interface GameStartedEvent {
    type: ServerEvents.GAME_STARTED
}

interface GameMasterQuestionEvent {
    type: ServerEvents.GAME_MASTER_QUESTION,
    question: string,
    hinweis1: string,
    hinweis2: string,
    answer: string,
    einheit: string
}

interface MemberIssuedSchaetzungEvent {
    type: ServerEvents.MEMBER_ISSUED_SCHAETZUNG,
    id: number,
    schaetzung: string,
}

interface PlayerControlEvent {
    type: ServerEvents.PLAYER_HAS_CONTROLS,
    member_id: number,
    minimumBet: number;
}

interface PlayerRolesSelectedEvent {
    type: ServerEvents.ROLES_SELECTED,
    small_blind: number,
    big_blind: number;
}

export enum FragenPhase {
    FRAGE = "Frage",
    RUNDE_1 = "Hinweis_1",
    RUNDE_2 = "Hinweis_2",
    ANTWORT = "Antwort",
    PAUSE = "Pause"
}

enum GamePhase {
    ROUND,
    PAUSE
}

export enum MemberStatus {
    ON,
    FOLDED,
    PLEITE
}


export type ServerMessage = PlayerControlEvent | MemberIssuedSchaetzungEvent | GameMasterQuestionEvent | GameStartedEvent | PingServerEvent | NewMemberEvent | MemberSelectedEvent | RemoveMemberEvent | MemberUpdateValuesEvent | GameUpdatedValuesEvent | NextQuestionEvent | NextPhaseEvent | SuccesFullLoginEvent | PlayerRolesSelectedEvent;