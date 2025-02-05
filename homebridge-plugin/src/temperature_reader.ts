export type TemperatureReading = {
  temperature: number;
  humidity: number;
};

export class TemperatureReader {
  private request: Promise<TemperatureReading> | null;
  private endpoint: string;

  constructor(endpoint: string) {
    this.request = null;
    this.endpoint = endpoint;
  }

  read(): Promise<TemperatureReading> {
    if (!this.request) {
      this.request = fetch(this.endpoint)
        .then((res) => res.json())
        .catch((err) => console.log("Error fetching temperature reading:", err))
        .finally(() => {
          this.request = null;
        });
    }

    return this.request;
  }
}
