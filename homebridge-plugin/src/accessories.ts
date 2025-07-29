import { ThermostatAccessory } from "./accessories/thermostat.js";

export enum AccessoryType {
  Thermostat = "thermostat",
}

export const AccessoryMap = {
  [AccessoryType.Thermostat]: ThermostatAccessory,
};
