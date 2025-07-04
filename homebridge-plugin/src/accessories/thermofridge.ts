import type { CharacteristicValue, PlatformAccessory, Service } from "homebridge";

import { HomebridgePluginPlatform } from "../platform.js";
import { SingleFlightFetcher } from "../helpers/SingleFlightFetcher.js";
import { type Mode, modeToNumber, numberToMode } from "../types/Mode.js";
import { type OperatingState, operatingStateToNumber } from "../types/OperatingState.js";
import { PLUGIN_VERSION } from "../settings.js";

const API_ENDPOINT = "http://localhost:8001/api/v1";

type ThermofridgeTargetState = {
  mode: Mode;
  targetTemperature: number;
};

type ThermofridgeCurrentState = {
  operatingState: OperatingState;
  currentTemperature: number;
};

export class ThermofridgeAccessory {
  private service: Service;

  private targetStateFetcher: SingleFlightFetcher<ThermofridgeTargetState>;
  private currentStateFetcher: SingleFlightFetcher<ThermofridgeCurrentState>;

  constructor(private readonly platform: HomebridgePluginPlatform, private readonly accessory: PlatformAccessory) {
    const { name, manufacturer, model, serialNumber } = accessory.context.device;

    // Set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    // Get the Thermostat service, or create a new one if it doesn't exist
    this.service =
      this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    // Set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, name);

    // Required Characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getMode.bind(this))
      .onSet(this.setMode.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 0,
        maxValue: 30,
        minStep: 1,
      })
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getOperatingState.bind(this));

    // Optional Characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.targetStateFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/target-state/${serialNumber}`);
    this.currentStateFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/current-state/${serialNumber}`);
  }

  async getMode(): Promise<CharacteristicValue> {
    const state = await this.targetStateFetcher.fetch();

    return modeToNumber(state.mode);
  }

  async setMode(value: CharacteristicValue) {
    const mode = numberToMode(value as number);

    await fetch(`${API_ENDPOINT}/target-state/${this.accessory.context.device.serialNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode }),
    }).catch((err) => console.log(err));
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const state = await this.targetStateFetcher.fetch();

    return state.targetTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const targetTemperature = value as number;

    await fetch(`${API_ENDPOINT}/target-state/${this.accessory.context.device.serialNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTemperature: targetTemperature }),
    }).catch((err) => console.log(err));
  }

  async getOperatingState(): Promise<CharacteristicValue> {
    const currentState = await this.currentStateFetcher.fetch();

    return operatingStateToNumber(currentState.operatingState);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const currentState = await this.currentStateFetcher.fetch();

    return currentState.currentTemperature;
  }
}
