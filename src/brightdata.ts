import "dotenv/config";

// Structure of one search result.
export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

// Structure returned to Improv Mode.
export interface ResearchResponse {
  topic: string;
  sources: SearchResult[];
}

// Structure of a Bright Data result.
interface BrightDataResult {
  title?: string;
  description?: string;
  link?: string;
}

interface BrightDataResponse {
  organic?: BrightDataResult[];
}

// Check whether a URL is valid.
function isValidUrl(link: string): boolean {
  try {
    const url = new URL(link);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return false;
    }

    // Exclude Google redirect links.
    if (
      (url.hostname === "google.com" ||
        url.hostname.endsWith(".google.com")) &&
      (url.pathname === "/goto" ||
        url.pathname === "/url")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Executes a Bright Data Google SERP search for an arbitrary query string
 * and returns up to 5 validated organic results.
 */
export async function searchWebContext(
  query: string,
  timeoutMs: number = 60000
): Promise<SearchResult[]> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_SERP_ZONE;

  if (!apiKey || !zone) {
    throw new Error("Missing Bright Data credentials!");
  }

  const searchUrl = new URL("https://www.google.com/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("hl", "en");
  searchUrl.searchParams.set("gl", "us");
  searchUrl.searchParams.set("brd_json", "1");

  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone,
      url: searchUrl.toString(),
      format: "raw",
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorCode = response.headers.get("x-brd-error-code") ?? "unknown";
    throw new Error(`Bright Data error: ${response.status}, code: ${errorCode}`);
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(`Bright Data returned an empty response (HTTP ${response.status}).`);
  }

  let data: BrightDataResponse;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Bright Data returned invalid JSON (HTTP ${response.status}, length: ${responseText.length}).`
    );
  }

  if (!Array.isArray(data.organic)) {
    throw new Error("Bright Data did not return organic search results.");
  }

  return data.organic
    .map((result) => ({
      title: result.title ?? "",
      description: result.description ?? "",
      url: result.link ?? "",
    }))
    .filter((result) => result.title.length > 0 && isValidUrl(result.url))
    .slice(0, 5);
}

// Search the web for an improv speaking topic.
export async function researchTopic(
  topic: string
): Promise<ResearchResponse> {
  const sources = await searchWebContext(`${topic} facts benefits challenges`);
  return {
    topic,
    sources,
  };
}
