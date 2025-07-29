import { AccessoryType } from "../accessories.js";

// This is a generic device type that can be extended if a device has specific
// properties. Otherwise, use the Device type and it will fallback to this.
type GenericDevice = {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  accessoryType: AccessoryType;
};

export type ThermostatDevice = GenericDevice & {
  accessoryType: AccessoryType.Thermostat;
  showHumidity: boolean;
};

export type Device = GenericDevice | ThermostatDevice;
