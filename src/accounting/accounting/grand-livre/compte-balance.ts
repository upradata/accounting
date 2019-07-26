import { BalanceMap } from '../balance/balance-map';

export type CompteKey = string;
// export type MouvementsByCompte = SortedMap<CompteKey, SortedArray<Mouvement>>;
export type CompteBalance = BalanceMap<CompteKey>;
