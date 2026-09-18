import { RecruiterVendorMappingBackendService } from "../api-lib/services/RecruiterVendorMappingService.js";

async function runApiSmokeTest() {
  console.log("=== HIRENEST OS API RESOLUTION SMOKE TEST ===");

  try {
    // 1. Verify RecruiterVendorMappingBackendService loads
    console.log("1. Verifying RecruiterVendorMappingBackendService import...");
    if (typeof RecruiterVendorMappingBackendService.getAllMappings !== "function") {
      throw new Error("RecruiterVendorMappingBackendService has no 'getAllMappings' function!");
    }
    console.log("[PASS] RecruiterVendorMappingBackendService import and methods verified.");

    // 2. Verify network-mapping handler loads
    console.log("2. Verifying network-mapping handler (lazy loaded import)...");
    const networkMappingMod = await import("../api-lib/handlers/network-mapping.js");
    if (!networkMappingMod.default) {
      throw new Error("network-mapping module has no default export!");
    }
    console.log("[PASS] network-mapping handler imported successfully.");

    // 3. Verify main api/index handler loads
    console.log("3. Verifying api/index handler...");
    const indexMod = await import("../../api/index.js");
    if (typeof indexMod.default !== "function") {
      throw new Error("api/index has no default handler export!");
    }
    console.log("[PASS] api/index handler imported successfully.");

    console.log("\n==========================================");
    console.log("🟢 ALL API IMPORT SMOKE TESTS PASSED!");
    console.log("==========================================");
    process.exit(0);
  } catch (err: any) {
    console.error("\n==========================================");
    console.error("🔴 API IMPORT SMOKE TEST FAILED!");
    console.error("Error details:", err);
    console.error("==========================================");
    process.exit(1);
  }
}

runApiSmokeTest();
