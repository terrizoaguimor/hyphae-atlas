import {createClient} from "@sanity/client";

export function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  const apiVersion = process.env.SANITY_API_VERSION;
  const token = process.env.SANITY_READ_TOKEN;
  if (!projectId || !dataset || !apiVersion || !token) throw new Error("Sanity read-only runtime environment is incomplete");
  return createClient({projectId, dataset, apiVersion, token, useCdn: false, perspective: "published"});
}
