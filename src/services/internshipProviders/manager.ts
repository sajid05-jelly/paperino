import { StandardInternship, InternshipProvider } from "./types";

export class InternshipManager {
  private providers: InternshipProvider[] = [];

  async getAggregatedInternships(forceSync = false): Promise<StandardInternship[]> {
    // Unstop live scraping is disabled to strictly exclude Unstop and prevent gateway timeouts.
    return [];
  }
}
