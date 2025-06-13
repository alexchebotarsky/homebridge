export type OperatingState = "HEATING" | "COOLING" | "IDLE";

export function operatingStateToNumber(mode: OperatingState): number {
  switch (mode) {
    case "COOLING":
      return 2;
    case "HEATING":
      return 1;
    case "IDLE":
    default:
      return 0;
  }
}

export function numberToOperatingState(num: number): OperatingState {
  switch (num) {
    case 2:
      return "COOLING";
    case 1:
      return "HEATING";
    case 0:
    default:
      return "IDLE";
  }
}
