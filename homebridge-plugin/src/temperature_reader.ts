const API_ENDPOINT = "http://localhost:8000/api/v1";

export type TemperatureReading = {
  temperature: number;
  humidity: number;
};

export class TemperatureReader {
  private request: Promise<TemperatureReading> | null;

  constructor() {
    this.request = null;
  }

  read(): Promise<TemperatureReading> {
    if (!this.request) {
      this.request = fetch(`${API_ENDPOINT}/heatpump/temperature-and-humidity`)
        .then((res) => res.json())
        .catch((err) => console.log("Error fetching temperature reading:", err))
        .finally(() => {
          this.request = null;
        });
    }

    return this.request;
  }
}
