import { HeatpumpAccessory } from "./accessories/heatpump.js";
import { ThermofridgeAccessory } from "./accessories/thermofridge.js";

export enum AccessoryType {
  Heatpump = "heatpump",
  Thermofridge = "thermofridge",
}

export const AccessoryMap = {
  [AccessoryType.Heatpump]: HeatpumpAccessory,
  [AccessoryType.Thermofridge]: ThermofridgeAccessory,
};
