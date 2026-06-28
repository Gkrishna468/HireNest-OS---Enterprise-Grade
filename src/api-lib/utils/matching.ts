export function normalizeSkills(skills: string[]): string[] {
  const mappings: Record<string, string> = {
    "react.js": "react",
    reactjs: "react",
    "node.js": "node",
    nodejs: "node",
    "vue.js": "vue",
    vuejs: "vue",
    "next.js": "nextjs",
    aws: "amazon web services",
    gcp: "google cloud",
    typescript: "ts",
    javascript: "js",
  };
  return skills.map((s) => mappings[s.toLowerCase()] || s.toLowerCase());
}
