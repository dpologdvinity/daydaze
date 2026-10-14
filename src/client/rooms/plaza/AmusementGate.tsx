import { Arch } from "../shared/Arch.tsx";

/** The carnival arch on the Plaza curb that leads to the Amusement Park. */
export function AmusementGate({ at }: { at: readonly [number, number] }) {
  return (
    <Arch
      sign="AMUSEMENT PARK"
      position={[at[0], 0, at[1]]}
      color="#3fe0d0"
      accent="#ff2f9a"
    />
  );
}
