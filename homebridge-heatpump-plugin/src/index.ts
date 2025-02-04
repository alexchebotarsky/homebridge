import type { API } from "homebridge";

import { HeatpumpPluginPlatform } from "./platform.js";
import { PLATFORM_NAME } from "./settings.js";

// Register platform with Homebridge
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HeatpumpPluginPlatform);
};
