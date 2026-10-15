// shortcut: no coin wallet exists yet, so bail is never paid and this always
// returns false. Swap in the economy wallet when the Shops milestone lands.
export function payBail(_amount: number): boolean {
  return false;
}
