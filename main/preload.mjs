import { contextBridge } from "electron";
import path from "path";

// Code Kyrn
import { JSONManagerMulti } from "../modules/json-manager/json-manager.mjs";
import JSONScanner from "../modules/json-scanner/json-scanner.mjs";

const jsonManager = new JSONManagerMulti();
const jsonScanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: "array",
  removeDuplicates: true,
  duplicateKey: "id",
});

// Kyrnex application folder path
const apps_kyrnex = path.join(__dirname, "apps");

window.addEventListener("DOMContentLoaded", async () => {
    
    // Escanear carpetas de aplicaciones pre instaladas
    const result_apps_pre = await jsonScanner.scan(apps_kyrnex);
    
    
});
