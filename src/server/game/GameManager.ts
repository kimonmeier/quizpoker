import Cache from "@server/core/Cache";
import Bet from "@shared/entities/Bet";
import { PlayerRole } from "@shared/enums/PlayerRole";
import { MemberStatus } from "@shared/message/ServerMessage";

export default class GameManager {

    private bets: Bet[] = [];
    private roles: RoleClass= { Small_Blind: 1, Big_Blind: 0 };

    public getBetValues(userId: number): number {
        var bettedChips = 0;

        this.bets.forEach((element) => {
            if(element.player_id == userId) {
                bettedChips += element.bet;
            }
        });

        return bettedChips;
    }

    public addBet(bet: Bet): void {
        this.bets.push(bet);
    }

    public getLastBet(): Bet {
        if(this.bets.length == 0) {
            return { bet: 0, player_id: 0 };
        } else {
            return this.bets[this.bets.length - 1];
        }
    }

    public clearBets(): void {
        this.bets = [];
    }

    public clearBetFromPlayer(id: number): void {
        this.bets = this.bets.filter(x => x.player_id != id);
    }

    public getRemainingChips(userId: number): number {
        return Cache.getInstance().getClientCacheById(userId)!.chips - this.getBetValues(userId);
    }

    public getPot(): number {
        var pot = 0;

        this.bets.forEach((element) => {
            pot += element.bet;  
        })

        return pot;
    }

    public flushChips(): void {
        Cache.getInstance().getAll().forEach(element => {
            element[1].chips = this.getRemainingChips(element[0]);

            Cache.getInstance().updateClient(element[0], element[1]);
        });
    }

    public getRole(memberId: number): PlayerRole {
        if(this.roles.Big_Blind == memberId) {
            return PlayerRole.BIG_BLIND;
        } else if (this.roles.Small_Blind == memberId) {
            return PlayerRole.SMALL_BLIND;
        } else {
            return PlayerRole.PLAYER;
        }
    }

    public initRoles(): void {
        const membersPlaying: number[] = [];

        Cache.getInstance().getAll().forEach((client) => {
            membersPlaying.push(client[0]);
        });

        this.roles.Big_Blind = membersPlaying[0];
        this.roles.Small_Blind = membersPlaying[1];
    }

    public forwardRoles(): void {
        const membersPlaying: number[] = [];

        Cache.getInstance().getAll().forEach((client) => {
            if(client[1].status != MemberStatus.PLEITE) {
                membersPlaying.push(client[0]);
            }
        });

        this.roles.Big_Blind = this.roles.Small_Blind;

        this.roles.Small_Blind = this.getNextPlayerById(this.roles.Big_Blind);
    }

    public getBigBlind(): number {
        return this.roles.Big_Blind;
    }

    public getSmallBlind(): number {
        return this.roles.Small_Blind
    }

    public getNextPlayer(): number {
        const lastPlayer = this.bets[this.bets.length - 1].player_id;

        return this.getNextPlayerById(lastPlayer);
    }

    private getNextPlayerById(lastPlayer: number): number {
        var nextPlayer: number | null = null;
        var currentId: number = lastPlayer + 1;

        do {
            if(Cache.getInstance().getHighestId() >= currentId) {
                currentId = 0;
            }

            if(Cache.getInstance().getClientCacheById(currentId) == null) {
                currentId += 1;
                continue;
            }

            if(Cache.getInstance().getClientCacheById(currentId)!.chips > 0) {
                nextPlayer = currentId;
            }

            currentId += 1;
        } while(nextPlayer == null);

        return nextPlayer;
    }

    public getChipsById(id: number): number {
        return Cache.getInstance().getClientCacheById(id)?.chips ?? 0;
    }
}

interface RoleClass {
    Big_Blind: number,
    Small_Blind: number
}