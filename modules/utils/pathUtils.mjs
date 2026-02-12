import { fileURLToPath } from "url";
import { dirname } from "path";

export default {
  getFileDetails(metaUrl) {
    const __filename = fileURLToPath(metaUrl);
    const __dirname = dirname(__filename);
    return { __dirname, __filename };
  },
};