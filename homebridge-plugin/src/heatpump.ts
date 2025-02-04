import type { CharacteristicValue, PlatformAccessory, Service } from "homebridge";

import { WebSocket } from "ws";
import { HomebridgePluginPlatform } from "./platform.js";
import { TemperatureReader, TemperatureReading } from "./temperature_reader.js";

const WEBSOCKET_ENDPOINT = "ws://localhost:8000/ws";

type HeatpumpState = {
  mode: Mode;
  target_temperature: number;
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

export class HeatpumpAccessory {
  private service: Service;

  private temperatureSensor: TemperatureReader;
  private ws: WebSocket;
  private state: HeatpumpState = {
    mode: "OFF",
    target_temperature: 20,
  };

  constructor(private readonly platform: HomebridgePluginPlatform, private readonly accessory: PlatformAccessory) {
    const { manufacturer, model, serialNumber } = accessory.context.device;

    // Set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, "1.0");

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
      .onGet(this.getCurrentState.bind(this));

    // Optional Characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentHumidity.bind(this));

    // WebSocket
    this.ws = new WebSocket(WEBSOCKET_ENDPOINT);

    this.ws.on("error", (err) => {
      console.log("WebSocket error:", err);
    });

    this.ws.on("message", (data) => {
      this.state = JSON.parse(data.toString());

      this.service.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, this.getMode());
      this.service.updateCharacteristic(this.platform.Characteristic.TargetTemperature, this.getTargetTemperature());
      this.getCurrentState().then((state) => {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, state);
      });
    });

    this.temperatureSensor = new TemperatureReader();
  }

  getMode(): CharacteristicValue {
    return modeToNumber(this.state.mode);
  }

  setMode(value: CharacteristicValue) {
    const mode = numberToMode(value as number);

    this.state.mode = mode;

    this.ws.send(JSON.stringify({ mode: mode }), (err) => {
      if (err) {
        console.log("Error sending mode:", err);
      }
    });
  }

  getTargetTemperature(): CharacteristicValue {
    return this.state.target_temperature;
  }

  setTargetTemperature(value: CharacteristicValue) {
    this.state.target_temperature = value as number;

    this.ws.send(JSON.stringify({ target_temperature: value }), (err) => {
      if (err) {
        console.log("Error sending target temperature:", err);
      }
    });
  }

  async getCurrentState(): Promise<CharacteristicValue> {
    const reading: TemperatureReading = await this.temperatureSensor.read();

    switch (this.state.mode) {
      case "AUTO":
        if (reading.temperature > this.state.target_temperature) {
          return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
        } else {
          return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
        }
      case "COOL":
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      case "HEAT":
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      case "OFF":
      default:
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const reading: TemperatureReading = await this.temperatureSensor.read();

    return reading.temperature;
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    const reading: TemperatureReading = await this.temperatureSensor.read();

    return reading.humidity;
  }
}
