import type { CharacteristicValue, PlatformAccessory, Service } from "homebridge";

import { HomebridgePluginPlatform } from "./platform.js";
import { SingleFlightFetcher } from "./SingleFlightFetcher.js";
import { PLUGIN_VERSION } from "./settings.js";

const API_ENDPOINT = "http://localhost:8000/api/v1";

type HeatpumpState = {
  mode: Mode;
  targetTemperature: number;
};

type Mode = "AUTO" | "HEAT" | "COOL" | "OFF";

function modeToNumber(mode: Mode): number {
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

function numberToMode(num: number): Mode {
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

type TemperatureReading = {
  temperature: number;
  humidity: number;
};

export class HeatpumpAccessory {
  private service: Service;

  private heatpumpStateFetcher: SingleFlightFetcher<HeatpumpState>;
  private temperatureSensorFetcher: SingleFlightFetcher<TemperatureReading>;

  constructor(private readonly platform: HomebridgePluginPlatform, private readonly accessory: PlatformAccessory) {
    const { manufacturer, model, serialNumber } = accessory.context.device;

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
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // Required Characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getMode.bind(this))
      .onSet(this.setMode.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 17,
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

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentHumidity.bind(this));

    this.heatpumpStateFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/state`);
    this.temperatureSensorFetcher = new SingleFlightFetcher(`${API_ENDPOINT}/temperature-and-humidity`);
  }

  async getMode(): Promise<CharacteristicValue> {
    const state = await this.heatpumpStateFetcher.fetch();

    return modeToNumber(state.mode);
  }

  async setMode(value: CharacteristicValue) {
    const mode = numberToMode(value as number);

    await fetch(`${API_ENDPOINT}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode }),
    }).catch((err) => console.log(err));
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const state = await this.heatpumpStateFetcher.fetch();

    return state.targetTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    const targetTemperature = value as number;

    await fetch(`${API_ENDPOINT}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTemperature: targetTemperature }),
    }).catch((err) => console.log(err));
  }

  async getOperatingState(): Promise<CharacteristicValue> {
    const state = await this.heatpumpStateFetcher.fetch();
    const temperatureSensor = await this.temperatureSensorFetcher.fetch();
    const threshold = 0.5;

    if (
      temperatureSensor.temperature > state.targetTemperature + threshold &&
      (state.mode === "AUTO" || state.mode === "COOL")
    ) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
    }

    if (
      temperatureSensor.temperature < state.targetTemperature - threshold &&
      (state.mode === "AUTO" || state.mode === "HEAT")
    ) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    }

    return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const temperatureSensor = await this.temperatureSensorFetcher.fetch();

    return temperatureSensor.temperature;
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    const temperatureSensor = await this.temperatureSensorFetcher.fetch();

    return temperatureSensor.humidity;
  }
}
