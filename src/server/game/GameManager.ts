import Cache from "@server/core/Cache";
import Bet from "@shared/entities/Bet";

export default class GameManager {

    private bets: Bet[] = [];

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
}