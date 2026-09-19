import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {schemaTypes} from "./src/sanity/schemaTypes";

const projectId = process.env.SANITY_PROJECT_ID;
if (!projectId) throw new Error("SANITY_PROJECT_ID is required");

export default defineConfig({
  name: "hyphae-atlas",
  title: "Hyphae Atlas",
  projectId,
  dataset: process.env.SANITY_DATASET ?? "production",
  plugins: [structureTool()],
  schema: {types: schemaTypes},
});
