import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";
import type { Device } from "./types/Device.js";

import { AccessoryMap, type AccessoryType } from "./accessories.js";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";

export class HomebridgePluginPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  constructor(public readonly log: Logging, public readonly config: PlatformConfig, public readonly api: API) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug("Finished initializing platform:", this.config.name);

    // This event is fired when Homebridge has restored all cached accessories
    // from disk. Registering new devices should only be done after this.
    this.api.on("didFinishLaunching", () => {
      this.registerDevices();
    });
  }

  // This method is called by Homebridge for each accessory in the cache
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Restoring accessory from cache:", accessory.displayName);

    const device: Device = accessory.context.device;

    // Create the accessory handler based on the device type
    const Accessory = AccessoryMap[device.accessoryType as AccessoryType];
    new Accessory(this, accessory);

    // Add cached accessory to the accessories list
    this.accessories.set(accessory.UUID, accessory);
  }

  registerDevices() {
    const devices: Device[] = this.config.devices || [];
    const deviceUUIDs = [];

    // Register devices or load them from cache
    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(device.serialNumber);
      deviceUUIDs.push(uuid);

      // Register accessory if it's not yet registered
      if (!this.accessories.has(uuid)) {
        this.log.info("Adding new accessory:", device.name);

        // Create new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device;

        // Create the accessory handler based on the device type
        const Accessory = AccessoryMap[device.accessoryType as AccessoryType];
        new Accessory(this, accessory);

        // Register accessory on the platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove cached accessories that are no longer in the list of devices
    for (const [uuid, accessory] of this.accessories) {
      if (!deviceUUIDs.includes(uuid)) {
        this.log.info("Removing no longer accessible accessory from cache:", accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }
}
