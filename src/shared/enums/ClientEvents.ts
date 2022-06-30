/// These Events are executed on the Client
export enum ClientEvents {
	/// On this Event the Client is connected to the Server and got an UUID
	CONNECTION_SUCCESS,

	MEMBER_LOGIN,

	MEMBER_LEAVT,

	PING_REPLAY,

	SCHAETZUNG_ABGEBEN,

	MITGLIED_ACTION,

	GAME_MASTER_ACTION,

	WEBRTC_OFFER,

	WEBRTC_ANSWER,

	WEBRTC_CANDIDATE_AVAILABLE,
}
