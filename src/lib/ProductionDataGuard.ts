// src/lib/ProductionDataGuard.ts

export class ProductionIntegrityError extends Error {
  constructor(message: string, public view?: string, public source?: string) {
    super(message);
    this.name = "ProductionIntegrityError";
  }
}

export class ProductionDataGuard {
  static MOCK_TERMS = [
    "sarah jenkins",
    "michael chen",
    "retailgenius",
    "retail genius",
    "cloudnative",
    "cloud native",
    "techsource staffing",
    "techsource",
    "healthcorp",
    "acme corp",
    "acme",
    "demo candidate",
    "mock vendor"
  ];

  /**
   * Scans any data object, array, or string to verify it is production-ready.
   * Throws a ProductionIntegrityError if any forbidden mock words are found.
   */
  static validate(data: any, viewName: string, source: string = "Dynamic State"): void {
    if (!data) return;
    
    // Check if it contains any blacklisted terms
    const textRepresentation = JSON.stringify(data).toLowerCase();
    
    for (const term of this.MOCK_TERMS) {
      if (textRepresentation.includes(term)) {
        throw new ProductionIntegrityError(
          `Mock entity containing forbidden term "${term}" was detected in production rendering path.`,
          viewName,
          source
        );
      }
    }
  }
}

export function assertNoMockData(data: any, source: string): void {
  ProductionDataGuard.validate(data, "Production Guard", source);
}
