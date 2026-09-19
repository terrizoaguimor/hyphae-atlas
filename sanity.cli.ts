import {defineCliConfig} from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET ?? "production",
  },
  deployment: {
    appId: "mfjx7q5wv7v9a5n124xu423x",
  },
});
