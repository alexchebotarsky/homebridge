import type { CharacteristicValue, PlatformAccessory, Service } from "homebridge";
import type { Device, ThermostatDevice } from "../types/Device.js";

import { HomebridgePluginPlatform } from "../platform.js";
import { SingleFlightFetcher } from "../helpers/SingleFlightFetcher.js";
import { type Mode, modeToNumber, numberToMode } from "../types/Mode.js";
import { type OperatingState, operatingStateToNumber } from "../types/OperatingState.js";
import { PLUGIN_VERSION } from "../settings.js";

const API_ENDPOINT = "http://localhost:8000/api/v1";

type ThermostatTargetState = {
  mode: Mode;
  targetTemperature: number;
};

type ThermostatCurrentState = {
  operatingState: OperatingState;
  currentTemperature: number;
  currentHumidity?: number; // Not all thermostats may provide humidity
};

export class ThermostatAccessory {
  private service: Service;

  private readonly name: string;
  private readonly deviceId: string;

  private targetStateFetcher: SingleFlightFetcher<ThermostatTargetState>;
  private currentStateFetcher: SingleFlightFetcher<ThermostatCurrentState>;

  constructor(private readonly platform: HomebridgePluginPlatform, private readonly accessory: PlatformAccessory) {
    const { name, deviceId, manufacturer, model, serialNumber, minTemperature, maxTemperature, showHumidity } =
      accessory.context.device as ThermostatDevice;

    this.name = name;
    this.deviceId = deviceId;

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
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);

    // Required Characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getMode.bind(this))
      .onSet(this.setMode.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
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

    if (showHumidity) {
      this.service
        .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.getCurrentHumidity.bind(this));
    }

    this.targetStateFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/target-state/${this.deviceId}`);
    this.currentStateFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/current-state/${this.deviceId}`);
  }

  async getMode(): Promise<CharacteristicValue> {
    const state = await this.targetStateFetcher.fetch();

    return modeToNumber(state.mode);
  }

  async setMode(value: CharacteristicValue) {
    const mode = numberToMode(value as number);

    await fetch(`${API_ENDPOINT}/target-state/${this.deviceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode }),
    }).catch((err) => {
      this.platform.log.error(`Error posting mode for device '${this.deviceId}': ${err}`);
    });
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const state = await this.targetStateFetcher.fetch();

    return state.targetTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const targetTemperature = value as number;

    await fetch(`${API_ENDPOINT}/target-state/${this.deviceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTemperature: targetTemperature }),
    }).catch((err) => {
      this.platform.log.error(`Error posting target temperature for device '${this.deviceId}': ${err}`);
    });
  }

  async getOperatingState(): Promise<CharacteristicValue> {
    const state = await this.currentStateFetcher.fetch();

    if (state.operatingState === undefined) {
      this.platform.log.warn(`Operating state for device '${this.deviceId}' is undefined`);
      return operatingStateToNumber("IDLE");
    }

    return operatingStateToNumber(state.operatingState);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const state = await this.currentStateFetcher.fetch();

    if (state.currentTemperature === undefined) {
      this.platform.log.warn(`Current temperature for device '${this.deviceId}' is undefined`);
      return 0;
    }

    return state.currentTemperature;
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    const state = await this.currentStateFetcher.fetch();

    if (state.currentHumidity === undefined) {
      this.platform.log.warn(`Current humidity for device '${this.deviceId}' is undefined`);
      return 0;
    }

    return state.currentHumidity;
  }
}
