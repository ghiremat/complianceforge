export interface ProhibitedPractice {
  id: string;
  article: string;
  title: string;
  description: string;
  indicators: string[];
}

export const PROHIBITED_PRACTICES: ProhibitedPractice[] = [
  {
    id: "art5-1a",
    article: "Article 5(1)(a)",
    title: "Subliminal manipulation",
    description:
      "AI systems that deploy subliminal techniques beyond a person's consciousness, or purposefully manipulative or deceptive techniques, with the objective or effect of materially distorting behaviour causing significant harm.",
    indicators: ["subliminal messaging", "dark patterns", "behavioural manipulation", "deceptive nudging"],
  },
  {
    id: "art5-1b",
    article: "Article 5(1)(b)",
    title: "Exploitation of vulnerabilities",
    description:
      "AI systems that exploit vulnerabilities of persons due to age, disability, or specific social or economic situation, to materially distort behaviour causing significant harm.",
    indicators: ["targeting vulnerable groups", "age-based exploitation", "disability exploitation", "economic vulnerability targeting"],
  },
  {
    id: "art5-1c",
    article: "Article 5(1)(c)",
    title: "Social scoring",
    description:
      "AI systems for evaluation or classification of natural persons based on social behaviour or personal characteristics, leading to detrimental or unfavourable treatment in unrelated contexts or disproportionate to the behaviour.",
    indicators: ["social credit", "citizen scoring", "behavioural rating", "trustworthiness scoring across contexts"],
  },
  {
    id: "art5-1d",
    article: "Article 5(1)(d)",
    title: "Criminal offence risk assessment based solely on profiling",
    description:
      "AI systems to assess the risk of natural persons committing criminal offences based solely on profiling or personality traits, except when used to augment human assessments based on objective facts.",
    indicators: ["predictive policing based on traits", "crime prediction from demographics", "personality-based risk scoring"],
  },
  {
    id: "art5-1e",
    article: "Article 5(1)(e)",
    title: "Untargeted facial recognition scraping",
    description:
      "AI systems creating or expanding facial recognition databases through untargeted scraping of facial images from the internet or CCTV footage.",
    indicators: ["facial scraping", "mass surveillance biometrics", "untargeted image collection"],
  },
  {
    id: "art5-1f",
    article: "Article 5(1)(f)",
    title: "Emotion recognition in workplace/education",
    description: "AI systems inferring emotions in the workplace and educational institutions, except for medical or safety reasons.",
    indicators: ["workplace emotion detection", "student emotion monitoring", "employee sentiment AI"],
  },
  {
    id: "art5-1g",
    article: "Article 5(1)(g)",
    title: "Biometric categorisation for sensitive attributes",
    description:
      "AI systems categorising natural persons individually based on biometric data to deduce race, political opinions, trade union membership, religious beliefs, sex life, or sexual orientation (with limited exceptions for law enforcement).",
    indicators: ["race inference from biometrics", "political opinion detection", "religion detection from appearance"],
  },
  {
    id: "art5-1h",
    article: "Article 5(1)(h)",
    title: "Real-time remote biometric identification in public spaces",
    description:
      "AI systems for real-time remote biometric identification of natural persons in publicly accessible spaces for law enforcement, except for narrowly defined exceptions.",
    indicators: ["real-time facial recognition public", "live biometric surveillance", "mass biometric screening"],
  },
];
