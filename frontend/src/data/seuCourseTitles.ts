/**
 * Authentic Southeast University (SEU) Course Catalog Dictionary.
 * Maps both 3-digit legacy/current syllabus codes (e.g. CSE181, CSE263, CSE355)
 * and 4-digit codes (e.g. CSE4263) to official course titles.
 */
export const SEU_OFFICIAL_COURSE_TITLES: Record<string, string> = {
  // 1st Year Courses
  CSE141: "Computer Fundamentals",
  CSE142: "Computer Fundamentals Lab",
  CSE161: "Programming Language I (C)",
  CSE162: "Programming Language I Lab",
  CSE181: "Discrete Mathematics",
  ENG101: "Basic Composition",
  ENG102: "Intermediate Composition",
  ENG103: "Advanced English Skills",
  ENG105: "Public Speaking",
  MAT141: "Differential & Integral Calculus",
  MAT161: "Coordinate Geometry and Vector Analysis",
  PHY161: "Physics - I",
  PHY181: "Physics II",
  PHY182: "Physics II Lab",
  EEE181: "Electrical Circuits Design I",
  EEE182: "Electrical Circuits Design I Lab",

  // 2nd Year Courses
  CSE241: "Data Structures",
  CSE242: "Data Structures Lab",
  CSE261: "Numerical Methods",
  CSE263: "Digital Logic Design",
  CSE264: "Digital Logic Design Lab",
  CSE265: "Algorithm",
  CSE266: "Algorithm Lab",
  CSE281: "Introduction to Programming Language II (Java)",
  CSE282: "Introduction to Programming Language II (Java) Lab",
  EEE241: "Electronic Devices & Circuits I",
  EEE242: "Electronic Devices & Circuits I Lab",
  MAT241: "Complex Variables and Transforms",
  MAT261: "Linear Algebra and Matrices",
  STA281: "Statistical Methods & Probability",
  MGT281: "Introduction to Business & Management",
  ACT141: "Introduction to Accounting",
  ECO461: "Introduction to Economics",
  SOC341: "Engineering Ethics",

  // 3rd Year Courses
  CSE341: "Computer Networking",
  CSE342: "Computer Networking Lab",
  CSE343: "Computer Architecture",
  CSE345: "Information System Design & Software Engineering",
  CSE346: "Information System Design & Software Engineering Lab",
  CSE347: "Advanced Networking",
  CSE348: "Advanced Networking Lab",
  CSE349: "Mathematical Analysis for Computer Science",
  CSE351: "Advanced Java",
  CSE352: "Advanced Java Lab",
  CSE353: "Introduction to Data Mining",
  CSE355: "Image Processing",
  CSE356: "Image Processing Lab",
  CSE359: "Graph Theory",
  CSE361: "Operating Systems",
  CSE362: "Operating Systems Lab",
  CSE363: "Microprocessor Design & Assembly Language Programming",
  CSE364: "Microprocessor Design & Assembly Language Programming Lab",
  CSE365: "Artificial Intelligence",
  CSE375: "Advanced Algorithm",
  CSE376: "Advanced Algorithm Lab",
  CSE381: "Introduction to Embedded Systems",
  CSE382: "Introduction to Embedded Systems Lab",
  CSE383: "Database Design",
  CSE384: "Database Design Lab",

  // 4th Year Courses
  CSE437: "Compiler Design",
  CSE438: "Compiler Design Lab",
  CSE441: "Theory of Computing",
  CSE443: "Computer Graphics & Animation",
  CSE444: "Computer Graphics & Animation Lab",
  CSE445: "Smart Device App Development",
  CSE457: "Advanced Embedded Systems",
  CSE458: "Advanced Embedded Systems Lab",
  CSE459: "Research Methodology",
  CSE465: "Parallel and Distributed Computing",
  CSE466: "Parallel and Distributed Computing Lab",
  CSE467: "E-Commerce & E-Governance",
  CSE469: "Compiler Construction",
  CSE471: "Web and Internet Programming",
  CSE472: "Web and Internet Programming Lab",
  CSE473: "Software Development and Project Management",
  CSE474: "Software Development and Project Management Lab",
  CSE475: "Management Information System",
  CSE477: "Cloud Computing",
  CSE479: "Cryptography & Network Security",
  CSE489: "Project OR Internship",
  CSE498: "Project & Thesis I",
  CSE499: "Project & Thesis II",
  EEE425: "VLSI Design",
  EEE456: "VLSI Design Lab",

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
