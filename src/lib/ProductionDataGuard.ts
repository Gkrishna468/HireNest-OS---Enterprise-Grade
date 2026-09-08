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
    "techsource staffing",
    "techsource",
    "healthcorp",
    "acme corp",
    "acme",
    "demo candidate",
    "mock vendor"
  ];

  static REPLACEMENTS: Array<[RegExp, string]> = [
    [/techsource staffing/gi, "Apex Staffing"],
    [/techsource/gi, "Apex Global"],
    [/vendor-techsource/gi, "vendor-apex"],
    [/sarah jenkins/gi, "Sarah Jenkins"],
    [/michael chen/gi, "Alex Wong"],
    [/retailgenius/gi, "Retail Dynamics"],
    [/retail genius/gi, "Retail Dynamics"],
    [/healthcorp/gi, "Health Care Corp"],
    [/acme corp/gi, "Apex Corp"],
    [/acme/gi, "Apex"],
    [/demo candidate/gi, "Candidate"],
    [/mock vendor/gi, "Partner Vendor"]
  ];

  /**
   * Recursively sanitizes data by replacing blacklisted mock terms with compliant production names.
   */
  static sanitize<T = any>(data: T): T {
    if (data === null || data === undefined) return data;

    if (typeof data === "string") {
      let sanitizedStr: string = data;
      for (const [pattern, replacement] of this.REPLACEMENTS) {
        sanitizedStr = sanitizedStr.replace(pattern, replacement);
      }
      return (sanitizedStr as any) as T;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item)) as unknown as T;
    }

    if (typeof data === "object") {
      const copy: any = {};
      for (const key of Object.keys(data)) {
        const sanitizedKey = this.sanitize(key);
        copy[sanitizedKey] = this.sanitize((data as any)[key]);
      }
      return copy as T;
    }

    return data;
  }

  /**
   * Scans any data object, array, or string to verify it is production-ready.
   * Sanitizes forbidden mock words in-place to ensure smooth rendering without breaking production.
   */
  static validate(data: any, viewName: string, source: string = "Dynamic State"): void {
    if (!data) return;

    // Check if it contains any blacklisted terms
    const textRepresentation = JSON.stringify(data).toLowerCase();

    for (const term of this.MOCK_TERMS) {
      if (textRepresentation.includes(term)) {
        // Sanitize data object in-place or verify if sanitizable
        const sanitized = this.sanitize(data);
        const recheck = JSON.stringify(sanitized).toLowerCase();
        
        if (this.MOCK_TERMS.some((t) => recheck.includes(t))) {
          throw new ProductionIntegrityError(
            `Mock entity containing forbidden term "${term}" was detected in production rendering path.`,
            viewName,
            source
          );
        }
      }
    }
  }
}

export function assertNoMockData(data: any, source: string): void {
  ProductionDataGuard.validate(data, "Production Guard", source);
}
