/**
 * HireNestOS Controlled Skills Taxonomy & Deterministic Skill Extractor
 * Maps variations, aliases, and abbreviations to canonical skill names.
 */

export interface SkillCategory {
  category: "LANGUAGES" | "FRONTEND" | "BACKEND" | "CLOUD" | "DATABASE" | "DEVOPS" | "AI_ML" | "TESTING" | "SYSTEMS" | "TOOLS" | "DATA_ENGINEERING";
  canonical: string;
  aliases: string[];
}

export const CONTROLLED_SKILL_TAXONOMY: SkillCategory[] = [
  // Programming Languages
  { category: "LANGUAGES", canonical: "C++", aliases: ["c++", "c/c++", "cpp", "c plus plus", "c++11", "c++14", "c++17", "c++20", "modern c++"] },
  { category: "LANGUAGES", canonical: "C", aliases: ["c language", "ansi c", "embedded c"] },
  { category: "LANGUAGES", canonical: "Java", aliases: ["java", "core java", "j2ee", "java 8", "java 11", "java 17", "java 21"] },
  { category: "LANGUAGES", canonical: "Python", aliases: ["python", "python3", "py"] },
  { category: "LANGUAGES", canonical: "JavaScript", aliases: ["javascript", "js", "ecmascript", "es6", "es6+"] },
  { category: "LANGUAGES", canonical: "TypeScript", aliases: ["typescript", "ts"] },
  { category: "LANGUAGES", canonical: "Golang", aliases: ["go", "golang", "go language"] },
  { category: "LANGUAGES", canonical: "Rust", aliases: ["rust", "rustlang"] },
  { category: "LANGUAGES", canonical: "C#", aliases: ["c#", "csharp", "c sharp", ".net c#"] },
  { category: "LANGUAGES", canonical: "PHP", aliases: ["php", "php7", "php8"] },
  { category: "LANGUAGES", canonical: "Ruby", aliases: ["ruby", "ruby on rails", "rails"] },
  { category: "LANGUAGES", canonical: "Kotlin", aliases: ["kotlin"] },
  { category: "LANGUAGES", canonical: "Swift", aliases: ["swift", "swiftui"] },
  { category: "LANGUAGES", canonical: "Scala", aliases: ["scala"] },
  { category: "LANGUAGES", canonical: "R", aliases: ["r programming", "r language"] },
  { category: "LANGUAGES", canonical: "SQL", aliases: ["sql", "t-sql", "pl/sql", "ansi sql"] },
  { category: "LANGUAGES", canonical: "Bash/Shell", aliases: ["bash", "shell scripting", "sh", "zsh", "powershell"] },

  // Data Engineering & Modern Data Stack (Microsoft Fabric Ecosystem)
  { category: "DATA_ENGINEERING", canonical: "Microsoft Fabric", aliases: ["microsoft fabric", "ms fabric", "fabric", "fabric platform", "fabric data engineering", "fabric lakehouse", "fabric data warehouse", "fabric analytics", "microsoft fabric platform"] },
  { category: "DATA_ENGINEERING", canonical: "OneLake", aliases: ["onelake", "one lake", "fabric onelake"] },
  { category: "DATA_ENGINEERING", canonical: "Lakehouse", aliases: ["lakehouse", "data lakehouse", "fabric lakehouse", "delta lakehouse", "lakehouse architecture", "lake house"] },
  { category: "DATA_ENGINEERING", canonical: "Data Warehouse", aliases: ["data warehouse", "data warehousing", "synapse warehouse", "fabric warehouse", "edw", "enterprise data warehouse"] },
  { category: "DATA_ENGINEERING", canonical: "Direct Lake", aliases: ["direct lake", "directlake", "direct lake mode", "direct-lake"] },
  { category: "DATA_ENGINEERING", canonical: "Data Pipelines", aliases: ["data pipelines", "data pipeline", "fabric data pipelines", "pipeline architecture", "pipeline orchestration", "scheduled pipelines"] },
  { category: "DATA_ENGINEERING", canonical: "Dataflows Gen2", aliases: ["dataflows gen2", "dataflow gen2", "dataflows", "power query online", "gen2 dataflows"] },
  { category: "DATA_ENGINEERING", canonical: "Fabric Capacity Management", aliases: ["fabric capacity management", "capacity management", "cu optimization", "capacity units", "f sku", "fabric capacity", "capacity planning"] },
  { category: "DATA_ENGINEERING", canonical: "Azure Data Factory", aliases: ["azure data factory", "adf", "azure-data-factory"] },
  { category: "DATA_ENGINEERING", canonical: "Azure Synapse", aliases: ["azure synapse", "synapse analytics", "synapse", "azure synapse analytics"] },
  { category: "DATA_ENGINEERING", canonical: "Databricks", aliases: ["databricks", "azure databricks", "delta lake", "pyspark databricks"] },
  { category: "DATA_ENGINEERING", canonical: "Spark", aliases: ["spark", "apache spark", "pyspark", "spark sql", "spark streaming"] },
  { category: "DATA_ENGINEERING", canonical: "Power BI", aliases: ["power bi", "powerbi", "dax", "power bi service", "power query", "power bi premium"] },
  { category: "DATA_ENGINEERING", canonical: "Partitioning Strategy", aliases: ["partitioning strategy", "partitioning", "data partitioning", "table partitioning", "lakehouse partitioning", "v-order"] },
  { category: "DATA_ENGINEERING", canonical: "Data Modeling", aliases: ["data modeling", "dimensional modeling", "star schema", "snowflake schema", "medallion architecture", "bronze silver gold"] },
  { category: "DATA_ENGINEERING", canonical: "Snowflake", aliases: ["snowflake", "snowsql", "snowpark"] },
  { category: "DATA_ENGINEERING", canonical: "ETL/ELT", aliases: ["etl", "elt", "data ingestion", "data pipelines", "data integration"] },

  // Frontend
  { category: "FRONTEND", canonical: "React", aliases: ["react", "react.js", "reactjs", "react native"] },
  { category: "FRONTEND", canonical: "Angular", aliases: ["angular", "angular.js", "angularjs", "angular 2+"] },
  { category: "FRONTEND", canonical: "Vue.js", aliases: ["vue", "vue.js", "vuejs", "vue 3"] },
  { category: "FRONTEND", canonical: "Next.js", aliases: ["next.js", "nextjs", "next"] },
  { category: "FRONTEND", canonical: "HTML5/CSS3", aliases: ["html", "html5", "css", "css3", "sass", "scss", "less"] },
  { category: "FRONTEND", canonical: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { category: "FRONTEND", canonical: "Redux", aliases: ["redux", "redux toolkit", "rtk", "zustand", "mobx"] },
  { category: "FRONTEND", canonical: "GraphQL", aliases: ["graphql", "apollo graphql", "relay"] },

  // Backend & Frameworks
  { category: "BACKEND", canonical: "Node.js", aliases: ["node", "node.js", "nodejs"] },
  { category: "BACKEND", canonical: "Express.js", aliases: ["express", "express.js", "expressjs"] },
  { category: "BACKEND", canonical: "NestJS", aliases: ["nestjs", "nest.js"] },
  { category: "BACKEND", canonical: "Spring Boot", aliases: ["spring", "spring boot", "springboot", "spring mvc", "spring cloud"] },
  { category: "BACKEND", canonical: "Django", aliases: ["django", "django rest framework", "drf"] },
  { category: "BACKEND", canonical: "FastAPI", aliases: ["fastapi", "fast api"] },
  { category: "BACKEND", canonical: "Flask", aliases: ["flask"] },
  { category: "BACKEND", canonical: ".NET Core", aliases: [".net", ".net core", "asp.net", "asp.net core", "dotnet"] },
  { category: "BACKEND", canonical: "Microservices", aliases: ["microservices", "microservice architecture", "distributed systems", "service-oriented"] },
  { category: "BACKEND", canonical: "REST APIs", aliases: ["rest", "restful", "rest api", "rest apis", "restful api", "web api"] },
  { category: "BACKEND", canonical: "gRPC", aliases: ["grpc", "protobuf", "protocol buffers"] },

  // Cloud Platforms
  { category: "CLOUD", canonical: "AWS", aliases: ["aws", "amazon web services", "aws cloud", "ec2", "s3", "lambda", "ecs", "eks", "rds", "dynamodb", "cloudformation", "iam"] },
  { category: "CLOUD", canonical: "Azure", aliases: ["azure", "microsoft azure", "azure devops", "azure functions", "azure app service", "azure blob"] },
  { category: "CLOUD", canonical: "GCP", aliases: ["gcp", "google cloud", "google cloud platform", "bigquery", "cloud run", "gke", "cloud storage"] },

  // Databases & Storage
  { category: "DATABASE", canonical: "PostgreSQL", aliases: ["postgres", "postgresql", "psql"] },
  { category: "DATABASE", canonical: "MySQL", aliases: ["mysql", "mariadb"] },
  { category: "DATABASE", canonical: "MongoDB", aliases: ["mongodb", "mongo", "nosql mongodb"] },
  { category: "DATABASE", canonical: "Redis", aliases: ["redis", "valkey", "redis cache"] },
  { category: "DATABASE", canonical: "Elasticsearch", aliases: ["elasticsearch", "elastic search", "opensearch", "elk stack", "elk"] },
  { category: "DATABASE", canonical: "Kafka", aliases: ["kafka", "apache kafka", "event streaming", "confluent"] },
  { category: "DATABASE", canonical: "RabbitMQ", aliases: ["rabbitmq", "amqp", "activemq"] },
  { category: "DATABASE", canonical: "Cassandra", aliases: ["cassandra", "apache cassandra", "scylladb"] },
  { category: "DATABASE", canonical: "Oracle DB", aliases: ["oracle", "oracle db", "oracle database", "plsql"] },
  { category: "DATABASE", canonical: "Firebase/Firestore", aliases: ["firestore", "firebase", "firebase auth", "cloud firestore"] },

  // DevOps & Infrastructure
  { category: "DEVOPS", canonical: "Docker", aliases: ["docker", "containerization", "containers", "docker compose"] },
  { category: "DEVOPS", canonical: "Kubernetes", aliases: ["kubernetes", "k8s", "helm", "kubectl"] },
  { category: "DEVOPS", canonical: "Terraform", aliases: ["terraform", "iac", "infrastructure as code"] },
  { category: "DEVOPS", canonical: "CI/CD", aliases: ["ci/cd", "cicd", "jenkins", "github actions", "gitlab ci", "argo cd", "bitbucket pipelines"] },
  { category: "DEVOPS", canonical: "Linux", aliases: ["linux", "unix", "ubuntu", "centos", "debian", "redhat", "rhel", "embedded linux"] },
  { category: "DEVOPS", canonical: "Nginx", aliases: ["nginx", "apache web server", "reverse proxy"] },
  { category: "DEVOPS", canonical: "Prometheus/Grafana", aliases: ["prometheus", "grafana", "datadog", "new relic", "opentelemetry", "cloudwatch"] },

  // Systems & Low-Level
  { category: "SYSTEMS", canonical: "Multithreading/IPC", aliases: ["multithreading", "multi-threading", "concurrency", "pthreads", "posix threads", "ipc", "shared memory", "sockets", "socket programming"] },
  { category: "SYSTEMS", canonical: "STL", aliases: ["stl", "standard template library", "boost", "boost libraries"] },
  { category: "SYSTEMS", canonical: "GDB/Debugging", aliases: ["gdb", "gnu debugger", "valgrind", "core dump", "lldb", "address sanitizer", "asan"] },
  { category: "SYSTEMS", canonical: "RTOS/Embedded", aliases: ["rtos", "freertos", "embedded systems", "firmware", "device drivers", "kernel development"] },

  // Testing & Quality
  { category: "TESTING", canonical: "Unit Testing", aliases: ["unit testing", "jest", "mocha", "chai", "junit", "pytest", "googletest", "gtest", "catch2", "cypress", "playwright", "selenium"] },
  { category: "TESTING", canonical: "Static Analysis", aliases: ["static analysis", "sonarqube", "sonar", "eslint", "cppcheck", "coverity", "clang-tidy"] },

  // Enterprise & Domain
  { category: "TOOLS", canonical: "SAP", aliases: ["sap", "sap abap", "sap s/4hana", "sap hana", "sap fiori", "sap ecc"] },
  { category: "TOOLS", canonical: "ServiceNow", aliases: ["servicenow", "service now", "sn"] },
  { category: "TOOLS", canonical: "Salesforce", aliases: ["salesforce", "sfdc", "apex", "visualforce", "lightning web components", "lwc"] },
  { category: "TOOLS", canonical: "Git", aliases: ["git", "github", "gitlab", "version control", "vcs"] },
  { category: "TOOLS", canonical: "Agile/Scrum", aliases: ["agile", "scrum", "jira", "sprint planning", "kanban"] },
];

// Pre-compiled fast search lookup
const ALIAS_LOOKUP_MAP = new Map<string, { canonical: string; category: string }>();

CONTROLLED_SKILL_TAXONOMY.forEach(entry => {
  // Map canonical itself
  ALIAS_LOOKUP_MAP.set(entry.canonical.toLowerCase(), { canonical: entry.canonical, category: entry.category });
  // Map all aliases
  entry.aliases.forEach(alias => {
    ALIAS_LOOKUP_MAP.set(alias.toLowerCase(), { canonical: entry.canonical, category: entry.category });
  });
});

/**
 * Robust skill token boundary matcher that avoids regex boundary (\b) failures on symbols like C++, C#, .NET
 */
export function matchSkillToken(text: string, alias: string): boolean {
  if (!text || !alias) return false;
  const cleanAlias = alias.trim().toLowerCase();
  const lowerText = text.toLowerCase();

  // Quick reject if substring isn't anywhere in text
  if (!lowerText.includes(cleanAlias)) {
    if (cleanAlias === "c++" && !lowerText.includes("cpp") && !lowerText.includes("c plus plus") && !lowerText.includes("c/c++")) {
      return false;
    }
  }

  // Handle special single-letter or symbol skills safely
  if (cleanAlias === "c") {
    return /\b(?:programming in c|c programming|c language|ansi c|embedded c)\b/i.test(text);
  }
  if (cleanAlias === "r") {
    return /\b(?:r programming|r language|r statistical)\b/i.test(text);
  }
  if (cleanAlias === "go") {
    return /\b(?:golang|go language|go programming)\b/i.test(text);
  }
  if (cleanAlias === "c++" || cleanAlias === "c/c++") {
    return (
      /(?:^|[^a-zA-Z0-9+#])c\+\+(?:$|[^a-zA-Z0-9+#])/i.test(text) ||
      /(?:^|[^a-zA-Z0-9+#])c\/c\+\+(?:$|[^a-zA-Z0-9+#])/i.test(text) ||
      /\b(?:cpp|c plus plus|modern c\+\+)\b/i.test(text)
    );
  }
  if (cleanAlias === "c#") {
    return (
      /(?:^|[^a-zA-Z0-9+#])c#(?:$|[^a-zA-Z0-9+#])/i.test(text) ||
      /\b(?:csharp|c sharp|\.net c#)\b/i.test(text)
    );
  }
  if (cleanAlias === ".net" || cleanAlias === ".net core") {
    return (
      /(?:^|[^a-zA-Z0-9])\.net(?:\s*core)?(?:$|[^a-zA-Z0-9])/i.test(text) ||
      /\b(?:dotnet|asp\.net)\b/i.test(text)
    );
  }

  // Safe boundary matching for general skills
  const escaped = cleanAlias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-zA-Z0-9+#])${escaped}(?:$|[^a-zA-Z0-9+#])`, "i");
  return pattern.test(text);
}

/**
 * Normalizes any skill string to its canonical taxonomy name.
 */
export function normalizeSkillName(skill: string): string {
  if (!skill) return "";
  const clean = skill.trim().toLowerCase();
  const found = ALIAS_LOOKUP_MAP.get(clean);
  if (found) return found.canonical;

  // Partial / regex fallbacks for complex terms
  if (/^c\s*\+\+/i.test(clean) || /^cpp\b/i.test(clean)) return "C++";
  if (/^c\s*#/i.test(clean) || /^csharp/i.test(clean)) return "C#";
  if (/^\.?net\b/i.test(clean) || /^dotnet/i.test(clean)) return ".NET Core";
  if (/fabric/i.test(clean)) return "Microsoft Fabric";
  if (/lakehouse/i.test(clean)) return "Lakehouse";
  if (/warehouse/i.test(clean)) return "Data Warehouse";
  if (/direct\s*lake/i.test(clean)) return "Direct Lake";
  if (/dataflows?/i.test(clean)) return "Dataflows Gen2";
  if (/data\s*pipelines?/i.test(clean) || clean === "pipeline" || clean === "pipelines") return "Data Pipelines";
  if (/capacity\s*management|cu\s*optimization/i.test(clean)) return "Fabric Capacity Management";
  if (/databricks/i.test(clean)) return "Databricks";
  if (/spark|pyspark/i.test(clean)) return "Spark";
  if (/power\s*bi|powerbi/i.test(clean)) return "Power BI";
  if (/synapse/i.test(clean)) return "Azure Synapse";
  if (/azure\s*data\s*factory|adf\b/i.test(clean)) return "Azure Data Factory";
  if (/react/i.test(clean)) return "React";
  if (/node/i.test(clean)) return "Node.js";
  if (/^aws\b/i.test(clean) || clean.includes("amazon web services")) return "AWS";
  if (/^azure\b/i.test(clean)) return "Azure";
  if (/^gcp\b/i.test(clean) || clean.includes("google cloud")) return "GCP";
  if (/^k8s\b/i.test(clean) || clean.includes("kubernetes")) return "Kubernetes";
  if (/^docker/i.test(clean)) return "Docker";
  if (/^spring/i.test(clean)) return "Spring Boot";
  if (/^postgres/i.test(clean)) return "PostgreSQL";
  if (/^mongo/i.test(clean)) return "MongoDB";
  if (/^linux/i.test(clean)) return "Linux";

  // Return formatted title case if not in dictionary
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

/**
 * Deterministically scans resume text against the entire controlled skills taxonomy.
 */
export function extractSkills(text: string): { skills: string[]; normalizedSkills: string[] } {
  if (!text) return { skills: [], normalizedSkills: [] };

  const matchedCanonicals = new Set<string>();
  const originalFound = new Set<string>();

  // Iterate over each category and alias using robust token boundary matching
  for (const entry of CONTROLLED_SKILL_TAXONOMY) {
    for (const alias of [entry.canonical, ...entry.aliases]) {
      if (matchSkillToken(text, alias)) {
        matchedCanonicals.add(entry.canonical);
        originalFound.add(alias);
      }
    }
  }

  const normalizedSkills = Array.from(matchedCanonicals);
  const skills = Array.from(originalFound);

  return {
    skills: skills.length > 0 ? skills : normalizedSkills,
    normalizedSkills: normalizedSkills,
  };
}
