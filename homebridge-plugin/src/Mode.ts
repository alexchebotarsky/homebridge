export type Mode = "AUTO" | "HEAT" | "COOL" | "OFF";

export function modeToNumber(mode: Mode): number {
  switch (mode) {
    case "AUTO":
      return 3;
    case "COOL":
      return 2;
    case "HEAT":
      return 1;
    case "OFF":
    default:
      return 0;
  }
}

export function numberToMode(num: number): Mode {
  switch (num) {
    case 3:
      return "AUTO";
    case 2:
      return "COOL";
    case 1:
      return "HEAT";
    case 0:
    default:
      return "OFF";
  }
}
