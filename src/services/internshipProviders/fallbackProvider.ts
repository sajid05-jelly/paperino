import { InternshipProvider, StandardInternship } from "./types";
import { UnstopProvider } from "./unstopProvider";

export class FallbackProvider implements InternshipProvider {
  name = "Unstop";

  async fetchInternships(): Promise<StandardInternship[]> {
    // Delegates exclusively to Unstop API provider
    const unstop = new UnstopProvider();
    return unstop.fetchInternships();
  }
}
