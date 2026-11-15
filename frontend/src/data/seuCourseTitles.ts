/**
 * Authentic Southeast University (SEU) Course Catalog Dictionary.
 * Maps both 3-digit legacy/current syllabus codes (e.g. CSE437, CSE441, CSE355)
 * and 4-digit codes (e.g. CSE4263) to official course titles.
 */
export const SEU_OFFICIAL_COURSE_TITLES: Record<string, string> = {
  // 4th Year CSE Courses
  CSE437: "Compiler Design",
  CSE438: "Compiler Design Lab",
  CSE441: "Theory of Computing",
  CSE443: "Computer Graphics & Animation",
  CSE444: "Computer Graphics & Animation Lab",
  CSE471: "Web and Internet Programming",
  CSE472: "Web and Internet Programming Lab",
  CSE473: "Software Development & Project Management",
  CSE474: "Software Development Lab",
  CSE475: "Management Information System",
  CSE477: "Cloud Computing",
  CSE479: "Cryptography & Network Security",
  CSE469: "Compiler Construction",
  CSE467: "E-Commerce & E-Governance",
  CSE465: "Parallel and Distributed Computing",
  CSE466: "Parallel and Distributed Computing Lab",
  CSE445: "Smart Device App Development",
  CSE455: "Machine Learning",
  CSE456: "Machine Learning Lab",
  CSE457: "Advanced Embedded Systems",
  CSE458: "Advanced Embedded Systems Lab",
  CSE459: "Research Methodology",
  CSE489: "Project OR Internship",
  CSE498: "Project & Thesis I",
  CSE499: "Project & Thesis II",

  // 3rd Year CSE Courses
  CSE355: "Digital Image Processing",
  CSE356: "Digital Image Processing Lab",
  CSE381: "Introduction to Embedded Systems",
  CSE382: "Introduction to Embedded Systems Lab",
  CSE341: "Operating Systems",
  CSE342: "Operating Systems Lab",
  CSE343: "Computer Networks",
  CSE344: "Computer Networks Lab",
  CSE345: "Artificial Intelligence",
  CSE346: "Artificial Intelligence Lab",
  CSE313: "Microprocessor & Assembly Language",
  CSE314: "Microprocessor & Assembly Language Lab",
  CSE315: "Software Engineering",
  CSE316: "Software Engineering Lab",

  // 2nd Year CSE Courses
  CSE241: "Data Structures",
  CSE242: "Data Structures Lab",
  CSE265: "Algorithms",
  CSE266: "Algorithms Lab",
  CSE243: "Database Management Systems",
  CSE244: "Database Management Systems Lab",
  CSE245: "Discrete Mathematics",
  CSE221: "Digital Logic Design",
  CSE222: "Digital Logic Design Lab",
  CSE223: "Electronic Devices & Circuits",
  CSE224: "Electronic Devices & Circuits Lab",

  // 1st Year CSE Courses
  CSE141: "Structured Programming Language",
  CSE142: "Structured Programming Language Lab",
  CSE143: "Object Oriented Programming",
  CSE144: "Object Oriented Programming Lab",
  CSE111: "Computer Fundamentals",
  CSE112: "Computer Fundamentals Lab",
  CSE101: "Introduction to Computer Systems",

  // Basic Sciences & Mathematics
  MAT101: "Differential & Integral Calculus",
  MAT111: "Differential & Integral Calculus",
  MAT141: "Differential & Integral Calculus",
  MAT143: "Coordinate Geometry & Linear Algebra",
  MAT241: "Complex Variables & Fourier Analysis",
  MAT243: "Probability & Statistics",
  PHY141: "Physics I",
  PHY142: "Physics I Lab",
  PHY143: "Physics II",
  PHY144: "Physics II Lab",
  CHEM101: "Chemistry",
  CHEM102: "Chemistry Lab",

  // General Education & Non-Major Courses
  ENG101: "Basic Composition",
  ENG102: "Intermediate Composition",
  ENG103: "Advanced English Writing & Public Speaking",
  GED101: "Bangladesh Studies",
  GED102: "History of the Emergence of Independent Bangladesh",
  ACT141: "Introduction to Accounting",
  ECO141: "Principles of Economics",
  MGT141: "Principles of Management",
  SOC101: "Introduction to Sociology",
  EEE181: "Basic Electrical Engineering",
  EEE182: "Basic Electrical Engineering Lab",

  // 4-Digit SEU Curriculum Codes
  CSE1101: "Introduction to Computer Systems",
  CSE1102: "Computer Fundamentals Lab",
  CSE1201: "Structured Programming",
  CSE1202: "Structured Programming Lab",
  CSE1301: "Discrete Mathematics",
  CSE2101: "Object Oriented Programming",
  CSE2102: "Object Oriented Programming Lab",
  CSE2103: "Data Structures",
  CSE2104: "Data Structures Lab",
  CSE2201: "Algorithms",
  CSE2202: "Algorithms Lab",
  CSE2203: "Digital Logic Design",
  CSE2204: "Digital Logic Design Lab",
  CSE2301: "Database Management Systems",
  CSE2302: "Database Management Systems Lab",
  CSE3101: "Theory of Computation",
  CSE3103: "Microprocessors & Microcontrollers",
  CSE3104: "Microprocessors Lab",
  CSE3201: "Operating Systems",
  CSE3202: "Operating Systems Lab",
  CSE3203: "Computer Networks",
  CSE3204: "Computer Networks Lab",
  CSE3301: "Software Engineering",
  CSE3302: "Software Engineering Lab",
  CSE3303: "Artificial Intelligence",
  CSE3304: "Artificial Intelligence Lab",
  CSE3305: "Computer Architecture & Organization",
  CSE4101: "Machine Learning",
  CSE4102: "Machine Learning Lab",
  CSE4103: "Computer Graphics",
  CSE4104: "Computer Graphics Lab",
  CSE4263: "Compiler Design",
  CSE4264: "Compiler Design Lab",
  CSE4265: "Digital Image Processing",
  CSE4266: "Digital Image Processing Lab",
  CSE4271: "Web and Internet Programming",
  CSE4272: "Web and Internet Programming Lab",
  CSE4273: "Software Development and Project Management",
  CSE4274: "Software Development and Project Management Lab",
  CSE4279: "Cryptography & Network Security",
  CSE4281: "Introduction to Embedded Systems",
  CSE4282: "Embedded Systems Lab",
  CSE4299: "Project & Thesis",
};

/**
 * Returns the authentic course title for a given code.
 * If fallbackTitle is provided and valid (not "CSE.", not empty, not just the code),
 * it uses fallbackTitle. Otherwise, it resolves from the official SEU dictionary.
 */
export function getSeuCourseTitle(code: string, fallbackTitle?: string): string {
  if (!code) return "Academic Course";
  const cleanCode = code.trim().toUpperCase();
  const baseCode = cleanCode.split(".")[0];

  // 1. Highest Priority: Authentic Official Southeast University (SEU) Dictionary
  if (SEU_OFFICIAL_COURSE_TITLES[cleanCode]) {
    return SEU_OFFICIAL_COURSE_TITLES[cleanCode];
  }
  if (SEU_OFFICIAL_COURSE_TITLES[baseCode]) {
    return SEU_OFFICIAL_COURSE_TITLES[baseCode];
  }

  // 2. Second Priority: Use fallbackTitle ONLY if it is genuine descriptive title
  // and NOT a department/code placeholder like "CSE.", "EEE.", "BBA.", "B.Sc", etc.
  if (fallbackTitle) {
    const trimmed = fallbackTitle.trim();
    const upper = trimmed.toUpperCase();
    const isDeptToken =
      upper.startsWith("CSE.") ||
      upper.startsWith("EEE.") ||
      upper.startsWith("BBA.") ||
      upper === "CSE" ||
      upper === "EEE" ||
      upper === "BBA" ||
      upper.startsWith("B.SC") ||
      upper.startsWith("DEPT") ||
      upper.startsWith("DEPARTMENT") ||
      upper === cleanCode ||
      upper === baseCode;

    if (!isDeptToken && trimmed.length >= 3) {
      return trimmed;
    }
  }

  return cleanCode;
}
