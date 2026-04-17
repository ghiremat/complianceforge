export interface AnnexIIICategory {
  id: number;
  title: string;
  description: string;
  examples: string[];
  keyArticles: string[];
}

export const ANNEX_III_CATEGORIES: AnnexIIICategory[] = [
  {
    id: 1,
    title: "Biometrics",
    description: "AI systems intended for biometric identification and categorisation of natural persons, and emotion recognition systems.",
    examples: [
      "Remote biometric identification systems",
      "AI for categorising persons based on biometric data",
      "Emotion recognition in workplace or education",
    ],
    keyArticles: ["Article 6(2)", "Annex III(1)"],
  },
  {
    id: 2,
    title: "Critical infrastructure",
    description:
      "AI systems intended as safety components in the management and operation of critical digital infrastructure, road traffic, or supply of water, gas, heating, or electricity.",
    examples: [
      "AI managing electricity grid operations",
      "Traffic management AI systems",
      "Water supply safety systems",
    ],
    keyArticles: ["Article 6(2)", "Annex III(2)"],
  },
  {
    id: 3,
    title: "Education and vocational training",
    description:
      "AI systems intended to determine access to or assign persons to educational and vocational training institutions, evaluate learning outcomes, assess appropriate level of education, or monitor prohibited behaviour during tests.",
    examples: [
      "AI-based student admission systems",
      "Automated essay grading",
      "Exam proctoring AI",
    ],
    keyArticles: ["Article 6(2)", "Annex III(3)"],
  },
  {
    id: 4,
    title: "Employment, workers management and access to self-employment",
    description:
      "AI systems intended for recruitment, selection, HR decisions including promotion, termination, task allocation, and monitoring or evaluation of persons in work-related relationships.",
    examples: [
      "CV screening and candidate ranking",
      "Automated interview evaluation",
      "Employee performance monitoring AI",
      "Task allocation algorithms",
    ],
    keyArticles: ["Article 6(2)", "Annex III(4)"],
  },
  {
    id: 5,
    title: "Access to essential private and public services",
    description:
      "AI systems intended for evaluating eligibility for public assistance, creditworthiness, risk assessment in life/health insurance, or emergency service dispatching.",
    examples: [
      "Credit scoring AI",
      "Insurance risk assessment",
      "Social benefit eligibility AI",
      "Emergency dispatch prioritisation",
    ],
    keyArticles: ["Article 6(2)", "Annex III(5)"],
  },
  {
    id: 6,
    title: "Law enforcement",
    description:
      "AI systems intended for use by law enforcement authorities for risk assessment, polygraphs, evaluating evidence reliability, predicting criminal offences, profiling, or crime analytics.",
    examples: [
      "Predictive policing AI",
      "AI-based evidence analysis",
      "Criminal risk assessment tools",
    ],
    keyArticles: ["Article 6(2)", "Annex III(6)"],
  },
  {
    id: 7,
    title: "Migration, asylum and border control",
    description:
      "AI systems intended for use as polygraphs, assessing irregular migration risk, examining applications for asylum/visa/residence, or identification in the context of migration.",
    examples: [
      "Asylum application assessment AI",
      "Border surveillance AI systems",
      "Visa risk scoring",
    ],
    keyArticles: ["Article 6(2)", "Annex III(7)"],
  },
  {
    id: 8,
    title: "Administration of justice and democratic processes",
    description:
      "AI systems intended to assist judicial authorities in researching and interpreting facts and law, or intended to influence the outcome of elections or referendums.",
    examples: [
      "AI-assisted legal research and case analysis",
      "Sentencing recommendation AI",
      "Election influence detection systems",
    ],
    keyArticles: ["Article 6(2)", "Annex III(8)"],
  },
];

export function findAnnexIIICategory(id: number): AnnexIIICategory | undefined {
  return ANNEX_III_CATEGORIES.find((c) => c.id === id);
}

export function matchAnnexIIICategoryByName(name: string): AnnexIIICategory | undefined {
  const lower = name.toLowerCase();
  return ANNEX_III_CATEGORIES.find(
    (c) =>
      c.title.toLowerCase().includes(lower) ||
      lower.includes(c.title.toLowerCase()) ||
      c.examples.some((e) => lower.includes(e.toLowerCase()))
  );
}
