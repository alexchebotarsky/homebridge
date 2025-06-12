export class SingleFlightFetcher<T> {
  private request: Promise<T> | null;
  private endpoint: string;

  constructor(endpoint: string) {
    this.request = null;
    this.endpoint = endpoint;
  }

  fetch(): Promise<T> {
    if (!this.request) {
      this.request = fetch(this.endpoint)
        .then((res) => res.json())
        .catch((err) => console.log("Error fetching:", err))
        .finally(() => {
          this.request = null;
        });
    }

    return this.request;
  }
}
