// NoteLagbe Southeast University Curriculum Data Repository
// Grounded 100% in Official Primary Sources:
// 1. Batch 72 Onwards (New OBE Curriculum, 141 Credits): from official SEU HTML archive (https://english.seu.edu.bd/cse-curriculum)
// 2. Batch 60 to 71 (Legacy Curriculum, 150 Credits, IEB Accredited): from official SEU Course Curriculum 31-page PDF

export interface CourseDetail {
  code: string;
  title: string;
  category: string;
  prototype: "Theory" | "Practical";
  credits: number;
  prerequisite: string;
  topics?: string;
  recommendedBooks?: string;
}

export interface SemesterStructure {
  semesterNumber: number;
  name: string;
  year: number;
  totalCredits: number;
  courses: CourseDetail[];
}

export interface MajorTrack {
  id: string;
  title: string;
  requiredCredits: number;
  courses: CourseDetail[];
}

export interface ElectiveGroup {
  groupId: string;
  name: string;
  description: string;
  minCredits: number;
  courses: CourseDetail[];
}

export interface CurriculumData {
  batchId: "batch_72_plus" | "batch_60_71";
  batchLabel: string;
  batchSubLabel: string;
  programName: string;
  degree: string;
  totalCredits: number;
  totalSemesters: number;
  durationYears: number;
  minCgpa: number;
  accreditation: string;
  effectiveFrom: string;
  officialPdfUrl?: string;
  semesters: SemesterStructure[];
  majorTracks?: MajorTrack[];
  electiveGroups?: ElectiveGroup[];
}

export interface DepartmentInfo {
  id: string;
  code: string;
  name: string;
  degreeName: string;
  faculty: string;
  status: 'active' | 'coming_soon';
  headName: string;
  email: string;
  office: string;
}

export const SEU_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'cse',
    code: 'CSE',
    name: 'Department of Computer Science & Engineering',
    degreeName: 'Bachelor of Science in Computer Science and Engineering (B.Sc. in CSE)',
    faculty: 'School of Engineering (SE)',
    status: 'active',
    headName: 'Chairperson, CSE',
    email: 'cse@seu.edu.bd',
    office: 'Permanent Campus, Level 6'
  },
  {
    id: 'eee',
    code: 'EEE',
    name: 'Department of Electrical & Electronic Engineering',
    degreeName: 'Bachelor of Science in Electrical & Electronic Engineering (B.Sc. in EEE)',
    faculty: 'School of Engineering (SE)',
    status: 'coming_soon',
    headName: 'Chairperson, EEE',
    email: 'eee@seu.edu.bd',
    office: 'Permanent Campus, Level 5'
  },
  {
    id: 'arch',
    code: 'ARCH',
    name: 'Department of Architecture',
    degreeName: 'Bachelor of Architecture (B.Arch - 5 Years)',
    faculty: 'School of Engineering (SE)',
    status: 'coming_soon',
    headName: 'Chairperson, Architecture',
    email: 'arch@seu.edu.bd',
    office: 'Permanent Campus, Level 5'
  },
  {
    id: 'tex',
    code: 'TEX',
    name: 'Department of Textile Engineering',
    degreeName: 'Bachelor of Science in Textile Engineering (B.Sc. in Textile)',
    faculty: 'School of Engineering (SE)',
    status: 'coming_soon',
    headName: 'Chairperson, Textile Engineering',
    email: 'te@seu.edu.bd',
    office: 'Permanent Campus, Level 4'
  },
  {
    id: 'phr',
    code: 'PHR',
    name: 'Department of Pharmacy',
    degreeName: 'Bachelor of Pharmacy (B. Pharm Hons Professional)',
    faculty: 'School of Science (SS)',
    status: 'coming_soon',
    headName: 'Chairperson, Pharmacy',
    email: 'pharmacy@seu.edu.bd',
    office: 'Permanent Campus, Level 8'
  },
  {
    id: 'bba',
    code: 'BBA',
    name: 'Southeast Business School',
    degreeName: 'Bachelor of Business Administration (BBA) / MBA',
    faculty: 'School of Business Studies (SBS)',
    status: 'coming_soon',
    headName: 'Dean, Business School',
    email: 'bba@seu.edu.bd',
    office: 'Permanent Campus, Level 7'
  },
  {
    id: 'law',
    code: 'LAW',
    name: 'Department of Law & Justice',
    degreeName: 'Bachelor of Laws (LL.B Hons) / Master of Laws (LLM)',
    faculty: 'School of Law (SL)',
    status: 'coming_soon',
    headName: 'Dean, School of Law',
    email: 'law@seu.edu.bd',
    office: 'Permanent Campus, Level 3'
  },
  {
    id: 'eng',
    code: 'ENG',
    name: 'Department of English',
    degreeName: 'Bachelor of Arts in English (BA Hons) / MA in English',
    faculty: 'School of Arts & Social Sciences (SASS)',
    status: 'coming_soon',
    headName: 'Chairperson, English',
    email: 'english@seu.edu.bd',
    office: 'Permanent Campus, Level 4'
  },
  {
    id: 'bng',
    code: 'BNG',
    name: 'Department of Bangla',
    degreeName: 'Bachelor of Arts in Bangla (BA Hons) / Master of Arts in Bangla',
    faculty: 'School of Arts & Social Sciences (SASS)',
    status: 'coming_soon',
    headName: 'Chairperson, Bangla',
    email: 'bangla@seu.edu.bd',
    office: 'Permanent Campus, Level 4'
  },
  {
    id: 'eco',
    code: 'ECO',
    name: 'Department of Economics',
    degreeName: 'Bachelor of Social Sciences in Economics (BSS Hons) / MDS',
    faculty: 'School of Arts & Social Sciences (SASS)',
    status: 'coming_soon',
    headName: 'Chairperson, Economics',
    email: 'economics@seu.edu.bd',
    office: 'Permanent Campus, Level 4'
  },
  {
    id: 'ict',
    code: 'ICT',
    name: 'Department of Information & Communication Technology',
    degreeName: 'Bachelor of Science in ICT (B.Sc. in ICT)',
    faculty: 'School of Information Technology (SIT)',
    status: 'coming_soon',
    headName: 'Director, School of Information Technology',
    email: 'ict@seu.edu.bd',
    office: 'Permanent Campus, Level 6'
  }
];

// 1. BATCH 72 ONWARDS (NEW OBE CURRICULUM - 141 CREDITS)
export const BATCH_72_CURRICULUM: CurriculumData = {
  batchId: "batch_72_plus",
  batchLabel: "Batch 72 Onwards (New OBE Curriculum)",
  batchSubLabel: "Outcome-Based Education (OBE) • 141 Credits • 4 Major Specialization Tracks",
  programName: "Bachelor of Science in Computer Science and Engineering",
  degree: "B.Sc. in CSE",
  totalCredits: 141,
  totalSemesters: 12,
  durationYears: 4.0,
  minCgpa: 2.50,
  accreditation: "UGC Approved • OBE Framework • BAETE Compatible",
  effectiveFrom: "Trimester / Batch 72 Onwards",
  officialPdfUrl: "/curriculum/SEU_CSE_Curriculum_Batch_60_to_71.pdf",
  semesters: [
    {
        "semesterNumber": 1,
        "name": "1st Semester",
        "year": 1,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE1102",
                "title": "Computer Fundamentals Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Laboratory experiments covering computer hardware components, motherboards, CPU, RAM, storage, peripheral setup. Operating system installation (Windows & Linux), CLI commands, shell navigation. Office productivity tools, LaTeX document preparation, version control using Git and GitHub workflows.",
                "recommendedBooks": "Peter Norton's Introduction to Computers, McGraw-Hill."
            },
            {
                "code": "ELL1303",
                "title": "Advanced English Skills",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Basic Composition is a non-credit foundation course. It is designed to brush up students’ existing English skills. This course will help them to review the grammatical items they already know and will prepare them to study at the tertiary level by enhancing their English language skills.The main focus of this course is on reading and writing. Students will also learn to communicate in English by interacting with the instructor. Students will also explore the creative side of language by solving different sorts of tasks and preparing assignments on picture description and story completion. They will also be conditioned to write formal applications and Emails. At the end of the course they are expected to carry out their academic activities in English effectively."
            },
            {
                "code": "GED1111",
                "title": "Principles of Accounting",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Financial Accounting: Objectives and importance of accounting, accounting as an information system, computerized systems and applications in accounting, recording system - double entry mechanism, accounts and their classification, accounting equation, accounting cycle, journal, ledger, trialbalance, preparation of financial statements considering adjusting and closing entries, accounting concepts and conventions.\n\nCost & Management Accounting: Cost concepts and classification, overhead cost - meaning and classification, distribution of overhead cost, overhead recovery method, job order costing, preparation of job cost sheet and quotation prite, inventory valuation, absorption costing and marginal/variable costing technique, cost-volume-profit analysis, contribution-margin approach, sensitivity analysis.\n\nShort term investment decisions - relevant and differential cost analysis, long term investment decisions - capital budgeting, various techniques of evolution of capital investment"
            },
            {
                "code": "MAT1103",
                "title": "Differential & Integral Calculus",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Differential Calculus: Limits, continuity and differentiability, successive differentiation of various types of functions, Leibnitz’s theorem, Mean-value theorem in finite and infinite forms, Lagrange’s form of remainders, Cauchy’s form of remainder, expansion of functions, evaluation of indeterminate forms by L’Hospital’s rule, partial differentiation, Tangent and Normal, Subtangent and Subnormal in Cartesian and Polar coordinates, maximum and minimum values of functions of single variable, points of inflexion, curvature - radius of curvature, centre of curvature, asymptotes, curve tracing.\n\nIntegral Calculus: Definitions of Integration, integrations by methods of substitutions, integration by parts, standard integrals, integration by the method of successive reduction, definite integrals and its properties and use in summing series, Walli’s formula, Improper integrals, Beta function & Gamma function, area under a plane curve in Cartesian and polar coordinates, area of the region enclosed by two curves in Cartesian and Polar coordinates: Arc lengths of curves in Cartesian and Polar coordinates, parametric and pedal equations, intrinsic equations, volume of solids of revolutions, volume of hollow solids of revolution by shell method, area of surface of revolution, Jacobian, multiple integrals and its applications."
            },
            {
                "code": "PHY1103",
                "title": "Physics I",
                "category": "Basic Sciences",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Mechanics: Kinematics, Graphical representations of displacement-time, velocity-time and acceleration-time. Terminal velocity. Motion in two and three dimensions - projectile motion. Applications of Newton’s laws of motion, Analyses of frames of trusses, Friction, Equilibrium of forces, Work-kinetic energy theorem., Power, Conservative forces. Conservation of energy. Conservation of linear momentum for a system of particles. Center-of-mass motion. Elastic and inelastic collision in one dimension. Rotational kinematics. Angular momentum of a single particle. Conservation of angular momentum Moment of Inertia, Balancing of rotating masses. Gravitation: Gravitational field. Kepler’s laws.\n\nWaves and oscillations: Differential equation of simple harmonic oscillator, total energy and average energy, combination of simple harmonic oscillations, spring mass system, torsional pendulum; two body oscillation, reduced mass, damped oscillation, forced oscillation, resonance, progressive wave, power and intensity of wave, stationary wave, group and phase velocities.\n\nHeat and Thermodynamics: Heat and work- the first law of thermodynamics and its applications; Kinetic Theory of gases- Kinetic interpretation of temperature, specific heats of ideal gases, equipartition of energy, mean free path, Maxwell’s distribution of molecular speeds, reversible and irreversible processes, Carnot’s cycle, second law thermodynamics, Carnot’s theorem, entropy, Thermodynamic functions, Maxwell relations, Clausius and Clapeyron equation."
            }
        ]
    },
    {
        "semesterNumber": 2,
        "name": "2nd Semester",
        "year": 1,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE1201",
                "title": "Structured Programming",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1102",
                "topics": "Computer and C Fundamentals, C Data types, Operators and Expressions, Basic I/O functions, if-else statement, loops - for loop, while loop, do-while loop, functions, global, local, static and register variables, arrays, bubble sort, selection sort, pointer arithmetic, arrays and pointers, pointer to pointer to integer, structures."
            },
            {
                "code": "CSE1202",
                "title": "Structured Programming Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE1102",
                "topics": "Laboratory Work based on CSE161",
                "recommendedBooks": "Herbert Schildt, C: The Complete Reference, McGraw-Hill."
            },
            {
                "code": "GED1123",
                "title": "Bangladesh Studies",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Historical background of Bangladesh: Ancient and medieval Bengal, British colonial rule, Pakistan era and language movement of 1952, Six-Point movement of 1966, mass upsurge of 1969. The War of Liberation in 1971 and proclamation of independence. Constitution of Bangladesh: Fundamental rights, state principles, organs of government. Geography, natural resources, demographic profile, socio-economic challenges, vision 2041 and smart Bangladesh.",
                "recommendedBooks": "Sirajul Islam, History of Bangladesh, Asiatic Society of Bangladesh.\nConstitution of the People's Republic of Bangladesh."
            },
            {
                "code": "MAT1303",
                "title": "Differential Equations and Transforms",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT1103",
                "topics": "Complex Variables: complex number system, general function of a complex variable, limits and continuity of a function of a complex variable and related theorems, complex differentiation, the Cauchy-Riemann equation, mapping by elementary functions, line integral of a complex function, Cauchy’s Integral Theorem and formula, Liouville’s theorem, Taylor’s theorem, Laurent’s theorem, Singular points, Residue, Cauchy’s Residue Theorem, evaluation of Residues, Contour integration, conformal mapping. Laplace Transforms: Laplace transforms of some elementary functions, sufficient conditions for existence of Laplace Transforms, inverse Laplace transforms, Laplace transforms of derivatives, the\n\nunit step function, periodic function, some special theorems on Laplace transforms, partial fractions, solutions of differential equations.\n\nFourier Transforms: Real and complex form of Fourier series, finite transforms, Fourier Integral, Fourier transforms and their uses in solving boundary value problems of wave equations."
            },
            {
                "code": "PHY1211",
                "title": "Physics II",
                "category": "Basic Sciences",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "PHY1103",
                "topics": "Electricity and Magnetism: Electric charge and Coulomb’s law, Electric field, concept of electric flux and the Gauss’s law- some applications of Gauss’s law, Gauss’s law in vector form, Electric potential, relation between electric field and electric potential, capacitance and dielectrics, gradient, Laplace’s and Poisson’s equations, Current, Current density, resistivity, the magnetic field, Ampere’s law, Biot-Savart law and their applications.\n\nOptics: Defects of images: spherical aberration, astigmatism, coma, distortion, curvature, chromatic aberration. Theories of light; Interference of light: Young’s double slitexperiment, displacement of fringes and its uses, Fresnel bi-prism, interference in thin films, Newton’s rings,Bragg’s law and diffraction, interferometers; Diffraction: Diffraction by single slit,diffraction from a circular aperture, resolving power of optical instruments, diffraction at double slit and N-slits, diffraction grating; polarization: Production and analysis of polarized light, Brewster’s law, Malus law, polarization by double refraction, Nicol prism, optical activity, Polarimeters.\n\nReference Book(s):\n\n1.A Text Book of Optics - Brijlal and Subramannyam\n\n2.Fundamentals of optics - Francis and harve\n\n3. Waves and oscillation - Brijlal and Subramannyam\n\n4.Physics part-I - Resnick and Haliday\n\n5.Physics part-II - Resnick and Haliday\n\n6.Fundamentals of Physcs - Haliday, Resnick and Walker\n\n7.Electricity & Magnetism - K.K Tewari\n\n8.Elementary Solid State Physics -M Ali Omar"
            },
            {
                "code": "PHY1212",
                "title": "Physics II Lab",
                "category": "Basic Sciences",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "PHY1103",
                "topics": "Laboratory Works based on PHY161 and PHY 1031.\n\nReference Book(s):\n\n1. Practical Physics -Dr. Giasuddin. 2. Practical Physics -C.L Arora.",
                "recommendedBooks": "Physics Laboratory Manual, Southeast University."
            }
        ]
    },
    {
        "semesterNumber": 3,
        "name": "3rd Semester",
        "year": 1,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE1303",
                "title": "Object Oriented Programming",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1201",
                "topics": "Introduction to OOP, OOP in Java, Object, Classes, Methods, Variables, Operators, Expressions, Statements and Blocks, Control Statements, Strings, Arrays, Inheritance, Package, Interface, Exceptions, I/O, AWT, Swing, Database using JDBC, String Handling, Threads, Events, Applets, Images, Project Work."
            },
            {
                "code": "CSE1304",
                "title": "Object Oriented Programming Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE1202",
                "topics": "Laboratory Work based on Theory Course CSE281",
                "recommendedBooks": "Cay S. Horstmann, Core Java Volume I - Fundamentals, Prentice Hall."
            },
            {
                "code": "CSE1307",
                "title": "Discrete Mathematics",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1201",
                "topics": "Propositional equivalence, predicate, quantifiers, methods of proof, sets, functions, growth of functions, complexity of algorithms, integers and divisions, number theory & its applications, matrices, proof strategy, mathematical induction, recursive definitions, basic counting techniques, Pigeonhole principle, permutations and combinations, binomial coefficients, generating permutations and combinations, discrete probability, probability theory, recurrence relations, divide-and-conquer algorithm, generating functions, relations, n-ary relations and their applications, closures of relations, equivalent relations, partial ordering, graphs and graph models, connectivity, graph coloring, trees, application of tree and tree traversal."
            },
            {
                "code": "EEE1101",
                "title": "Electrical Circuits I",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Units, DC sources, Resistance and Conductance, Ohm’s law, Power and Energy, Series and parallel circuits, Series-Parallel Networks; Methods of analysis: Mesh analysis, Node analysis and other methods of analysis; Kirchhoff’s laws, Y-delta transformation; Circuit theorems: Superposition Theorem, Norton’s Theorem, Thevenin’s Theorem, Millman’s Theorem, Capacitors, Magnetic circuits, Inductors, R-C and R-L circuits with DC excitation."
            },
            {
                "code": "EEE1102",
                "title": "Electrical Circuits I Lab",
                "category": "Engineering",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Laboratory Works based on Theory Course EEE181",
                "recommendedBooks": "Electric Circuits Lab Manual, Southeast University."
            },
            {
                "code": "MAT2121",
                "title": "Linear Algebra and Vector Analysis",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT1303",
                "topics": "Transformation of coordinates, Straight lines,Parallel lines,Perpendicular lines, Number line, Interval Notation, Rational Equation, Absolute Value Theorem, Inequality, Discriminate, Asymptotes, Symmetricity, Matrix Application, Division Algorithm and Synthetic Division.\n\nDefinition of matrix, different types of matrices, algebra of matrices, adjoint and inverse of a matrix, elementary transformations of a matrix, matrix polynomials, canonical forms, Rank of matrices. System of linear equations (homogeneous and nonhomogeneous) and their solutions. Applications of system linear equations in real life problems. Definition and properties of vector space, subspaces, Linear combination of vectors, Linear dependence and independence of vectors, basis and dimension, linear transformations ,kernel and image of a linear transformation(LT), definition and properties, linear operator matrix, matrix representation of linear transformations, change of basis, Eigenvalues and eigenvectors, Diagonalization, Cayley-Hamilton theorem and its application.",
                "recommendedBooks": "Erwin Kreyszig, Advanced Engineering Mathematics, Wiley.\nDavid C. Lay, Linear Algebra and Its Applications, Pearson."
            }
        ]
    },
    {
        "semesterNumber": 4,
        "name": "4th Semester",
        "year": 2,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE2101",
                "title": "Data Structures",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1201",
                "topics": "Elementary data types, structures, arrays, pointers; introduction to Object Oriented Programming; elementary searching: linear search, binary search; implementation and applications of stacks and queues; solving problems with recursion; binary search trees, balanced search trees; priority queue implementation with heaps; graph representation and elementary graph algorithms."
            },
            {
                "code": "CSE2102",
                "title": "Data Structures Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE1202",
                "topics": "Laboratory Work based on Theory Course CSE241",
                "recommendedBooks": "Data Structures Lab Manual, Southeast University."
            },
            {
                "code": "CSE2107",
                "title": "Numerical Methods",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT1303",
                "topics": "Representation of numeric values in Computer, arithmetic operations of floating-point numbers, precision error, bracketing and open methods of root finding, Solving system of linear equations, forward and backward differences, Taylor series, different types of interpolating polynomials, Numerical integration: Trapezoidal rule, Simpson’s rule, Runge-Kutta methods. ."
            },
            {
                "code": "EEE2305",
                "title": "Electronic Devices and Circuits",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "EEE1101",
                "topics": "Introduction to semiconductors, The p-n junction diode: p-n junctions under forward and reverse biases, The ideal diode and real diode, Load line analysis of diode circuits,graphical analysis of diode circuits,equivalent circuits and frequency response, diode applications characteristics of different types of diodes Bipolar Junction Transistors (BJT): Bipolar junction transistor-Construction and Operation, Amplifying action, Common-base (CB), Common-collector (CC) and Common-emitter (CE) configurations, Different methods of transistor biasing, Darlington pair, Load Line (AC and DC), BJTs at low frequencies."
            },
            {
                "code": "EEE2306",
                "title": "Electronic Devices and Circuits Lab",
                "category": "Engineering",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "EEE1102",
                "topics": "Laboratory Work based on EEE241\n\nTOPICS: Study on D.C. and A.C. Circuits, D.C. Motors, Induction Motor, A.C. and D.C. Generators, Single Phase and 3-Phase transformer, star-Delta Starter, rectifiers.Transistor amplifier circuit, Application of I.C’s in every day and industrial use. House wiring and layout of a factory (Electrical) etc.",
                "recommendedBooks": "Electronic Devices Lab Manual, Southeast University."
            },
            {
                "code": "ELL2115",
                "title": "Academic Writing and Presentation",
                "category": "Language",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "ELL1303",
                "topics": "Principles of academic and technical communication: Writing abstracts, literature reviews, scientific paper structures (IMRaD format), citation conventions (IEEE, APA), avoiding plagiarism. Professional correspondence, RFP responses, technical project proposals. Public speaking techniques, slide deck design, delivery dynamics, defending academic work.",
                "recommendedBooks": "Alley, The Craft of Scientific Writing, Springer.\nJohn M. Swales, Academic Writing for Graduate Students, University of Michigan Press."
            }
        ]
    },
    {
        "semesterNumber": 5,
        "name": "5th Semester",
        "year": 2,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE2103",
                "title": "Digital Logic Design",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "EEE1101",
                "topics": "Binary Systems, Boolean algebra and Logic Gates, Gate Level Minimization, Combinational Logic, Synchronous Sequential Logic, Registers and Counters, Memory and Programmable Logic."
            },
            {
                "code": "CSE2104",
                "title": "Digital Logic Design Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "EEE1102",
                "topics": "Laboratory Work based on Theory Course CSE263",
                "recommendedBooks": "Digital Electronics Lab Manual, Southeast University."
            },
            {
                "code": "CSE2201",
                "title": "Algorithm",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE2101",
                "topics": "Sorting (Insertion, Selection, Merge, Quick, Counting, Radix), Growth of Function, Divide and Conquer, Solving Recurrences, Heap, Median and Order Statistics, Hashing, Elementary Graph Algorithms, Shortest Paths, Sets and Disjoint Sets, Minimum Spanning Tree, Backtracking, Introduction to Computational Geometry, Introduction toGreedy Algorithms, Introduction to Dynamic Programming."
            },
            {
                "code": "CSE2202",
                "title": "Algorithm Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE2102",
                "topics": "Laboratory Work based on Theory Course CSE265",
                "recommendedBooks": "Introduction to Algorithms (CLRS), MIT Press."
            },
            {
                "code": "GED3111",
                "title": "Engineering Economics",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "-",
                "topics": "Definition of economics, economics and engineering, principles of economics. Introduction to various economic systems - capitalist, command and mixed economy, fundamental economic problems and mechanisms through which these problems can be solved, theory of demand and supply and their elasticities, theory of consumer behavior, cardinal and ordinal approaches of utility analysis, price determination, nature of an economic theory, applicability of economic theories to the problems of developing countries, indifference curve techniques, theory of production, production function, types of productivity, rational region of production of an engineering firm, concepts of market and market structure, cost analysis and cost function, small and large scale production, optimization, theory of distribution, use of derivatives in economics, maximization and minimization of economic functions, relationship among total, marginal and average concepts. Micro-Economics: Savings, investment, employment, national income analysis, inflation, monetary policy, fiscal policy and trade policy with reference to Bangladesh, economics and development and planning."
            },
            {
                "code": "STA3103",
                "title": "Probability and Statistics",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT2121",
                "topics": "Data and variables, central tendency, dispersion, skewness, kurtosis, probability, random variables, probability distributions, mathematical expectation and moment generating functions, joint & marginal distributions, stochastic independence, central limit theorem, concepts of Sampling & its various methods, design of an experiment & analysis of variance, concepts of estimation, methods of estimation, hypothesis testing & inference. Concepts of Sample Survey & itsvarious methods- S.R.S; St.R.S. Systematic Sampling & Multi stage Sampling. Analysis of variance- One way, Two way & Three way Classification. Design of an experiment-CRD, RBD,LSD & Fractorial Experiment. Concepts of estimation- Criteria of a good estimator, Point estimation- Method of Moment, Least square, MLE, Min. Chai-square & Bayes Estimator. Interval Estimation-Confidence Interval, Feducial interval. Large & small Sample Test of significance & Hypothesis Testing. Non-Parametric Test."
            }
        ]
    },
    {
        "semesterNumber": 6,
        "name": "6th Semester",
        "year": 2,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE2303",
                "title": "Database Management System",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1303",
                "topics": "Concept of Database Systems; Semantic Database Design: High level Conceptual Modeling, ER Model & Relational Model, ERD, Integrity Constraints, Enhanced ER (EER) Model; Relational Algebra; SQL; Relational Database Design: Concepts of FDs, Decomposition & Desirable Properties, Normalization, Algorithms for 1NF, 2NF, 3NF, BCNF, 4NF, 5NF; Other Dependencies & Normal Forms; Storage & Indexing: Storage Structures, File Organization, Heap, Indexing Methods, B+ Tree Indexing, Hash Indexing; Transaction Processing & Concurrency Control: Transaction Fundamentals, OLTP Environments, ACID Properties, Locking, Deadlock & Starvation; Database Recovery Techniques; Query Processing & Optimization; Database Security & Authorization; Enhanced Data Models for Specific Applications; Distributed Databases & Issues."
            },
            {
                "code": "CSE2304",
                "title": "Database Management System Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE1303",
                "topics": "Laboratory Works based on Theory Course CSE383",
                "recommendedBooks": "Database Systems Lab Manual, Southeast University."
            },
            {
                "code": "CSE2305",
                "title": "Computer Architecture",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE2103",
                "topics": "Fundamentals of computer design - tasks of a computer architect, technology and trends, cost and trends, measurement of performance, quantitative principles of computer design, the concepts of memory hierarchy, Instruction setprinciples - classification, memory addressing, operations, types and size of operands, encoding, study of sample instruction set architecture, pipelining - hurdles and Hazards, data hazards and control hazards, handling multi-cycle operations, instruction level parallelism (ILP) - overcoming data hazards with dynamic scheduling, reducing Brance penalties with dynamic hardware prediction, compiler support for exploiting ILP, hardware support for extracting more parallelism, Memory hierarchy design - Caches, reducing cache misses & penalty, reducing hit time, main memory, virtual memory, protection and examples of virtual memory, Storage systems - types of storage devices, Buses, I/O performance measures, reliability, availability and RAID, multiprocessors - centralized & distributed shared memory architectures, synchronization, computer arithmetic, vector processors, survey of RISC architectures and Intel 80x86."
            },
            {
                "code": "GED2311",
                "title": "Professional Ethics for Society, Environment and Sustainability",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Ethics and Professionalism: Micro & Macro Issues, Dimension of Engineering; Moral Reasoning and Code of Ethics; Right, Duty, Virtue, Self Realization Ethics, Utilitarians; Engineering as Social Experimentation, Workplace Responsibilities: Confidentiality, Conflict of Interest, Professional Right; Whistle Blowing; Academic and Research Integrity; Computer Ethics: Ethics for IT Professional and IT Users, Internet Crime; Environmental Ethics; Global Justice and International Rights; Case Studies in Professional behavior."
            },
            {
                "code": "GED3211",
                "title": "Sustainable Development and Green Technology",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Sustainable Development Goals (SDGs) and global environmental challenges. Green technology, clean energy systems (solar, wind, biomass), energy storage and smart grids. Carbon footprint assessment, lifecycle analysis (LCA), e-waste management and recycling in IT sector. Sustainable urban planning, environmental policies and regulations in Bangladesh.",
                "recommendedBooks": "Allenby, Industrial Ecology and Sustainable Engineering, Prentice Hall."
            }
        ]
    },
    {
        "semesterNumber": 7,
        "name": "7th Semester",
        "year": 3,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE3103",
                "title": "System Analysis and Design",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1303",
                "topics": "Introduction to information system (information, information system, information gathering, information sources, system analysis), data collection process (interviewing), fact finding techniques (questionnaire, joint application design (JAD)), prototyping, system design tools overview, data flow diagram, data dictionary, process specifications, E-R diagram, state diagram, variations of modeling tools (flowcharts and its variations, Nassi-Shneiderman diagram, Ferstl diagram, Hamilton-Zeldin diagram, problem analysis diagrams (PAD), system flowchart, HIPO diagrams, structure charts, variations on data flow diagram and E-R diagram), analysis models (essential model, environmental model, behavior model, user implementation model), introduction to UML (use case modeling and use case diagram, class modeling, relationship, class diagrams, object interaction - modeling sequence, collaboration diagram, state chart diagram, activity diagram, component and deployment diagram), ethical and social issues, security issues, project estimation, COCOMO model, PERT/CPM analysis, Gantt charts, cost benefit analysis, introduction to linear programming, project work\n\nSoftware Quality Concepts, Process Models, Software Requirements Analysis, Design Methodologies, Software Testing, Software Maintenance, Testing and Debugging, Modularity, Specification, Data Abstraction, Object Modeling, Design Patterns, Testing, RUP, UML, Project Work."
            },
            {
                "code": "CSE3104",
                "title": "System Analysis and Design Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE1304",
                "topics": "Laboratory experiments based on CSE3103: Requirement gathering, creating Software Requirement Specification (SRS) documents. Modeling system structure and behavior with UML tools: Use Case diagrams, Class diagrams, Sequence diagrams, Activity diagrams, State Machine diagrams. Designing UI wireframes and database schemas.",
                "recommendedBooks": "Systems Analysis & Design Lab Manual, Southeast University."
            },
            {
                "code": "CSE3205",
                "title": "Data Communication",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Overview of communication systems: Basic principles, fundamental elements, system limitations. Noise: Source, characteristics of various types of noise, Information theory: Measure of information, source encoding, channel capacity, Communication systems: Analog and digital. amplitude modulation- introduction, double side band, single side band, vestigial side band, quadrature; envelope and synchronous detection; angle modulation- frequency modulation (FM) and phase modulation (PM), demodulation of FM and PM. Pulse modulation: Sampling- sampling theorem, Nyquist criterion, pulse code modulation (PCM), differential PCM, demodulation of PCM; delta modulation (DM)- principle, adaptive DM;Digital modulation: Amplitude-shift keying- principle, ON-OFF keying, bandwidth requirements, detection, noise performance; phase-shift keying (PSK)- principle, bandwidth requirements, detection, differential PSK, Quadrature PSK, noise performance; frequency-shift keying (FSK)- principle, continuous and discontinuous phase FSK, minimum-shift keying, bandwidth requirements, detection of FSK. Multiplexing: Time-division multiplexing (TDM), frequency-division multiplexing (FDM), multiple-access network- time-division multiple-access (TDMA), frequency-division multiple access (FDMA); code-division multiple-access (CDMA). Communication system design: design parameters, channel selection criteria and performance simulation."
            },
            {
                "code": "CSE3207",
                "title": "Theory of Computing",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE2201",
                "topics": "Formal proofs, finite automata, DFA/NFA and their equivalence, properties of regular languages, minimizing automata, regular expressions, Pumping lemma, non-regular languages, context-free grammar, Chomsky and Greibach normal forms, pushdown automata, non-context free languages, Turing machines, variants of Turing machines, definition of algorithms, decidable languages,\n\nUndecidability of the Halting problem, Diagonalization and reduction, time complexity, classes P, NP, NPC."
            },
            {
                "code": "GED2213",
                "title": "Information System Management",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Introduction to the components of the management information system and their integration for managerial control and decision support, major functional applications and impacts of information technology on individuals and the society, basic discussion of the environments, approaches, principles and processes of management, environmental forces, planning, organizing and control processes, motivation, teamwork, group dynamics and leadership in business and non-business organizations.",
                "recommendedBooks": "Kenneth C. Laudon, Jane P. Laudon, Management Information Systems: Managing the Digital Firm, Pearson."
            }
        ]
    },
    {
        "semesterNumber": 8,
        "name": "8th Semester",
        "year": 3,
        "totalCredits": 15.0,
        "courses": [
            {
                "code": "CSE3101",
                "title": "Microprocessors and Microcontrollers",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE2103",
                "topics": "Hardware and software architecture, instruction types and their formats, assembly program format, assembly process, interrupts and system services, addressing methods, high level control structure formation, use of subroutines and macros, numeric processing and string processing, concurrent processes & high level linking, disk geometry, file system and file I/O handling.\n\nIntroduction to 8-bit, 16-bit, and 32-bit microprocessor - architecture, addressing modes, instruction set, interrupts, multi-tasking and virtual memory - memory interface, bus interface, arithmetic co-processor, Micro-controllers, integrating microprocessors with interfacing chips."
            },
            {
                "code": "CSE3102",
                "title": "Microprocessors and Microcontrollers Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE2104",
                "topics": "Laboratory Works based on Theory Course CSE363",
                "recommendedBooks": "Microprocessor and Microcontroller Lab Manual, Southeast University."
            },
            {
                "code": "CSE3201",
                "title": "Operating Systems",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE2103",
                "topics": "COMPUTER SYSTEM OVERVIEW: Basic Elements; Processor Registers; Instruction Execution; Interrupts; The Memory Hierarchy; Cache Memory; I/O Communication Techniques;\n\nOPERATING SYSTEM OVERVIEW: Operating System Objectives and Functions; The Evolution of Operating Systems; Developments Leading to Modern Operating Systems; Microsoft Windows Overview; Modern UNIX Systems; Linux;\n\nPROCESS DESCRIPTION AND CONTROL: Process States; Process Description; Process Control; Execution of the Operating System; Security Issues; Linux Process Management; Security Issues\n\nSCHEDULING: Uniprocessor Scheduling: Types of Professor Scheduling, Scheduling Algorithms, Traditional UNIX Scheduling; Multiprocessor Scheduling: Granularity,Design Issues, Process Scheduling,Thread Scheduling,Real-Time Scheduling: Characteristics of Real-Time Operating Systems, Real-Time Scheduling, Deadline Scheduling,Rate Monotonic Scheduling, Priority Inversion, Linux Scheduling Assignment 1 THREADS, SMP, AND MICROKERNELS: Processes Vs.Threads:Multithreading, User-Level and Kernel-Level Threads; Symmetric Multiprocessing : Modern Multi Core Processor and Process Management and GPU architecture; Microkernels; Linux/Windows Process and Thread Management Assignment 2 CONCURRENCY: Principles of Concurrency; Mutual Exclusion; Semaphores; Monitors (Java as example); Message Passing; Classical Problems: Readers/Writers Problem, Dining Philosophers Problem, Sleeping Barber Problem; Principles of Deadlock; Deadlock Prevention; Deadlock Avoidance; Deadlock Detection; Linux Concurrency Mechanisms: Pipes, Messages, Shared Memory, Semaphores; Signals; Linux Kernel Concurrency Mechanisms: Atomic Operations, Spinlocks, Semaphores, Barriers Assignment 3 MEMORY MANAGEMENT: Memory Management Requirements; Memory Partitioning; Paging; Segmentation; Security Issues; Virtual Memory: Hardware and Control Structures, Operating System Software; Linux/Windows Memory Management Assignment 4 FILE MANAGEMENT: File Organization and Access; File Directories; File Sharing; Record Blocking; Secondary Storage Management; File System Security; UNIX File Management: File Allocation, Directories, Volume Structure, Traditional UNIX File Access Control, Access Control Lists in UNIX; LINUX Virtual File System; Windows File System; Assignment 5 COMPUTER SECURITY THREATS: Computer Security Concepts; Threats, Attacks, and Assets; Intruders; Malicious Software Overview; Viruses,Worms, and Bots; Rootkits; Assignment 6"
            },
            {
                "code": "CSE3202",
                "title": "Operating Systems Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE2103",
                "topics": "Laboratory Works based on Theory Course CSE361",
                "recommendedBooks": "Operating Systems Lab Manual, Southeast University."
            },
            {
                "code": "CSE3203",
                "title": "Software Engineering",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3103",
                "topics": "Introduction to information system (information, information system, information gathering, information sources, system analysis), data collection process (interviewing), fact finding techniques (questionnaire, joint application design (JAD)), prototyping, system design tools overview, data flow diagram, data dictionary, process specifications, E-R diagram, state diagram, variations of modeling tools (flowcharts and its variations, Nassi-Shneiderman diagram, Ferstl diagram, Hamilton-Zeldin diagram, problem analysis diagrams (PAD), system flowchart, HIPO diagrams, structure charts, variations on data flow diagram and E-R diagram), analysis models (essential model, environmental model, behavior model, user implementation model), introduction to UML (use case modeling and use case diagram, class modeling, relationship, class diagrams, object interaction - modeling sequence, collaboration diagram, state chart diagram, activity diagram, component and deployment diagram), ethical and social issues, security issues, project estimation, COCOMO model, PERT/CPM analysis, Gantt charts, cost benefit analysis, introduction to linear programming, project work\n\nSoftware Quality Concepts, Process Models, Software Requirements Analysis, Design Methodologies, Software Testing, Software Maintenance, Testing and Debugging, Modularity, Specification, Data Abstraction, Object Modeling, Design Patterns, Testing, RUP, UML, Project Work."
            },
            {
                "code": "CSE3204",
                "title": "Software Project Development Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3104",
                "topics": "Laboratory experiments based on CSE3203: Full lifecycle agile development of a software system. Team-based sprint planning, user story grooming, sprint reviews and retrospectives. Git branch management, pull requests, automated unit testing, CI/CD pipeline integration, full-stack application deployment.",
                "recommendedBooks": "Software Project Development Lab Manual, Southeast University."
            },
            {
                "code": "CSE3301",
                "title": "Artificial Intelligence",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE1303, CSE2201",
                "topics": "Searching: conventional graph searching, A*, IDA*, jump point search, local searching: hill climbing, simulated annealing, constraint satisfaction, adversarial search using minimax, knowledge representation and inference using propositional and firstorder logic and implementation using prolog, artificial neural networks."
            }
        ]
    },
    {
        "semesterNumber": 9,
        "name": "9th Semester",
        "year": 3,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "CSE3302",
                "title": "Artificial Intelligence Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE3301: Implementation of uninformed and heuristic search algorithms (BFS, DFS, Uniform Cost Search, A*, IDA*) in Python. Game search with Minimax and Alpha-Beta pruning. Constraint satisfaction problem solving (N-Queens, Sudoku). Introduction to machine learning classification with scikit-learn.",
                "recommendedBooks": "Artificial Intelligence Lab Manual, Southeast University."
            },
            {
                "code": "CSE3305",
                "title": "Computer Networking and Security",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3205",
                "topics": "Overview of OSI reference model. Topology design, Media Access Control Level, Services, Problems and protocols, Practical local area network design and implementation. IEEE LAN Standards, Logical Link Control protocols, HDLC, ALOHA, SLOTTED ALOHA, FDDI, Client Server model and related softwares.\n\nNetwork Layer level services, problems and protocols. WAN, MAN, interconnection networks related softwares, TCP/IP, Novel NetWare, Routers, Bridges and Gateways their Practical implementation aspects. X.25, Internet and related softwares.\n\nTransport layer, services, problems and their protocol.\n\nBrief functioning of upper layers, E-mail and other application.\n\nClassical Cryptography: Introduction to simple cryptosystems, Cryptanalysis; Shannon's Theory: Perfect secrecy, Entropy, Product cryptosystems; Data Encryption Standard: Description of DES, Differential cryptanalysis; RSA System and Factoring: Public-key cryptography, RSA cryptosystem, Attacks on RSA, Factroing algorithms; Other Public-key cryptosystems: ElGamal cryptosystem and discrete logs, Merkle-Hellman Knapsack System; Signature Schemes: ElGamal signature schemes, Digital signature standard, Fail-stop signatures; Hash Functions: Signatures and Hash functions, Collision-free Hash functions, Birthday attack; Key Distribution and Key Agreement: Key predistribution, Kerboros, Diffie-Hellman key exchange; Identification Schemes: Schnorr identification scheme, Okamoto identification schemes; Authentication Codes: Computing deception probabilities, Combinatorial bounds, Entropy bounds; Secret Sharing Schemes: Shamir threshold scheme, Access structure and general secret sharing; Pseudo-random Number Generation: Indistinguishable probability distribution, probabilistic encryption; Zero-knowledge proofs: Interactive proof systems, computational Zero-knowledge proofs.",
                "recommendedBooks": "James F. Kurose, Keith W. Ross, Computer Networking: A Top-Down Approach, Pearson.\nWilliam Stallings, Cryptography and Network Security: Principles and Practice, Pearson."
            },
            {
                "code": "CSE3306",
                "title": "Computer Networking and Security Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3205",
                "topics": "Laboratory Works based on Theory Course CSE341",
                "recommendedBooks": "Computer Networking and Security Lab Manual, Southeast University."
            },
            {
                "code": "CSE3310",
                "title": "Web Development Project Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3204",
                "topics": "Modern full-stack web application development: Semantic HTML5, CSS3, responsive layouts, Tailwind CSS. Modern JavaScript (ES6+), TypeScript, React/Next.js frontend framework, state management, RESTful APIs, Node.js/Express and Spring Boot backend integration, ORM/Prisma/Hibernate, database integration, authentication (JWT, OAuth), secure deployment on Vercel/Docker.",
                "recommendedBooks": "Web Development Project Lab Manual, Southeast University."
            },
            {
                "code": "CSE4111",
                "title": "Machine Learning",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Machine learning fundamentals: Supervised learning, linear regression, polynomial regression, logistic regression, gradient descent algorithms. Decision trees, random forests, boosting (AdaBoost, XGBoost). Support vector machines (SVM), kernel methods. Unsupervised learning: K-means clustering, hierarchical clustering, principal component analysis (PCA). Model validation, bias-variance tradeoff, cross-validation, regularization (L1/L2).",
                "recommendedBooks": "Tom M. Mitchell, Machine Learning, McGraw-Hill.\nAurélien Géron, Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow, O'Reilly."
            },
            {
                "code": "CSE4112",
                "title": "Machine Learning Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4111: Data preprocessing, feature scaling, encoding, model training and evaluation in Python using NumPy, Pandas, Scikit-learn, and Matplotlib. Implementing regression, classification, clustering, dimensionality reduction pipelines, and hyperparameter tuning.",
                "recommendedBooks": "Machine Learning Lab Manual, Southeast University."
            },
            {
                "code": "GED3311",
                "title": "ICT Entrepreneurship and Commercialization",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Entrepreneurship concepts and entrepreneurial mindset. Opportunity recognition, customer discovery, market analysis, business model generation (Business Model Canvas). Tech product development, MVP design, intellectual property rights (patents, copyrights, trademarks). Financial planning, startup funding (bootstrapping, angel investors, venture capital), pitching to investors and scaling.",
                "recommendedBooks": "Eric Ries, The Lean Startup, Crown Business.\nAlexander Osterwalder, Business Model Generation, Wiley."
            }
        ]
    },
    {
        "semesterNumber": 10,
        "name": "10th Semester",
        "year": 4,
        "totalCredits": 9.0,
        "courses": [
            {
                "code": "CSE4098",
                "title": "Final Year Design Project-I",
                "category": "Final Year Project",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "CSE2304, CSE2303, STA3103, CSE2202, CSE2201, CSE3101, CSE3201, CSE3301, CSE3203, CSE3305",
                "topics": "Capstone Final Year Design Project Part I: Problem identification, feasibility study, comprehensive literature review, requirement engineering, preliminary architecture and design specification. Defense of initial prototype and project proposal before faculty review committee.",
                "recommendedBooks": "Guidelines for Final Year Design Project, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            }
        ]
    },
    {
        "semesterNumber": 11,
        "name": "11th Semester",
        "year": 4,
        "totalCredits": 9.0,
        "courses": [
            {
                "code": "CSE4198",
                "title": "Final Year Design Project-II",
                "category": "Final Year Project",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "CSE4098",
                "topics": "Capstone Final Year Design Project Part II: Detailed engineering design, system implementation, integration of hardware and software components, test plan execution, verification and validation. Mid-term progress review and technical report submission.",
                "recommendedBooks": "Guidelines for Final Year Design Project, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4499",
                "title": "Internship",
                "category": "Internship",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "-",
                "topics": "Industrial internship at an approved IT software firm, telecommunication company, or corporate enterprise for 12 weeks. Practical exposure to professional industry workflows, codebases, collaboration practices, agile methodology, client deliverables, and workplace ethics. Comprehensive internship report and defense.",
                "recommendedBooks": "Internship Handbook, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE4XXX",
                "title": "Major Course",
                "category": "Major",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Specialized Major Course chosen from one of the four approved academic tracks: Software Engineering, Network & Systems, Cyber Security, or Artificial Intelligence & Data Science.",
                "recommendedBooks": "Academic Track Handbook, Dept. of CSE, Southeast University."
            }
        ]
    },
    {
        "semesterNumber": 12,
        "name": "12th Semester",
        "year": 4,
        "totalCredits": 2.0,
        "courses": [
            {
                "code": "CSE4298",
                "title": "Final Year Design Project-III",
                "category": "Final Year Project",
                "prototype": "Theory",
                "credits": 2.0,
                "prerequisite": "CSE4198",
                "topics": "Capstone Final Year Design Project Part III: Final testing, performance evaluation, security assessment, complete project documentation, user manual preparation, peer review. Final oral defense and demonstration before board of examiners, research paper draft.",
                "recommendedBooks": "Guidelines for Final Year Design Project, Dept. of CSE, Southeast University."
            }
        ]
    }
],
  majorTracks: [
    {
        "id": "track_se",
        "title": "Software Engineering",
        "requiredCredits": 12.0,
        "courses": [
            {
                "code": "CSE4161",
                "title": "Human Computer Interaction",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Human-computer interaction principles: User-centered design (UCD), mental models, Norman's principles of design, affordances, signifiers, feedback. Usability heuristics (Nielsen Norman). User research methods: Interviews, surveys, contextual inquiries, personas, journey maps. Wireframing, low/high-fidelity prototyping in Figma. Usability testing, cognitive walkthroughs, accessibility (WCAG 2.1), inclusive design.",
                "recommendedBooks": "Alan Dix, Human-Computer Interaction, Pearson.\nDon Norman, The Design of Everyday Things, Basic Books."
            },
            {
                "code": "CSE4162",
                "title": "Human Computer Interaction Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4161: Conducting user research, creating user personas and empathy maps. Designing interactive wireframes and components in Figma. Conducting moderated usability testing sessions and calculating usability metrics (SUS score).",
                "recommendedBooks": "HCI Lab Manual, Southeast University."
            },
            {
                "code": "CSE4163",
                "title": "Software Architecture and Design Patterns",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Software architecture principles and design patterns: Architectural quality attributes, architectural styles (layered, event-driven, microservices, service-oriented, pipe-and-filter). Gang of Four (GoF) design patterns: Creational (Singleton, Factory Method, Abstract Factory, Builder), Structural (Adapter, Bridge, Composite, Decorator, Facade, Proxy), Behavioral (Observer, Strategy, Command, State, Template Method). Architectural documentation, anti-patterns, refactoring.",
                "recommendedBooks": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, Addison-Wesley.\nLen Bass, Paul Clements, Rick Kazman, Software Architecture in Practice, Addison-Wesley."
            },
            {
                "code": "CSE4164",
                "title": "Software Architecture and Design Patterns Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4163: Implementing design patterns in Java/TypeScript. Refactoring monolithic codebases into modular microservices architectures, event-driven message bus integration (RabbitMQ/Kafka), design pattern validation in real-world systems.",
                "recommendedBooks": "Software Architecture Lab Manual, Southeast University."
            },
            {
                "code": "CSE4165",
                "title": "Software Testing and Quality Assurance",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Software testing principles and quality engineering: Verification and validation, testing levels (unit, integration, system, acceptance). Black-box test design techniques (equivalence partitioning, boundary value analysis, decision table testing). White-box test design techniques (statement coverage, branch coverage, path coverage, cyclomatic complexity). Automated testing frameworks (JUnit, TestNG, Selenium, Cypress). Performance testing with JMeter. Software quality models (ISO/IEC 25010), static code analysis with SonarQube, defect lifecycle management.",
                "recommendedBooks": "Paul C. Jorgensen, Software Testing: A Craftsman's Approach, CRC Press."
            },
            {
                "code": "CSE4166",
                "title": "Software Testing and Quality Assurance Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4165: Writing automated unit tests with JUnit/Jest, UI test automation with Selenium/Playwright, API testing with Postman/Newman, load testing with Apache JMeter, static code analysis and quality gate enforcement with SonarQube in a CI/CD pipeline.",
                "recommendedBooks": "Software Testing Lab Manual, Southeast University."
            },
            {
                "code": "CSE4167",
                "title": "Game Design and Development",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Game design theory: Game mechanics, dynamics, aesthetics (MDA framework). Core game loops, storytelling, level design. 2D and 3D game engines (Unity / Unreal Engine). Physics simulation: Rigid bodies, colliders, raycasting, gravity. Game AI: Finite state machines, pathfinding (NavMesh, A*), behavior trees. Audio engineering, animation state machines, particle systems, optimization for cross-platform deployment.",
                "recommendedBooks": "Jesse Schell, The Art of Game Design: A Book of Lenses, CRC Press."
            },
            {
                "code": "CSE4168",
                "title": "Game Design and Development Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4167: Building 2D and 3D games in Unity using C#. Implementing player movement, physics collisions, game UI, enemy AI pathfinding, particle effects, sound effects, and publishing a playable game build.",
                "recommendedBooks": "Game Design Lab Manual, Southeast University."
            },
            {
                "code": "CSE4169",
                "title": "Software Requirement Engineering",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Software requirement engineering lifecycle: Requirement elicitation techniques (stakeholder interviews, JAD sessions, observation, questionnaires). Requirement analysis and modeling: Use cases, user stories, acceptance criteria, context diagrams. Specifying functional and non-functional requirements (performance, security, scalability, usability). IEEE 830 / ISO 29148 standards for SRS. Requirement validation, traceability matrix, requirement change management.",
                "recommendedBooks": "Karl Wiegers, Joy Beatty, Software Requirements, Microsoft Press."
            },
            {
                "code": "CSE4170",
                "title": "Software Requirement Engineering Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4169: Developing comprehensive Software Requirements Specification (SRS) documents following IEEE 830 standards. Writing user stories with Gherkin syntax (Given-When-Then). Building traceability matrices and managing requirements with Jira.",
                "recommendedBooks": "Requirement Engineering Lab Manual, Southeast University."
            },
            {
                "code": "CSE4261",
                "title": "Software Project Management",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Software project management principles: Project initiation, scope definition, work breakdown structure (WBS). Effort and cost estimation: COCOMO II, function point analysis, planning poker. Project scheduling: PERT, CPM, Gantt charts, critical path calculation. Risk management in software projects: Risk identification, mitigation, contingency planning. Agile project management: Scrum framework (roles, events, artifacts), Kanban, Lean. Team dynamics, resource allocation, project monitoring (EVM).",
                "recommendedBooks": "Bob Hughes, Mike Cotterell, Rajib Mall, Software Project Management, McGraw-Hill."
            },
            {
                "code": "CSE4262",
                "title": "Software Project Management Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4261: Software project planning using Microsoft Project and Jira. Building work breakdown structures, estimating story points, defining sprints, tracking sprint burndown charts, conducting risk analysis matrices.",
                "recommendedBooks": "Project Management Lab Manual, Southeast University."
            },
            {
                "code": "CSE4211",
                "title": "Digital Image Processing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Digital image fundamentals, perceptions, representation, image transforms - Fast Fourier Transform (FFT), Discrete Cosine Transforms (DCT), Karhunen and Loeve Transforms (KLT), Wavelet transform and sub-band decomposition, image enhancement and restoration techniques, image compression techniques, image compression standards - JPEG, MPEG, H.261, H.263"
            },
            {
                "code": "CSE4212",
                "title": "Digital Image Processing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4211: Image processing operations in Python using OpenCV. Spatial domain filtering (smoothing, sharpening), frequency domain Fourier transforms, edge detection (Sobel, Canny), morphological operations (dilation, erosion), thresholding, segmentation.",
                "recommendedBooks": "Digital Image Processing Lab Manual, Southeast University."
            },
            {
                "code": "CSE4263",
                "title": "Compiler Design",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Lexical analysis, parsing (LL, LR parsers), syntax directed translation, intermediate code generation, error detection and recovery, design and implementation of lexical analyzers and parsers using tools like flex and bison."
            },
            {
                "code": "CSE4264",
                "title": "Compiler Design Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4263: Writing lexical analyzers with Lex/Flex, building syntax parsers using Yacc/Bison. Constructing abstract syntax trees (AST), symbol table management, type checking, generating intermediate code (three-address code), and basic code optimization.",
                "recommendedBooks": "Compiler Design Lab Manual, Southeast University."
            },
            {
                "code": "CSE4265",
                "title": "Applied Software Engineering with Modern Frameworks",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Applied modern software engineering: Microservices architecture, domain-driven design (DDD). Modern backend frameworks: Spring Boot, Node.js/NestJS, FastAPI. Modern frontend frameworks: React, Next.js, Angular. RESTful API design standards, GraphQL. Object-Relational Mapping (ORM/Hibernate/Prisma). Asynchronous message brokers (RabbitMQ, Apache Kafka). Containerization with Docker, CI/CD pipelines (GitHub Actions), Twelve-Factor App methodology.",
                "recommendedBooks": "Martin Fowler, Patterns of Enterprise Application Architecture, Addison-Wesley.\nSam Newman, Building Microservices, O'Reilly."
            },
            {
                "code": "CSE4266",
                "title": "Applied Software Engineering with Modern Frameworks Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3103, CSE3104",
                "topics": "Laboratory experiments based on CSE4265: Developing an enterprise-grade full-stack application. Designing RESTful and GraphQL APIs, integrating Docker containers, implementing JWT authentication, automated testing with GitHub Actions CI/CD pipeline, production deployment.",
                "recommendedBooks": "Applied Software Engineering Lab Manual, Southeast University."
            }
        ]
    },
    {
        "id": "track_cyber",
        "title": "Cyber Security",
        "requiredCredits": 12.0,
        "courses": [
            {
                "code": "CSE4131",
                "title": "Managing Risk in Information Security",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Risk management frameworks: NIST SP 800-30, ISO/IEC 27005. Risk assessment methodology, threat identification, asset valuation, vulnerability analysis. Risk evaluation, risk treatment strategies (mitigation, transfer, acceptance, avoidance). Security controls, residual risk analysis, business impact analysis (BIA), disaster recovery and business continuity planning (BCP).",
                "recommendedBooks": "Harold F. Tipton, Information Security Management Handbook, CRC Press."
            },
            {
                "code": "CSE4132",
                "title": "Managing Risk in Information Security Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4131: Conducting qualitative and quantitative risk assessments. Creating risk registers, evaluating threat scenarios, configuring security baseline policies, conducting business continuity simulations.",
                "recommendedBooks": "Risk Management Lab Manual, Southeast University."
            },
            {
                "code": "CSE4133",
                "title": "Digital Forensic",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Digital forensics concepts and evidence handling: Legal procedures, chain of custody, evidence preservation. Disk imaging, file system forensics (FAT, NTFS, ext4), metadata analysis, deleted file recovery. Memory forensics: Volatility framework, detecting in-memory malware. Network forensics, log analysis (Syslog, Event Viewer, SIEM). Mobile device forensics, anti-forensics countermeasures.",
                "recommendedBooks": "Bill Nelson, Amelia Phillips, Christopher Steuart, Guide to Computer Forensics and Investigations, Cengage."
            },
            {
                "code": "CSE4134",
                "title": "Digital Forensic Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4133: Creating forensic disk images using FTK Imager and dd. Carving deleted files using Autopsy. Analyzing volatile RAM dumps with Volatility framework. Inspecting network packet captures with Wireshark and NetworkMiner.",
                "recommendedBooks": "Digital Forensics Lab Manual, Southeast University."
            },
            {
                "code": "CSE4135",
                "title": "Information Systems Audit and Assurance",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "IS audit process and professional standards (ISACA CISA framework). Control objectives, COBIT, COSO frameworks. IT governance, enterprise risk management. Audit planning, gathering evidence, sampling techniques, testing internal controls. General controls and application controls audit. Continuous auditing, compliance reporting, audit trail analysis.",
                "recommendedBooks": "CISA Review Manual, ISACA."
            },
            {
                "code": "CSE4136",
                "title": "Information Systems Audit and Assurance Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4135: Conducting security and compliance audits of operating systems, databases, and network devices. Reviewing access controls, password policies, audit logs, configuration baselines.",
                "recommendedBooks": "IS Audit Lab Manual, Southeast University."
            },
            {
                "code": "CSE4137",
                "title": "Web Application Security",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Web application security architecture: OWASP Top 10 vulnerabilities in depth (Injection, Broken Authentication, Sensitive Data Exposure, XML External Entities, Broken Access Control, Security Misconfiguration, Cross-Site Scripting, Insecure Deserialization, Using Components with Known Vulnerabilities, Insufficient Logging). Client-side security (CORS, CSP, SameSite cookies). Secure session management, secure coding standards.",
                "recommendedBooks": "Peter Yaworski, Real-World Bug Hunting, No Starch Press.\nAndrew Hoffman, Web Application Security, O'Reilly."
            },
            {
                "code": "CSE4138",
                "title": "Web Application Security Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4137: Hands-on testing on deliberately vulnerable web apps (DVWA, OWASP WebGoat, Juice Shop). Intercepting HTTP requests with Burp Suite, crafting SQL injection payloads, exploiting XSS and CSRF, testing authorization bypasses, automating vulnerability discovery.",
                "recommendedBooks": "Web Application Security Lab Manual, Southeast University."
            },
            {
                "code": "CSE4231",
                "title": "Ethical Hacking",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Ethical hacking principles and cyber security assessment: Information security fundamentals, hacker methodologies, legal frameworks and compliance. Footprinting and reconnaissance (OSINT, DNS, WHOIS). Network scanning, port scanning, vulnerability scanning with Nessus. System hacking: Password cracking, privilege escalation, trojans, rootkits, keyloggers. Web application vulnerabilities: OWASP Top 10, SQL injection, XSS, CSRF, directory traversal. Wireless network security, social engineering, denial of service (DoS/DDoS) attacks, penetration testing reporting.",
                "recommendedBooks": "CEH Certified Ethical Hacker Study Guide, Sybex / Wiley."
            },
            {
                "code": "CSE4232",
                "title": "Ethical Hacking Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4231: Hands-on penetration testing in virtualized lab environments (Kali Linux, Metasploitable). Port scanning with Nmap, vulnerability assessment, exploitation using Metasploit Framework, SQL injection and XSS exploitation using Burp Suite, Wi-Fi auditing with Aircrack-ng.",
                "recommendedBooks": "Ethical Hacking Lab Manual, Southeast University."
            },
            {
                "code": "CSE4233",
                "title": "Cryptography and Network Security",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Classical Cryptography: Introduction to simple cryptosystems, Cryptanalysis; Shannon's Theory: Perfect secrecy, Entropy, Product cryptosystems; Data Encryption Standard: Description of DES, Differential cryptanalysis; RSA System and Factoring: Public-key cryptography, RSA cryptosystem, Attacks on RSA, Factroing algorithms; Other Public-key cryptosystems: ElGamal cryptosystem and discrete logs, Merkle-Hellman Knapsack System; Signature Schemes: ElGamal signature schemes, Digital signature standard, Fail-stop signatures; Hash Functions: Signatures and Hash functions, Collision-free Hash functions, Birthday attack; Key Distribution and Key Agreement: Key predistribution, Kerboros, Diffie-Hellman key exchange; Identification Schemes: Schnorr identification scheme, Okamoto identification schemes; Authentication Codes: Computing deception probabilities, Combinatorial bounds, Entropy bounds; Secret Sharing Schemes: Shamir threshold scheme, Access structure and general secret sharing; Pseudo-random Number Generation: Indistinguishable probability distribution, probabilistic encryption; Zero-knowledge proofs: Interactive proof systems, computational Zero-knowledge proofs.",
                "recommendedBooks": "William Stallings, Cryptography and Network Security: Principles and Practice, Pearson."
            },
            {
                "code": "CSE4234",
                "title": "Cryptography and Network Security Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4233: Implementing cryptographic algorithms (Caesar, Playfair, DES, AES, RSA) in Python/C++. Key generation, encryption, decryption, digital signing. Wireshark SSL/TLS handshake analysis. Configuring firewalls (iptables/UFW), Snort IDS rule development.",
                "recommendedBooks": "Cryptography Lab Manual, Southeast University."
            },
            {
                "code": "CSE4211",
                "title": "Digital Image Processing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Digital image fundamentals, perceptions, representation, image transforms - Fast Fourier Transform (FFT), Discrete Cosine Transforms (DCT), Karhunen and Loeve Transforms (KLT), Wavelet transform and sub-band decomposition, image enhancement and restoration techniques, image compression techniques, image compression standards - JPEG, MPEG, H.261, H.263"
            },
            {
                "code": "CSE4212",
                "title": "Digital Image Processing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4211: Image processing operations in Python using OpenCV. Spatial domain filtering (smoothing, sharpening), frequency domain Fourier transforms, edge detection (Sobel, Canny), morphological operations (dilation, erosion), thresholding, segmentation.",
                "recommendedBooks": "Digital Image Processing Lab Manual, Southeast University."
            }
        ]
    },
    {
        "id": "track_ai_ds",
        "title": "Artificial Intelligence and Data Science",
        "requiredCredits": 12.0,
        "courses": [
            {
                "code": "CSE4113",
                "title": "Natural Language Processing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Natural language processing foundations: Text preprocessing, tokenization, stemming, lemmatization, stop words, regular expressions. Language models: N-grams, perplexity. Part-of-speech tagging, named entity recognition (NER). Word representation: Bag-of-words, TF-IDF, Word2Vec, GloVe embeddings. Sequence modeling: Recurrent neural networks (RNN), LSTM, GRU. Transformer architecture, self-attention, BERT, GPT overview. Sentiment analysis, machine translation, text classification.",
                "recommendedBooks": "Daniel Jurafsky, James H. Martin, Speech and Language Processing, Pearson."
            },
            {
                "code": "CSE4114",
                "title": "Natural Language Processing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4113: Text processing with NLTK and SpaCy in Python. Building TF-IDF text classifiers, training Word2Vec embeddings with Gensim, sequence labeling with PyTorch, fine-tuning HuggingFace Transformers for sentiment analysis and text summarization.",
                "recommendedBooks": "NLP Lab Manual, Southeast University."
            },
            {
                "code": "CSE4117",
                "title": "Introduction to Bioinformatics",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Molecular biology fundamentals for computer scientists: DNA, RNA, proteins, central dogma. Sequence alignment algorithms: Pairwise alignment (Needleman-Wunsch, Smith-Waterman), heuristic search (BLAST, FASTA). Multiple sequence alignment (ClustalW). Phylogenetic trees, protein structure prediction, gene finding algorithms, hidden Markov models (HMMs) in genomics.",
                "recommendedBooks": "Neil C. Jones, Pavel A. Pevzner, An Introduction to Bioinformatics Algorithms, MIT Press."
            },
            {
                "code": "CSE4118",
                "title": "Introduction to Bioinformatics Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4117: Computational bioinformatics in Python and Biopython. Accessing NCBI databases, executing pairwise and multiple sequence alignments, constructing phylogenetic trees, protein 3D structure visualization with PyMOL, gene annotation.",
                "recommendedBooks": "Bioinformatics Lab Manual, Southeast University."
            },
            {
                "code": "CSE4153",
                "title": "Data Analytics",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Data analytics lifecycle: Data collection, data cleaning, exploratory data analysis (EDA), statistical inference. Data visualization techniques, dashboard design. Predictive modeling: Regression, time series forecasting (ARIMA, Prophet). Prescriptive analytics, A/B testing, hypothesis testing, causal inference in decision making.",
                "recommendedBooks": "Wes McKinney, Python for Data Analysis, O'Reilly."
            },
            {
                "code": "CSE4154",
                "title": "Data Analytics Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4153: Exploratory data analysis with Python (Pandas, NumPy, Seaborn). Building interactive analytical dashboards with Power BI / Tableau / Streamlit. Performing A/B test statistical analysis and predictive modeling.",
                "recommendedBooks": "Data Analytics Lab Manual, Southeast University."
            },
            {
                "code": "CSE4155",
                "title": "Big Data",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Big data characteristics (Volume, Velocity, Variety, Veracity). Distributed storage and computing architectures: Hadoop Distributed File System (HDFS), MapReduce paradigm. Apache Spark ecosystem: Spark Core, RDDs, DataFrames, Spark SQL, Spark Streaming. NoSQL databases: Key-value, document (MongoDB), column-family (Cassandra), graph databases (Neo4j). Cloud big data services (Google BigQuery, AWS EMR).",
                "recommendedBooks": "Holden Karau, Andy Konwinski, Learning Spark, O'Reilly.\nTom White, Hadoop: The Definitive Guide, O'Reilly."
            },
            {
                "code": "CSE4156",
                "title": "Big Data Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4155: Deploying single-node and multi-node Hadoop clusters. Writing MapReduce programs. Developing distributed data processing pipelines using PySpark. Querying data with Spark SQL, performing aggregations and streaming transformations.",
                "recommendedBooks": "Big Data Lab Manual, Southeast University."
            },
            {
                "code": "CSE4211",
                "title": "Digital Image Processing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Digital image fundamentals, perceptions, representation, image transforms - Fast Fourier Transform (FFT), Discrete Cosine Transforms (DCT), Karhunen and Loeve Transforms (KLT), Wavelet transform and sub-band decomposition, image enhancement and restoration techniques, image compression techniques, image compression standards - JPEG, MPEG, H.261, H.263"
            },
            {
                "code": "CSE4212",
                "title": "Digital Image Processing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4211: Image processing operations in Python using OpenCV. Spatial domain filtering (smoothing, sharpening), frequency domain Fourier transforms, edge detection (Sobel, Canny), morphological operations (dilation, erosion), thresholding, segmentation.",
                "recommendedBooks": "Digital Image Processing Lab Manual, Southeast University."
            },
            {
                "code": "CSE4213",
                "title": "Deep Learning",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301",
                "topics": "Deep learning architectures and theory: Feedforward neural networks, activation functions, loss functions, backpropagation algorithm. Optimization: SGD, Adam, RMSprop, learning rate schedules. Convolutional neural networks (CNN): Convolutions, pooling, architectures (AlexNet, VGG, ResNet). Recurrent neural networks: LSTM, GRU, seq2seq models. Attention mechanism, Transformers. Generative models: Autoencoders, VAEs, GANs. Deep reinforcement learning concepts.",
                "recommendedBooks": "Ian Goodfellow, Yoshua Bengio, Aaron Courville, Deep Learning, MIT Press."
            },
            {
                "code": "CSE4214",
                "title": "Deep Learning Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301",
                "topics": "Laboratory experiments based on CSE4213: Building and training deep learning models using PyTorch / TensorFlow. Image classification with custom CNNs and transfer learning (ResNet), object detection with YOLO, sequence modeling with LSTMs, implementing Transformer attention blocks.",
                "recommendedBooks": "Deep Learning Lab Manual, Southeast University."
            }
        ]
    },
    {
        "id": "track_network",
        "title": "Networking",
        "requiredCredits": 12.0,
        "courses": [
            {
                "code": "CSE4171",
                "title": "Advanced Networking",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Advanced networking principles: Next-generation Internet protocols, IPv6 architecture and migration strategies. Advanced routing protocols (BGP-4, OSPF multi-area, IS-IS). Software-Defined Networking (SDN): OpenFlow protocol, SDN controllers (ONOS, OpenDaylight). Network Function Virtualization (NFV). Quality of Service (QoS): Traffic shaping, policing, DiffServ, IntServ. High-availability network design, MPLS.",
                "recommendedBooks": "W. Richard Stevens, TCP/IP Illustrated, Volume 1, Addison-Wesley."
            },
            {
                "code": "CSE4172",
                "title": "Advanced Networking Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4171: Advanced routing simulations in GNS3 / Cisco Packet Tracer: BGP peering, multi-area OSPF, MPLS VPNs. Setting up Mininet SDN topologies and writing POX/Ryu controller applications to manage OpenFlow switches.",
                "recommendedBooks": "Advanced Networking Lab Manual, Southeast University."
            },
            {
                "code": "CSE4173",
                "title": "Graph Theory",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Dominating sets, the reconstruction problem, intersection graphs, perfect graphs, random graphs, Chordal graphs. Famous problems in Graph Theory include: Minimum Connector Problem, Marriage Problem, the Assignment Problem, the Network Flow Problem, the Committee Scheduling Problem, the Four Color Problem, the Traveling Salesman, Transportation and Transshipment Problem, etc."
            },
            {
                "code": "CSE4174",
                "title": "Graph Theory Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4173: Graph representation, implementation of graph traversal algorithms, minimum spanning tree (Kruskal, Prim), shortest path algorithms, network maximum flow (Ford-Fulkerson), graph coloring algorithms, and clique detection in Python/NetworkX.",
                "recommendedBooks": "Graph Theory Lab Manual, Southeast University."
            },
            {
                "code": "CSE4177",
                "title": "Wireless and Cellular Communication",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Wireless communication principles: Radio wave propagation, free-space path loss, fading channels, multipath propagation. Cellular concepts: Frequency reuse, handoff strategies, cell sectoring, co-channel interference. Multiple access techniques: TDMA, CDMA, OFDMA. Evolution of cellular generations: 2G/3G, 4G LTE architecture (EPC, eNodeB), 5G NR architecture (Massive MIMO, beamforming, network slicing). Wireless LANs: IEEE 802.11 standards, Bluetooth, Zigbee.",
                "recommendedBooks": "Theodore S. Rappaport, Wireless Communications: Principles and Practice, Prentice Hall."
            },
            {
                "code": "CSE4178",
                "title": "Wireless and Cellular Communication Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4177: Wireless network simulations using NS-3 and MATLAB. Analyzing path loss models, wireless link budget calculation, simulating cellular handoff, configuring 802.11 WLAN topologies, evaluating throughput and packet loss.",
                "recommendedBooks": "Wireless Communication Lab Manual, Southeast University."
            },
            {
                "code": "CSE4179",
                "title": "Cloud Computing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "PREREQUISITE(S): CSE361\n\nIntro to Clouds, Software as a service (SaaS), Platform as a serivce (PaaS), Infrasturcture as a Service, MapReduce, Gossip, Membership, Grids, P2P Systems, Key ValueStores, Time and Ordering, Snapshots, Multicast, Paxos, Leader Election, Mutual Exclusion, Concurrency Control, Replication Control, Stream Processing, Graph Processing, Structure of Networks, Scheduling,Distributed File Systems, Distributed Shared Memory, Sensor Networks, Security, Data-center Outage Studies, Cloud computing service deployment and maintenance."
            },
            {
                "code": "CSE4180",
                "title": "Cloud Computing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4179: Cloud infrastructure deployment on AWS and Google Cloud Platform. Setting up EC2/Compute Engine instances, VPC networking, S3/Cloud Storage. Containerization with Docker, deploying multi-container applications with Docker Compose, orchestration using Kubernetes (EKS/GKE), serverless computing with AWS Lambda / Cloud Functions.",
                "recommendedBooks": "Cloud Computing Lab Manual, Southeast University."
            },
            {
                "code": "CSE4231",
                "title": "Ethical Hacking",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Ethical hacking principles and cyber security assessment: Information security fundamentals, hacker methodologies, legal frameworks and compliance. Footprinting and reconnaissance (OSINT, DNS, WHOIS). Network scanning, port scanning, vulnerability scanning with Nessus. System hacking: Password cracking, privilege escalation, trojans, rootkits, keyloggers. Web application vulnerabilities: OWASP Top 10, SQL injection, XSS, CSRF, directory traversal. Wireless network security, social engineering, denial of service (DoS/DDoS) attacks, penetration testing reporting.",
                "recommendedBooks": "CEH Certified Ethical Hacker Study Guide, Sybex / Wiley."
            },
            {
                "code": "CSE4232",
                "title": "Ethical Hacking Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4231: Hands-on penetration testing in virtualized lab environments (Kali Linux, Metasploitable). Port scanning with Nmap, vulnerability assessment, exploitation using Metasploit Framework, SQL injection and XSS exploitation using Burp Suite, Wi-Fi auditing with Aircrack-ng.",
                "recommendedBooks": "Ethical Hacking Lab Manual, Southeast University."
            },
            {
                "code": "CSE4211",
                "title": "Digital Image Processing",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Digital image fundamentals, perceptions, representation, image transforms - Fast Fourier Transform (FFT), Discrete Cosine Transforms (DCT), Karhunen and Loeve Transforms (KLT), Wavelet transform and sub-band decomposition, image enhancement and restoration techniques, image compression techniques, image compression standards - JPEG, MPEG, H.261, H.263"
            },
            {
                "code": "CSE4212",
                "title": "Digital Image Processing Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4211: Image processing operations in Python using OpenCV. Spatial domain filtering (smoothing, sharpening), frequency domain Fourier transforms, edge detection (Sobel, Canny), morphological operations (dilation, erosion), thresholding, segmentation.",
                "recommendedBooks": "Digital Image Processing Lab Manual, Southeast University."
            },
            {
                "code": "CSE4233",
                "title": "Cryptography and Network Security",
                "category": "Major Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Classical Cryptography: Introduction to simple cryptosystems, Cryptanalysis; Shannon's Theory: Perfect secrecy, Entropy, Product cryptosystems; Data Encryption Standard: Description of DES, Differential cryptanalysis; RSA System and Factoring: Public-key cryptography, RSA cryptosystem, Attacks on RSA, Factroing algorithms; Other Public-key cryptosystems: ElGamal cryptosystem and discrete logs, Merkle-Hellman Knapsack System; Signature Schemes: ElGamal signature schemes, Digital signature standard, Fail-stop signatures; Hash Functions: Signatures and Hash functions, Collision-free Hash functions, Birthday attack; Key Distribution and Key Agreement: Key predistribution, Kerboros, Diffie-Hellman key exchange; Identification Schemes: Schnorr identification scheme, Okamoto identification schemes; Authentication Codes: Computing deception probabilities, Combinatorial bounds, Entropy bounds; Secret Sharing Schemes: Shamir threshold scheme, Access structure and general secret sharing; Pseudo-random Number Generation: Indistinguishable probability distribution, probabilistic encryption; Zero-knowledge proofs: Interactive proof systems, computational Zero-knowledge proofs.",
                "recommendedBooks": "William Stallings, Cryptography and Network Security: Principles and Practice, Pearson."
            },
            {
                "code": "CSE4234",
                "title": "Cryptography and Network Security Lab",
                "category": "Major Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE3301, CSE3305, CSE3306",
                "topics": "Laboratory experiments based on CSE4233: Implementing cryptographic algorithms (Caesar, Playfair, DES, AES, RSA) in Python/C++. Key generation, encryption, decryption, digital signing. Wireshark SSL/TLS handshake analysis. Configuring firewalls (iptables/UFW), Snort IDS rule development.",
                "recommendedBooks": "Cryptography Lab Manual, Southeast University."
            }
        ]
    }
]
};

// 2. BATCH 60 TO 71 (LEGACY CURRICULUM - 150 CREDITS)
export const BATCH_60_71_CURRICULUM: CurriculumData = {
  batchId: "batch_60_71",
  batchLabel: "Batch 60 to 71 (Legacy Curriculum)",
  batchSubLabel: "150 Credits • IEB Accredited • 12 Semesters • Elective Groups A & B",
  programName: "Bachelor of Science in Computer Science and Engineering",
  degree: "B.Sc. in CSE",
  totalCredits: 150,
  totalSemesters: 12,
  durationYears: 4.0,
  minCgpa: 2.50,
  accreditation: "IEB (Institution of Engineers, Bangladesh) Accredited • UGC Approved",
  effectiveFrom: "Trimester / Batch 60 through Batch 71",
  officialPdfUrl: "/curriculum/SEU_CSE_Curriculum_Batch_60_to_71.pdf",
  semesters: [
    {
        "semesterNumber": 1,
        "name": "1st Trimester",
        "year": 1,
        "totalCredits": 12.0,
        "courses": [
            {
                "code": "CSE141",
                "title": "Computer Fundamentals",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Introduction to computers, representation of data, input/output - keyboard (standard layout), mouse, monitor, printer, memory, physical devices - disk drives, types of diskettes, hard disks, removable hard disks, CD-ROM, CD-recordable, WORM disks and PhotoCD, Phase change rewritable drives, measuring drive performances, processors, binary arithmetic, floating point representation of numbers, arithmetic operations with normalized floating point numbers, introduction to software - different sorts of software, logic circuits, computer architecture, computer languages and operating systems, computer history, introduction to Internet - how Internet works, introduction to telecommunication, satellite communication, fiber-optic communication"
            },
            {
                "code": "ENG101",
                "title": "Basic Composition",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Basic Composition is a non-credit foundation course. It is designed to brush up students’ existing English skills. This course will help them to review the grammatical items they already know and will prepare them to study at the tertiary level by enhancing their English language skills.The main focus of this course is on reading and writing. Students will also learn to communicate in English by interacting with the instructor. Students will also explore the creative side of language by solving different sorts of tasks and preparing assignments on picture description and story completion. They will also be conditioned to write formal applications and Emails. At the end of the course they are expected to carry out their academic activities in English effectively."
            },
            {
                "code": "MAT141",
                "title": "Differential & Integral Calculus",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Differential Calculus: Limits, continuity and differentiability, successive differentiation of various types of functions, Leibnitz’s theorem, Mean-value theorem in finite and infinite forms, Lagrange’s form of remainders, Cauchy’s form of remainder, expansion of functions, evaluation of indeterminate forms by L’Hospital’s rule, partial differentiation, Tangent and Normal, Subtangent and Subnormal in Cartesian and Polar coordinates, maximum and minimum values of functions of single variable, points of inflexion, curvature - radius of curvature, centre of curvature, asymptotes, curve tracing.\n\nIntegral Calculus: Definitions of Integration, integrations by methods of substitutions, integration by parts, standard integrals, integration by the method of successive reduction, definite integrals and its properties and use in summing series, Walli’s formula, Improper integrals, Beta function & Gamma function, area under a plane curve in Cartesian and polar coordinates, area of the region enclosed by two curves in Cartesian and Polar coordinates: Arc lengths of curves in Cartesian and Polar coordinates, parametric and pedal equations, intrinsic equations, volume of solids of revolutions, volume of hollow solids of revolution by shell method, area of surface of revolution, Jacobian, multiple integrals and its applications."
            },
            {
                "code": "ACT141",
                "title": "Introduction to Accounting",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Financial Accounting: Objectives and importance of accounting, accounting as an information system, computerized systems and applications in accounting, recording system - double entry mechanism, accounts and their classification, accounting equation, accounting cycle, journal, ledger, trialbalance, preparation of financial statements considering adjusting and closing entries, accounting concepts and conventions.\n\nCost & Management Accounting: Cost concepts and classification, overhead cost - meaning and classification, distribution of overhead cost, overhead recovery method, job order costing, preparation of job cost sheet and quotation prite, inventory valuation, absorption costing and marginal/variable costing technique, cost-volume-profit analysis, contribution-margin approach, sensitivity analysis.\n\nShort term investment decisions - relevant and differential cost analysis, long term investment decisions - capital budgeting, various techniques of evolution of capital investment"
            }
        ]
    },
    {
        "semesterNumber": 2,
        "name": "2nd Trimester",
        "year": 1,
        "totalCredits": 13.0,
        "courses": [
            {
                "code": "ENG102",
                "title": "Intermediate Composition",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ENG101",
                "topics": "The goal of this course is to provide students with tertiary level reading and writing skills.The course focuses on composition, nevertheless includes grammar so as to provide the students with necessary background knowledge of grammatical structures, and common mistakes. This knowledge will help them framing paragraphs effectively maintaining cohesion and coherence. The types of paragraphs selected for this course will not only excel their writing skill, but will also introduce them with the process and techniques of writing they will be using in their other academic courses as well as in real life. The reading section attempts to augment their reading skilladopting various strategies that can be effective in different writing dimensions. In addition to that, the journal writing section has been designed to explore and motivate the students into more free and creative writing. This multifaceted course will help the students learn to engage critically and clearly with texts and topics by developing their own academic writing skills."
            },
            {
                "code": "PHY161",
                "title": "Physics \u2013 I",
                "category": "Basic Sciences",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Mechanics: Kinematics, Graphical representations of displacement-time, velocity-time and acceleration-time. Terminal velocity. Motion in two and three dimensions - projectile motion. Applications of Newton’s laws of motion, Analyses of frames of trusses, Friction, Equilibrium of forces, Work-kinetic energy theorem., Power, Conservative forces. Conservation of energy. Conservation of linear momentum for a system of particles. Center-of-mass motion. Elastic and inelastic collision in one dimension. Rotational kinematics. Angular momentum of a single particle. Conservation of angular momentum Moment of Inertia, Balancing of rotating masses. Gravitation: Gravitational field. Kepler’s laws.\n\nWaves and oscillations: Differential equation of simple harmonic oscillator, total energy and average energy, combination of simple harmonic oscillations, spring mass system, torsional pendulum; two body oscillation, reduced mass, damped oscillation, forced oscillation, resonance, progressive wave, power and intensity of wave, stationary wave, group and phase velocities.\n\nHeat and Thermodynamics: Heat and work- the first law of thermodynamics and its applications; Kinetic Theory of gases- Kinetic interpretation of temperature, specific heats of ideal gases, equipartition of energy, mean free path, Maxwell’s distribution of molecular speeds, reversible and irreversible processes, Carnot’s cycle, second law thermodynamics, Carnot’s theorem, entropy, Thermodynamic functions, Maxwell relations, Clausius and Clapeyron equation."
            },
            {
                "code": "CSE161",
                "title": "Programming Language I",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE141",
                "topics": "Computer and C Fundamentals, C Data types, Operators and Expressions, Basic I/O functions, if-else statement, loops - for loop, while loop, do-while loop, functions, global, local, static and register variables, arrays, bubble sort, selection sort, pointer arithmetic, arrays and pointers, pointer to pointer to integer, structures."
            },
            {
                "code": "CSE162",
                "title": "Programming Language I Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE141",
                "topics": "Laboratory Work based on CSE161"
            },
            {
                "code": "MAT161",
                "title": "Coordinate Geometry and Vector Analysis",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT141",
                "topics": "Transformation of coordinates, Straight lines,Parallel lines,Perpendicular lines, Number line, Interval Notation, Rational Equation, Absolute Value Theorem, Inequality, Discriminate, Asymptotes, Symmetricity, Matrix Application, Division Algorithm and Synthetic Division."
            }
        ]
    },
    {
        "semesterNumber": 3,
        "name": "3rd Trimester",
        "year": 1,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE181",
                "title": "Discrete Mathematics",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE161",
                "topics": "Propositional equivalence, predicate, quantifiers, methods of proof, sets, functions, growth of functions, complexity of algorithms, integers and divisions, number theory & its applications, matrices, proof strategy, mathematical induction, recursive definitions, basic counting techniques, Pigeonhole principle, permutations and combinations, binomial coefficients, generating permutations and combinations, discrete probability, probability theory, recurrence relations, divide-and-conquer algorithm, generating functions, relations, n-ary relations and their applications, closures of relations, equivalent relations, partial ordering, graphs and graph models, connectivity, graph coloring, trees, application of tree and tree traversal."
            },
            {
                "code": "ENG103",
                "title": "Advanced English Skills",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ENG102",
                "topics": "Advanced reading comprehension and critical analysis of technical and scholarly literature. Academic report writing, technical documentation, research paper abstracts, executive summaries. Oral presentation skills, non-verbal communication, visual aids, active listening, debating and defending technical viewpoints.",
                "recommendedBooks": "Raymond Murphy, English Grammar in Use, Cambridge University Press.\nJohn M. Swales, Academic Writing for Graduate Students, University of Michigan Press."
            },
            {
                "code": "EEE181",
                "title": "Electrical Circuits Design I",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Units, DC sources, Resistance and Conductance, Ohm’s law, Power and Energy, Series and parallel circuits, Series-Parallel Networks; Methods of analysis: Mesh analysis, Node analysis and other methods of analysis; Kirchhoff’s laws, Y-delta transformation; Circuit theorems: Superposition Theorem, Norton’s Theorem, Thevenin’s Theorem, Millman’s Theorem, Capacitors, Magnetic circuits, Inductors, R-C and R-L circuits with DC excitation."
            },
            {
                "code": "EEE182",
                "title": "Electrical Circuits Design I Lab",
                "category": "Engineering",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "-",
                "topics": "Laboratory Works based on Theory Course EEE181"
            },
            {
                "code": "PHY181",
                "title": "Physics II",
                "category": "Basic Sciences",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "PHY161",
                "topics": "Electricity and Magnetism: Electric charge and Coulomb’s law, Electric field, concept of electric flux and the Gauss’s law- some applications of Gauss’s law, Gauss’s law in vector form, Electric potential, relation between electric field and electric potential, capacitance and dielectrics, gradient, Laplace’s and Poisson’s equations, Current, Current density, resistivity, the magnetic field, Ampere’s law, Biot-Savart law and their applications.\n\nOptics: Defects of images: spherical aberration, astigmatism, coma, distortion, curvature, chromatic aberration. Theories of light; Interference of light: Young’s double slitexperiment, displacement of fringes and its uses, Fresnel bi-prism, interference in thin films, Newton’s rings,Bragg’s law and diffraction, interferometers; Diffraction: Diffraction by single slit,diffraction from a circular aperture, resolving power of optical instruments, diffraction at double slit and N-slits, diffraction grating; polarization: Production and analysis of polarized light, Brewster’s law, Malus law, polarization by double refraction, Nicol prism, optical activity, Polarimeters.\n\nReference Book(s):\n\n1.A Text Book of Optics - Brijlal and Subramannyam\n\n2.Fundamentals of optics - Francis and harve\n\n3. Waves and oscillation - Brijlal and Subramannyam\n\n4.Physics part-I - Resnick and Haliday\n\n5.Physics part-II - Resnick and Haliday\n\n6.Fundamentals of Physcs - Haliday, Resnick and Walker\n\n7.Electricity & Magnetism - K.K Tewari\n\n8.Elementary Solid State Physics -M Ali Omar"
            },
            {
                "code": "PHY182",
                "title": "Physics II Lab",
                "category": "Basic Sciences",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "PHY161",
                "topics": "Laboratory Works based on PHY161 and PHY 1031.\n\nReference Book(s):\n\n1. Practical Physics -Dr. Giasuddin. 2. Practical Physics -C.L Arora."
            }
        ]
    },
    {
        "semesterNumber": 4,
        "name": "4th Trimester",
        "year": 2,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE241",
                "title": "Data Structures",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE181",
                "topics": "Elementary data types, structures, arrays, pointers; introduction to Object Oriented Programming; elementary searching: linear search, binary search; implementation and applications of stacks and queues; solving problems with recursion; binary search trees, balanced search trees; priority queue implementation with heaps; graph representation and elementary graph algorithms."
            },
            {
                "code": "CSE242",
                "title": "Data Structures Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE181",
                "topics": "Laboratory Work based on Theory Course CSE241"
            },
            {
                "code": "ENG105",
                "title": "Public Speaking",
                "category": "Language",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ENG103",
                "topics": "Principles of effective oral communication and rhetoric: Audience analysis, speech organization, persuasive speaking, informative speaking, impromptu speaking. Delivery techniques: Vocal variety, body language, eye contact, managing speech anxiety. Use of multimedia presentation tools, conducting professional Q&A sessions.",
                "recommendedBooks": "Stephen E. Lucas, The Art of Public Speaking, McGraw-Hill."
            },
            {
                "code": "MAT241",
                "title": "Complex Variables and Transforms (Laplace & Fourier)",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT141",
                "topics": "Complex Variables: complex number system, general function of a complex variable, limits and continuity of a function of a complex variable and related theorems, complex differentiation, the Cauchy-Riemann equation, mapping by elementary functions, line integral of a complex function, Cauchy’s Integral Theorem and formula, Liouville’s theorem, Taylor’s theorem, Laurent’s theorem, Singular points, Residue, Cauchy’s Residue Theorem, evaluation of Residues, Contour integration, conformal mapping. Laplace Transforms: Laplace transforms of some elementary functions, sufficient conditions for existence of Laplace Transforms, inverse Laplace transforms, Laplace transforms of derivatives, the\n\nunit step function, periodic function, some special theorems on Laplace transforms, partial fractions, solutions of differential equations.\n\nFourier Transforms: Real and complex form of Fourier series, finite transforms, Fourier Integral, Fourier transforms and their uses in solving boundary value problems of wave equations."
            },
            {
                "code": "EEE241",
                "title": "Electronic Devices & Circuits I",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "EEE181",
                "topics": "Introduction to semiconductors, The p-n junction diode: p-n junctions under forward and reverse biases, The ideal diode and real diode, Load line analysis of diode circuits,graphical analysis of diode circuits,equivalent circuits and frequency response, diode applications characteristics of different types of diodes Bipolar Junction Transistors (BJT): Bipolar junction transistor-Construction and Operation, Amplifying action, Common-base (CB), Common-collector (CC) and Common-emitter (CE) configurations, Different methods of transistor biasing, Darlington pair, Load Line (AC and DC), BJTs at low frequencies."
            },
            {
                "code": "EEE242",
                "title": "Electronic Devices & Circuits I Lab",
                "category": "Engineering",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "EEE181, EEE182",
                "topics": "Laboratory Work based on EEE241\n\nTOPICS: Study on D.C. and A.C. Circuits, D.C. Motors, Induction Motor, A.C. and D.C. Generators, Single Phase and 3-Phase transformer, star-Delta Starter, rectifiers.Transistor amplifier circuit, Application of I.C’s in every day and industrial use. House wiring and layout of a factory (Electrical) etc."
            }
        ]
    },
    {
        "semesterNumber": 5,
        "name": "5th Trimester",
        "year": 2,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE261",
                "title": "Numerical Methods",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE181, MAT161",
                "topics": "Representation of numeric values in Computer, arithmetic operations of floating-point numbers, precision error, bracketing and open methods of root finding, Solving system of linear equations, forward and backward differences, Taylor series, different types of interpolating polynomials, Numerical integration: Trapezoidal rule, Simpson’s rule, Runge-Kutta methods. ."
            },
            {
                "code": "CSE263",
                "title": "Digital Logic Design",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE161",
                "topics": "Binary Systems, Boolean algebra and Logic Gates, Gate Level Minimization, Combinational Logic, Synchronous Sequential Logic, Registers and Counters, Memory and Programmable Logic."
            },
            {
                "code": "CSE264",
                "title": "Digital Logic Design Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE161",
                "topics": "Laboratory Work based on Theory Course CSE263"
            },
            {
                "code": "MAT261",
                "title": "Linear Algebra and Matrices",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT241",
                "topics": "Definition of matrix, different types of matrices, algebra of matrices, adjoint and inverse of a matrix, elementary transformations of a matrix, matrix polynomials, canonical forms, Rank of matrices. System of linear equations (homogeneous and nonhomogeneous) and their solutions. Applications of system linear equations in real life problems. Definition and properties of vector space, subspaces, Linear combination of vectors, Linear dependence and independence of vectors, basis and dimension, linear transformations ,kernel and image of a linear transformation(LT), definition and properties, linear operator matrix, matrix representation of linear transformations, change of basis, Eigenvalues and eigenvectors, Diagonalization, Cayley-Hamilton theorem and its application."
            },
            {
                "code": "CSE265",
                "title": "Algorithm",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE241",
                "topics": "Sorting (Insertion, Selection, Merge, Quick, Counting, Radix), Growth of Function, Divide and Conquer, Solving Recurrences, Heap, Median and Order Statistics, Hashing, Elementary Graph Algorithms, Shortest Paths, Sets and Disjoint Sets, Minimum Spanning Tree, Backtracking, Introduction to Computational Geometry, Introduction toGreedy Algorithms, Introduction to Dynamic Programming."
            },
            {
                "code": "CSE266",
                "title": "Algorithm Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE241, CSE242",
                "topics": "Laboratory Work based on Theory Course CSE265"
            }
        ]
    },
    {
        "semesterNumber": 6,
        "name": "6th Trimester",
        "year": 2,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "MGT281",
                "title": "Introduction to Business & Management",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE241",
                "topics": "Concepts of Business, its components, classifications, importance, national and international business, group dynamics and leadership in business and non-businesses organizations. Introduction to the components of management in information system and their integration for managerial control and decision support. Principle and process of management, types of management, Management in Engineering."
            },
            {
                "code": "CSE281",
                "title": "Introduction to Programming Language II (Java)",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE161, CSE162",
                "topics": "Introduction to OOP, OOP in Java, Object, Classes, Methods, Variables, Operators, Expressions, Statements and Blocks, Control Statements, Strings, Arrays, Inheritance, Package, Interface, Exceptions, I/O, AWT, Swing, Database using JDBC, String Handling, Threads, Events, Applets, Images, Project Work."
            },
            {
                "code": "CSE282",
                "title": "Introduction to Programming Language II (Java) Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE161, CSE162",
                "topics": "Laboratory Work based on Theory Course CSE281"
            },
            {
                "code": "ETE281",
                "title": "Communication Theory",
                "category": "Engineering",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "MAT241, EEE241",
                "topics": "Overview of communication systems: Basic principles, fundamental elements, system limitations. Noise: Source, characteristics of various types of noise, Information theory: Measure of information, source encoding, channel capacity, Communication systems: Analog and digital. amplitude modulation- introduction, double side band, single side band, vestigial side band, quadrature; envelope and synchronous detection; angle modulation- frequency modulation (FM) and phase modulation (PM), demodulation of FM and PM. Pulse modulation: Sampling- sampling theorem, Nyquist criterion, pulse code modulation (PCM), differential PCM, demodulation of PCM; delta modulation (DM)- principle, adaptive DM;Digital modulation: Amplitude-shift keying- principle, ON-OFF keying, bandwidth requirements, detection, noise performance; phase-shift keying (PSK)- principle, bandwidth requirements, detection, differential PSK, Quadrature PSK, noise performance; frequency-shift keying (FSK)- principle, continuous and discontinuous phase FSK, minimum-shift keying, bandwidth requirements, detection of FSK. Multiplexing: Time-division multiplexing (TDM), frequency-division multiplexing (FDM), multiple-access network- time-division multiple-access (TDMA), frequency-division multiple access (FDMA); code-division multiple-access (CDMA). Communication system design: design parameters, channel selection criteria and performance simulation."
            },
            {
                "code": "ETE282",
                "title": "Communication Lab",
                "category": "Engineering",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "MAT241, EEE241",
                "topics": "Laboratory Works based on ETE281"
            },
            {
                "code": "STA281",
                "title": "Statistical Methods & Probability",
                "category": "Mathematics",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Data and variables, central tendency, dispersion, skewness, kurtosis, probability, random variables, probability distributions, mathematical expectation and moment generating functions, joint & marginal distributions, stochastic independence, central limit theorem, concepts of Sampling & its various methods, design of an experiment & analysis of variance, concepts of estimation, methods of estimation, hypothesis testing & inference. Concepts of Sample Survey & itsvarious methods- S.R.S; St.R.S. Systematic Sampling & Multi stage Sampling. Analysis of variance- One way, Two way & Three way Classification. Design of an experiment-CRD, RBD,LSD & Fractorial Experiment. Concepts of estimation- Criteria of a good estimator, Point estimation- Method of Moment, Least square, MLE, Min. Chai-square & Bayes Estimator. Interval Estimation-Confidence Interval, Feducial interval. Large & small Sample Test of significance & Hypothesis Testing. Non-Parametric Test."
            }
        ]
    },
    {
        "semesterNumber": 7,
        "name": "7th Trimester",
        "year": 3,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE341",
                "title": "Computer Networking",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ETE281",
                "topics": "Overview of OSI reference model. Topology design, Media Access Control Level, Services, Problems and protocols, Practical local area network design and implementation. IEEE LAN Standards, Logical Link Control protocols, HDLC, ALOHA, SLOTTED ALOHA, FDDI, Client Server model and related softwares.\n\nNetwork Layer level services, problems and protocols. WAN, MAN, interconnection networks related softwares, TCP/IP, Novel NetWare, Routers, Bridges and Gateways their Practical implementation aspects. X.25, Internet and related softwares.\n\nTransport layer, services, problems and their protocol.\n\nBrief functioning of upper layers, E-mail and other application."
            },
            {
                "code": "CSE342",
                "title": "Computer Networking Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "ETE281",
                "topics": "Laboratory Works based on Theory Course CSE341"
            },
            {
                "code": "CSE343",
                "title": "Computer Architecture",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE263",
                "topics": "Fundamentals of computer design - tasks of a computer architect, technology and trends, cost and trends, measurement of performance, quantitative principles of computer design, the concepts of memory hierarchy, Instruction setprinciples - classification, memory addressing, operations, types and size of operands, encoding, study of sample instruction set architecture, pipelining - hurdles and Hazards, data hazards and control hazards, handling multi-cycle operations, instruction level parallelism (ILP) - overcoming data hazards with dynamic scheduling, reducing Brance penalties with dynamic hardware prediction, compiler support for exploiting ILP, hardware support for extracting more parallelism, Memory hierarchy design - Caches, reducing cache misses & penalty, reducing hit time, main memory, virtual memory, protection and examples of virtual memory, Storage systems - types of storage devices, Buses, I/O performance measures, reliability, availability and RAID, multiprocessors - centralized & distributed shared memory architectures, synchronization, computer arithmetic, vector processors, survey of RISC architectures and Intel 80x86."
            },
            {
                "code": "CSE345",
                "title": "Information System Design & Software Engineering",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281, CSE282",
                "topics": "Introduction to information system (information, information system, information gathering, information sources, system analysis), data collection process (interviewing), fact finding techniques (questionnaire, joint application design (JAD)), prototyping, system design tools overview, data flow diagram, data dictionary, process specifications, E-R diagram, state diagram, variations of modeling tools (flowcharts and its variations, Nassi-Shneiderman diagram, Ferstl diagram, Hamilton-Zeldin diagram, problem analysis diagrams (PAD), system flowchart, HIPO diagrams, structure charts, variations on data flow diagram and E-R diagram), analysis models (essential model, environmental model, behavior model, user implementation model), introduction to UML (use case modeling and use case diagram, class modeling, relationship, class diagrams, object interaction - modeling sequence, collaboration diagram, state chart diagram, activity diagram, component and deployment diagram), ethical and social issues, security issues, project estimation, COCOMO model, PERT/CPM analysis, Gantt charts, cost benefit analysis, introduction to linear programming, project work\n\nSoftware Quality Concepts, Process Models, Software Requirements Analysis, Design Methodologies, Software Testing, Software Maintenance, Testing and Debugging, Modularity, Specification, Data Abstraction, Object Modeling, Design Patterns, Testing, RUP, UML, Project Work."
            },
            {
                "code": "CSE346",
                "title": "Information System Design & Software Engineering Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE281, CSE282",
                "topics": "Laboratory experiments based on CSE345: Preparation of complete Software Requirement Specification (SRS) documents. Object-oriented analysis and design using UML tools (Visual Paradigm / StarUML): Use case diagrams, class diagrams, sequence diagrams, activity diagrams. Agile development practices, version control with Git, automated unit testing.",
                "recommendedBooks": "Roger S. Pressman, Software Engineering Lab Manual, Southeast University."
            },
            {
                "code": "SOC341",
                "title": "Engineering Ethics",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "Completion of 80 Credits",
                "topics": "Ethics and Professionalism: Micro & Macro Issues, Dimension of Engineering; Moral Reasoning and Code of Ethics; Right, Duty, Virtue, Self Realization Ethics, Utilitarians; Engineering as Social Experimentation, Workplace Responsibilities: Confidentiality, Conflict of Interest, Professional Right; Whistle Blowing; Academic and Research Integrity; Computer Ethics: Ethics for IT Professional and IT Users, Internet Crime; Environmental Ethics; Global Justice and International Rights; Case Studies in Professional behavior."
            }
        ]
    },
    {
        "semesterNumber": 8,
        "name": "8th Trimester",
        "year": 3,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE4XXA",
                "title": "Elective I (Group A)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Advanced Elective course selected from approved Group A (Theoretical/Specialized Electives without Lab): Mathematical Analysis, Compiler Construction, E-Commerce, Graph Theory, Image Processing, Cryptography, Cloud Computing, MIS, Smart Devices.",
                "recommendedBooks": "Refer to the specific Elective course syllabus."
            },
            {
                "code": "CSE383",
                "title": "Database Design",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281",
                "topics": "Concept of Database Systems; Semantic Database Design: High level Conceptual Modeling, ER Model & Relational Model, ERD, Integrity Constraints, Enhanced ER (EER) Model; Relational Algebra; SQL; Relational Database Design: Concepts of FDs, Decomposition & Desirable Properties, Normalization, Algorithms for 1NF, 2NF, 3NF, BCNF, 4NF, 5NF; Other Dependencies & Normal Forms; Storage & Indexing: Storage Structures, File Organization, Heap, Indexing Methods, B+ Tree Indexing, Hash Indexing; Transaction Processing & Concurrency Control: Transaction Fundamentals, OLTP Environments, ACID Properties, Locking, Deadlock & Starvation; Database Recovery Techniques; Query Processing & Optimization; Database Security & Authorization; Enhanced Data Models for Specific Applications; Distributed Databases & Issues."
            },
            {
                "code": "CSE384",
                "title": "Database Design Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE281",
                "topics": "Laboratory Works based on Theory Course CSE383"
            },
            {
                "code": "CSE363",
                "title": "Microprocessor Design & Assembly Language Programming",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE161, CSE263",
                "topics": "Hardware and software architecture, instruction types and their formats, assembly program format, assembly process, interrupts and system services, addressing methods, high level control structure formation, use of subroutines and macros, numeric processing and string processing, concurrent processes & high level linking, disk geometry, file system and file I/O handling.\n\nIntroduction to 8-bit, 16-bit, and 32-bit microprocessor - architecture, addressing modes, instruction set, interrupts, multi-tasking and virtual memory - memory interface, bus interface, arithmetic co-processor, Micro-controllers, integrating microprocessors with interfacing chips."
            },
            {
                "code": "CSE364",
                "title": "Microprocessor Design & Assembly Language Programming Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE161, CSE263",
                "topics": "Laboratory Works based on Theory Course CSE363"
            },
            {
                "code": "CSE365",
                "title": "Artificial Intelligence",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE265",
                "topics": "Searching: conventional graph searching, A*, IDA*, jump point search, local searching: hill climbing, simulated annealing, constraint satisfaction, adversarial search using minimax, knowledge representation and inference using propositional and firstorder logic and implementation using prolog, artificial neural networks."
            }
        ]
    },
    {
        "semesterNumber": 9,
        "name": "9th Trimester",
        "year": 3,
        "totalCredits": 12.0,
        "courses": [
            {
                "code": "CSE381",
                "title": "Introduction to Embedded Systems",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE363",
                "topics": "PREREQUISITE(S): CSE363\n\nCourse Instructor is requested to target a specific mid-range 8-bit Microcontroller (MCU) with following basic features : 1. Analogue to Digital Converter (ADC); 2. Analog Comparator; (optional) 3. Pulse Width Modulation and or Output Compare channels; 4. External interrupt(s); 5. Watch Dog Timer 6. Internal Timers\n\n7. External and internal clock input. 8. Hardware I2C and or SPI and or CAN bus capabilities. 9. USART/ USB communication. 10. Parallel I/O ports. Software(s) : Course instructor is requested to target open-source / freely available tool-chain, IDE. Target language : C/C++/assembly/Processing/ Java. Suggested MCU: AVR ATMega168/ ATMega328; AVR Attiny 2313/4313; Microchip PIC 16F/18Fseries\n\nTopics 1. Introduction to embedded system and interfacing: Why is computer interfacing important?; Typical Interfacing Activities; Inside the embedded system ; Replacement for discrete logic-based circuits; Von-Neuman Architecture vs. Harvard Architecture; Microcontroller's fundamental components; Basic microcontroller architecture; Microcontrollers vs. Microprocessors; Different Microcontroller manufcaturer; Review: basic circuits; Digital and Analogue concepts. 2. Detailed Architecture of the Target Microcontroller; 3. Setting up development environment 4. Basic Peripherals : Digital input / output using parallel I/O ports 5. Timer unit 6. PWM and Output Compare Channels 7. Interfacing with Analogue world 8. Interrupts and exception handling 9. Interfacing with X86/ AMD64 Computer: Introduction to USART 10. Developing X86/ AMD64 Computer software to control MCU 11. Introduction to I2C, SPI and or CAN bus 12. Finite State Machine and its application in embedded ayatem 13. Working with sensors and modules: Proximity Sensor, Distance Sensor, Real Time Clock module (i2c), Accelerometer (i2c/SPI), Gyroscope, Temperature Sensors, Light sensors, Sensor networking, Relays, ethernet/WIFI etc. 14. Working with Motors: Introduction to H-bridge, Brushed D.C., Unipolar/Bipolar Stepper motor, Servo Motor Torque vs. Speed, Basic Gear box design, Converting rotational motion to linear motion. 15. USB protocol: USB Human interface device (HID), USB Host device."
            },
            {
                "code": "CSE382",
                "title": "Introduction to Embedded Systems Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE364",
                "topics": "Laboratory works based on Theory course CSE381"
            },
            {
                "code": "CSE361",
                "title": "Operating Systems",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE343, CSE265",
                "topics": "COMPUTER SYSTEM OVERVIEW: Basic Elements; Processor Registers; Instruction Execution; Interrupts; The Memory Hierarchy; Cache Memory; I/O Communication Techniques;\n\nOPERATING SYSTEM OVERVIEW: Operating System Objectives and Functions; The Evolution of Operating Systems; Developments Leading to Modern Operating Systems; Microsoft Windows Overview; Modern UNIX Systems; Linux;\n\nPROCESS DESCRIPTION AND CONTROL: Process States; Process Description; Process Control; Execution of the Operating System; Security Issues; Linux Process Management; Security Issues\n\nSCHEDULING: Uniprocessor Scheduling: Types of Professor Scheduling, Scheduling Algorithms, Traditional UNIX Scheduling; Multiprocessor Scheduling: Granularity,Design Issues, Process Scheduling,Thread Scheduling,Real-Time Scheduling: Characteristics of Real-Time Operating Systems, Real-Time Scheduling, Deadline Scheduling,Rate Monotonic Scheduling, Priority Inversion, Linux Scheduling Assignment 1 THREADS, SMP, AND MICROKERNELS: Processes Vs.Threads:Multithreading, User-Level and Kernel-Level Threads; Symmetric Multiprocessing : Modern Multi Core Processor and Process Management and GPU architecture; Microkernels; Linux/Windows Process and Thread Management Assignment 2 CONCURRENCY: Principles of Concurrency; Mutual Exclusion; Semaphores; Monitors (Java as example); Message Passing; Classical Problems: Readers/Writers Problem, Dining Philosophers Problem, Sleeping Barber Problem; Principles of Deadlock; Deadlock Prevention; Deadlock Avoidance; Deadlock Detection; Linux Concurrency Mechanisms: Pipes, Messages, Shared Memory, Semaphores; Signals; Linux Kernel Concurrency Mechanisms: Atomic Operations, Spinlocks, Semaphores, Barriers Assignment 3 MEMORY MANAGEMENT: Memory Management Requirements; Memory Partitioning; Paging; Segmentation; Security Issues; Virtual Memory: Hardware and Control Structures, Operating System Software; Linux/Windows Memory Management Assignment 4 FILE MANAGEMENT: File Organization and Access; File Directories; File Sharing; Record Blocking; Secondary Storage Management; File System Security; UNIX File Management: File Allocation, Directories, Volume Structure, Traditional UNIX File Access Control, Access Control Lists in UNIX; LINUX Virtual File System; Windows File System; Assignment 5 COMPUTER SECURITY THREATS: Computer Security Concepts; Threats, Attacks, and Assets; Intruders; Malicious Software Overview; Viruses,Worms, and Bots; Rootkits; Assignment 6"
            },
            {
                "code": "CSE362",
                "title": "Operating Systems Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE343, CSE266",
                "topics": "Laboratory Works based on Theory Course CSE361"
            },
            {
                "code": "CSE4XXB",
                "title": "Elective II (Group B Theory)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Specialized Elective course with Lab component selected from approved Group B: Advanced Java, Parallel and Distributed Computing, Advanced Database Design, Advanced Embedded Systems, Web & Internet Programming, Software Development & Project Management.",
                "recommendedBooks": "Refer to the specific Group B course syllabus."
            },
            {
                "code": "CSE4XXBL",
                "title": "Elective II Lab (Group B Lab)",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "As per elective",
                "topics": "Hands-on laboratory experiments and project implementation corresponding to the chosen Group B Elective course.",
                "recommendedBooks": "Associated Lab Manual, Dept. of CSE, Southeast University."
            }
        ]
    },
    {
        "semesterNumber": 10,
        "name": "10th Trimester",
        "year": 4,
        "totalCredits": 14.0,
        "courses": [
            {
                "code": "CSE441",
                "title": "Theory of Computing",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE265",
                "topics": "Formal proofs, finite automata, DFA/NFA and their equivalence, properties of regular languages, minimizing automata, regular expressions, Pumping lemma, non-regular languages, context-free grammar, Chomsky and Greibach normal forms, pushdown automata, non-context free languages, Turing machines, variants of Turing machines, definition of algorithms, decidable languages,\n\nUndecidability of the Halting problem, Diagonalization and reduction, time complexity, classes P, NP, NPC."
            },
            {
                "code": "CSE443",
                "title": "Computer Graphics & Animation",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281, MAT261",
                "topics": "Modeling shapes with meshes, affine transformation, three dimensional viewing, lighting and shading techniques, texture mapping, skinning, animating models, collision detection, ray tracing."
            },
            {
                "code": "CSE444",
                "title": "Computer Graphics & Animation Lab",
                "category": "Core",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE281, MAT261",
                "topics": "Laboratory Works based on Theory Course CSE443 using OpenGL and Blender."
            },
            {
                "code": "CSE4XXC",
                "title": "Elective III (Group A)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Advanced Elective course selected from approved Group A (Theoretical/Specialized Electives without Lab): Mathematical Analysis, Compiler Construction, E-Commerce, Graph Theory, Image Processing, Cryptography, Cloud Computing, MIS, Smart Devices.",
                "recommendedBooks": "Refer to the specific Elective course syllabus."
            },
            {
                "code": "CSE4XXD",
                "title": "Elective IV (Group B Theory)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Specialized Elective course with Lab component selected from approved Group B: Advanced Java, Parallel and Distributed Computing, Advanced Database Design, Advanced Embedded Systems, Web & Internet Programming, Software Development & Project Management.",
                "recommendedBooks": "Refer to the specific Group B course syllabus."
            },
            {
                "code": "CSE4XXDL",
                "title": "Elective IV Lab (Group B Lab)",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "As per elective",
                "topics": "Hands-on laboratory experiments and project implementation corresponding to the chosen Group B Elective course.",
                "recommendedBooks": "Associated Lab Manual, Dept. of CSE, Southeast University."
            }
        ]
    },
    {
        "semesterNumber": 11,
        "name": "11th Trimester",
        "year": 4,
        "totalCredits": 12.0,
        "courses": [
            {
                "code": "CSE459",
                "title": "Research Methodology",
                "category": "Core",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "Completion of 110 credit hours",
                "topics": "Study of problems in the field of Computer Science & Engineering. A student needs to select a suitable topic of his/her interest or supervisors may display a listof project works related with the academic needs in research activities."
            },
            {
                "code": "ECO461",
                "title": "Introduction to Economics",
                "category": "General Education",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "-",
                "topics": "Definition of economics, economics and engineering, principles of economics. Introduction to various economic systems - capitalist, command and mixed economy, fundamental economic problems and mechanisms through which these problems can be solved, theory of demand and supply and their elasticities, theory of consumer behavior, cardinal and ordinal approaches of utility analysis, price determination, nature of an economic theory, applicability of economic theories to the problems of developing countries, indifference curve techniques, theory of production, production function, types of productivity, rational region of production of an engineering firm, concepts of market and market structure, cost analysis and cost function, small and large scale production, optimization, theory of distribution, use of derivatives in economics, maximization and minimization of economic functions, relationship among total, marginal and average concepts. Micro-Economics: Savings, investment, employment, national income analysis, inflation, monetary policy, fiscal policy and trade policy with reference to Bangladesh, economics and development and planning."
            },
            {
                "code": "CSE4XXE",
                "title": "Elective V (Group A)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Advanced Elective course selected from approved Group A (Theoretical/Specialized Electives without Lab).",
                "recommendedBooks": "Refer to the specific Elective course syllabus."
            },
            {
                "code": "CSE4XXF",
                "title": "Elective VI (Group A)",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "As per elective",
                "topics": "Advanced Elective course selected from approved Group A (Theoretical/Specialized Electives without Lab).",
                "recommendedBooks": "Refer to the specific Elective course syllabus."
            }
        ]
    },
    {
        "semesterNumber": 12,
        "name": "12th Trimester",
        "year": 4,
        "totalCredits": 3.0,
        "courses": [
            {
                "code": "CSE489",
                "title": "Project OR Internship",
                "category": "Final Year Project",
                "prototype": "Practical",
                "credits": 3.0,
                "prerequisite": "CSE459",
                "topics": "Final Year Capstone Project or Industrial Internship: Comprehensive research or development project under faculty supervision, or practical industry attachment at an accredited tech company. Rigorous literature survey, engineering design, implementation, testing, technical reporting, and oral defense.",
                "recommendedBooks": "Capstone Project and Internship Guidelines, Dept. of CSE, Southeast University."
            }
        ]
    }
],
  electiveGroups: [
    {
        "groupId": "group_a",
        "name": "Elective Courses: Group A (Without Lab)",
        "description": "Students select theoretical elective subjects from this group to complete degree specialization requirements.",
        "minCredits": 12.0,
        "courses": [
            {
                "code": "CSE349",
                "title": "Mathematical Analysis for Computer Science",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "STA281, CSE181",
                "topics": "Systematic ways of proving, mathematical notations, sums and recurrences, modular arithmetic, basic number theory, some well known functions related to number theory, Binomial coefficients, Generating functions, mechanical summations, Stirling, Eulerian, Harmonic, Bernoulli and Fibonacci numbers, Domino theory, solving recurrences using generating functions."
            },
            {
                "code": "CSE469",
                "title": "Compiler Construction",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE441",
                "topics": "Lexical analysis, parsing (LL, LR parsers), syntax directed translation, intermediate code generation, error detection and recovery, design and implementation of lexical analyzers and parsers using tools like flex and bison."
            },
            {
                "code": "CSE467",
                "title": "E-Commerce & E-Governance",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE383, SOC341",
                "topics": "Introduction to Electronic Commerce: What electronic commerce isand how it has evolved into a second wave of growth; Why companies concentrate on revenue models and the analysis of business processes instead of business models when they undertake electronic commerce initiatives; How economic forces have created a business environment that is fostering the second wave of electronic commerce; How businesses use value chains and SWOT analysis to identify electronic commerce opportunities ; The international nature of electronic commerce and the challenges that arise in engaging in electronic commerce on a global scale\n\nTechnology Infrastructure: The Internet and the World Wide Web:The origin, growth, and current structure of the Internet;How packet-switched networks are combined to form the Internet; How Internet protocols and Internet addressing work; The history and use of markup languages on the Web, including SGML, HTML, and XML; How HTML tags and links work on the World Wide Web; The differences among internets, intranets, and extranets; Options for connecting to the Internet, including cost and bandwidth factors; Internet2 and the Semantic Web Business Strategies For E-Commerce: Revenue models; How some companies move from one revenue model to another to achieve success; Revenue strategy issues that companies face when selling on the Web; Creating an effective business presence on the Web; Web site usability; Communicating effectively with customers on the Web; When to use product-based and customer-based marketing strategies; Communicating with different market segments; Customer relationship intensity and the customer relationship life cycle; Using advertising on the Web; E-mail marketing; Technology-enabled customer relationship management; Creating and maintaining brands on the Web; Search engine positioning and domain name selection; Social Network, Viral Marketting;\n\nBusiness-to-Business Activities: How businesses use the Internet to improve purchasing, logistics, and other support activities; Electronic data interchange and how itworks; How businesses have moved some of their electronic data interchange operations to the Internet; Supply chain management and how businesses are using Internet technologies to improve it; Electronic marketplaces and portals that make purchase-sale negotiations easier and more efficient\n\nLegal, Ethical, and Tax Issues: Laws that govern electronic commerce activities; Laws that govern the use of intellectual property by online businesses; Online crime, terrorism, and warfare; Ethics issues that arise for companies conducting electronic commerce; Conflicts between companies’ desire to collect and use data about their customers and the privacy rights of those customers; Taxes that are levied on electronic commerce activities\n\nElectronic Commerce Software & Security: Web server basics; Software for Web servers; E-mail management and spam control issues; Internet and Web site utility programs; Web server hardware; Finding and evaluating Web-hosting services; Basic functions of electronic commerce software; Advanced functions of electronic commerce software; Electronic commerce software for small and midsize businesses; Electronic commerce software for midsize to large businesses; Electronic commerce software for large businesses that have an existing information technology infrastructure; Online security issues ; Security for client computers; Security for the communication channels\n\nbetween computers; Security for server computers; Organizations that promote computer, network, and Internet security;\n\nPayment Systems for Electronic Commerce: The basic functions of online payment systems; The use of payment cards in electronic commerce; The history and future of electronic cash; How electronic wallets work; The use of stored-value cards in electronic commerce; Internet technologies and the banking industry\n\nThe Need for Enterprise Architecture: Enterprises and their challenges; Stakeholders and Their Concerns; Traditional Approaches; Requirements on Enterprise Architecture;\n\nGovernance Paradigm: Key Applications for Enterprise Architecture; Defining Enterprise Architecture; Key Concept of Enterprise Architecture; Benefits of Enterprise Architecture; Competencies of an Enterprise Architect;\n\nThe Results of Enterprise Architecting: Case Study on an Enterprise Architecture; Quality of the Produced Results; Enterprise Architecture Frameworks : Tapscott & Caston’s Views, The Integrated Architecture Framework, The ArchiMate Framework, The Zachman Framework, The Open Group’s Architecture Framework; Dimensions for Architecture Frameworks: Subject Dimensions, Purpose Dimensions, Form Dimensions\n\nThe Process of Enterprise Architecting: The Core Process of Enterprise Architecting: Creating, Using and Maintaining Enterprise Architecture; Patterns for Enterprise Architecting; Architecture Effectiveness and Organizational Context: Architecture Maturity Level of the Enterprise, Assessing an Organization’s Architecture Effectiveness, Assessing an Organization’s Culture and Management Style; Organizing the Architecture Function: Planning Learning and Organizinging Architecture Activities"
            },
            {
                "code": "CSE359",
                "title": "Graph Theory",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE265",
                "topics": "Dominating sets, the reconstruction problem, intersection graphs, perfect graphs, random graphs, Chordal graphs. Famous problems in Graph Theory include: Minimum Connector Problem, Marriage Problem, the Assignment Problem, the Network Flow Problem, the Committee Scheduling Problem, the Four Color Problem, the Traveling Salesman, Transportation and Transshipment Problem, etc."
            },
            {
                "code": "CSE355",
                "title": "Image Processing",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281, CSE265",
                "topics": "Digital image fundamentals, perceptions, representation, image transforms - Fast Fourier Transform (FFT), Discrete Cosine Transforms (DCT), Karhunen and Loeve Transforms (KLT), Wavelet transform and sub-band decomposition, image enhancement and restoration techniques, image compression techniques, image compression standards - JPEG, MPEG, H.261, H.263"
            },
            {
                "code": "CSE479",
                "title": "Cryptography & Network Security",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE341",
                "topics": "Classical Cryptography: Introduction to simple cryptosystems, Cryptanalysis; Shannon's Theory: Perfect secrecy, Entropy, Product cryptosystems; Data Encryption Standard: Description of DES, Differential cryptanalysis; RSA System and Factoring: Public-key cryptography, RSA cryptosystem, Attacks on RSA, Factroing algorithms; Other Public-key cryptosystems: ElGamal cryptosystem and discrete logs, Merkle-Hellman Knapsack System; Signature Schemes: ElGamal signature schemes, Digital signature standard, Fail-stop signatures; Hash Functions: Signatures and Hash functions, Collision-free Hash functions, Birthday attack; Key Distribution and Key Agreement: Key predistribution, Kerboros, Diffie-Hellman key exchange; Identification Schemes: Schnorr identification scheme, Okamoto identification schemes; Authentication Codes: Computing deception probabilities, Combinatorial bounds, Entropy bounds; Secret Sharing Schemes: Shamir threshold scheme, Access structure and general secret sharing; Pseudo-random Number Generation: Indistinguishable probability distribution, probabilistic encryption; Zero-knowledge proofs: Interactive proof systems, computational Zero-knowledge proofs."
            },
            {
                "code": "CSE477",
                "title": "Cloud Computing",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE361",
                "topics": "PREREQUISITE(S): CSE361\n\nIntro to Clouds, Software as a service (SaaS), Platform as a serivce (PaaS), Infrasturcture as a Service, MapReduce, Gossip, Membership, Grids, P2P Systems, Key ValueStores, Time and Ordering, Snapshots, Multicast, Paxos, Leader Election, Mutual Exclusion, Concurrency Control, Replication Control, Stream Processing, Graph Processing, Structure of Networks, Scheduling,Distributed File Systems, Distributed Shared Memory, Sensor Networks, Security, Data-center Outage Studies, Cloud computing service deployment and maintenance."
            },
            {
                "code": "CSE475",
                "title": "Management Information System",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "Completion of 110 Credits",
                "topics": "Introduction to the components of the management information system and their integration for managerial control and decision support, major functional applications and impacts of information technology on individuals and the society, basic discussion of the environments, approaches, principles and processes of management, environmental forces, planning, organizing and control processes, motivation, teamwork, group dynamics and leadership in business and non-business organizations."
            },
            {
                "code": "CSE445",
                "title": "Smart Device App Development",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281, CSE341",
                "topics": "PREREQUISITE(S): Nil\n\nGoal of the course\n\nSomething to offer both the beginner and the experienced developer who is looking to sell his or her application inthe ever expanding application market. course covers important beginner topics such as “What is Smart device Application” and installing and using the development environment. This course then advance to practical working examples of core programming topics any developer will be happy to have atthe ready on the reference shelf.\n\nAssumed Knowledge: it’snot necessary, nor is prior experience in mobile phone development. It’s expected that participants will have some experience in software development and be familiar with basic development practices.\n\nTarget Platform(s): Android, iOS, firefox, tizen, ubuntu, Phonegap or any other future popular development platform\n\nContents:\n\n● Developing forMobile Devices: Hardware-Imposed Design Considerations ;Considering the Users’ Environment; Development Tools ● Creating Applications: Introducing the Application functionality; Application Life Cycle; Understanding Application Priority and Process States ● Fundamental U.I. Design :Introducing Views; Introducing L ayouts; Creating and Using Menus\n\n● Intents, Broadcast Receivers, Adapters, and the Internet ● Data Storage, Retrieval, and Sharing ● Maps, Geocoding, and Location-Based Services ● Working in the Background: Services; Threads; Notifications ● Peer-to-Peer Communication: Instant Messaging; SMS; ● Accessing Hardware: Media APIs; Camera; using Sensors; Telephony; Bluetooth; Managing Network and Wi-Fi Connections; Controlling Device Vibration. ● Graphics and animation: Drawing graphics; Creating animations ● Advanced Development: Security; Declaring and Enforcing Permissions; Using Int ernet Ser vices; Localization"
            },
            {
                "code": "CSE353",
                "title": "Introduction to Data Mining",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE265",
                "topics": "PREREQUISITE(S): CSE265\n\nIntroduction to Data Mining: Introduction to Data Mining, Data Warehousing, and OLAP, Classification Concepts, Decision Trees, Model Evaluation, and Classification Alternative Techniques, Association Analysis Concepts, Algorithms, and Association Analysis Advanced Concepts, Cluster Analysis Concepts, Algorithms, and Cluster Analysis Issues, Frequent-Pair Algorithms, Anomaly Detection.\n\nMachine Learning: Inductive learning, Rule Induction, Bayesian Learning, Neural Networks, and Genetic Algorithms, Model Ensembles, Learning Theory, and Instance-based Learning.\n\nAdvance Data Mining: Query Flocks, Page-Rank, Hubs-and-Authorities, Web Mining, Stream Mining, Matching Sequences, Mining Event Sequences, Event Discovery."
            },
            {
                "code": "ETE399",
                "title": "Digital Communication",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ETE281, MAT261",
                "topics": "Pulse modulation techniques: Sampling theorem, PAM, PWM, PPM. Pulse Code Modulation (PCM), differential PCM (DPCM), Delta Modulation (DM), Adaptive DM. Digital bandpass modulation: ASK, FSK, PSK, QPSK, M-ary PSK, QAM. Information theory: Entropy, channel capacity (Shannon-Hartley theorem), error-correcting codes, cyclic codes, convolutional codes.",
                "recommendedBooks": "Simon Haykin, Digital Communication Systems, Wiley.\nBernard Sklar, Digital Communications: Fundamentals and Applications, Prentice Hall."
            }
        ]
    },
    {
        "groupId": "group_b",
        "name": "Elective Courses with Lab: Group B (Theory + Lab)",
        "description": "Students must take at least two courses with associated lab from this technical engineering list.",
        "minCredits": 8.0,
        "courses": [
            {
                "code": "ETE357",
                "title": "Telecommunication Engineering",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "EEE241, ETE281",
                "topics": "Introduction: Principle, evolution, networks, exchange and international regulatory bodies. Telephone apparatus: Microphone, speakers, ringer, pulse and tone dialing mechanism, side-tone mechanism, local and central batteries and advanced features. Switching system: Introduction to analog system,\n\ndigital switching systems - space division switching, blocking probability and multistage switching, time division switching and two dimensional switching. Traffic analysis: Traffic characterization, grades of service, network blocking probabilities, delay system and queuing. Modern telephone services and network: Internet telephony, facsimile, integrated services digital network, asynchronous transfer mode and intelligent networks. Introduction to cellular telephony and satellite communication."
            },
            {
                "code": "ETE358",
                "title": "Telecommunication Engineering Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "EEE242, ETE282",
                "topics": "Laboratory Works based on ETE357"
            },
            {
                "code": "ETE451",
                "title": "Digital Signal Processing",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "ETE357",
                "topics": "Introduction to digital signals and digital signal processing, A/D conversion, sampling theorem, Illustration of aliasing, analysis of Discrete-Time Linear-Tme-Invariant (LTI) systems, Resolution of Discrete-Time signals into impulse, Convolution and correlation, Z-transform, Concept of Pole and Zero, Frequency domain representation of discrete-time systems and signals, Discrete Fourier series and discrete Fourier transform (DFT), computation of the DFT, Fast Fourier Transform (FFT), Discrete Cosine Transform (DCT), Signal flow graph representation of digital networks. Filter structure for IIR and FIR filters, Introduction to speech and Image processing."
            },
            {
                "code": "ETE452",
                "title": "Digital Signal Processing Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "ETE358",
                "topics": "Laboratory experiments based on ETE451 using MATLAB / Python: Generation and manipulation of discrete-time signals. Discrete Fourier Transform (DFT) and Fast Fourier Transform (FFT) algorithms. Design and simulation of Finite Impulse Response (FIR) and Infinite Impulse Response (IIR) digital filters. Audio and speech signal filtering.",
                "recommendedBooks": "John G. Proakis, Digital Signal Processing Using MATLAB, Cengage."
            },
            {
                "code": "EEE425",
                "title": "VLSI Design",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE263, CSE264",
                "topics": "VLSI technology: terminologies and trends,MOS transistor characteristics and equations, MOS fabrication process, nMOS & CMOS inverters: dc & transient characteristics, pass transistor & pass gates, Derivation of drain-to source current (Ids), Ids VS Vds, Pull-up to pull down ratio, CMOS & nMOS design Style, Stick Diagrams, CMOS layout and design rules: λ-based design rule. Complex CMOS gates: NAND, NOR, Exclusive OR, Resistance & Capacitance estimation and Modeling, raise time and fall time calculation of gate capacitance, Scaling & scaling factor of different parameters. Signal propagation delay, noise margin and power consumption, Interconnect, BiCMOS circuits. CMOS building blocks: adders, counters, multipliers and barrel shifters, Parity generator, Data paths, memory structures: Dynamic RAM cells, PLAs and FPGAs, VLSI testing: objectives & strategies."
            },
            {
                "code": "EEE456",
                "title": "VLSI Design Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE263, CSE264",
                "topics": "Lab works based on theory course CSE359."
            },
            {
                "code": "CSE347",
                "title": "Advanced Networking",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE341",
                "topics": "Internet addressing, routing and routed algorithm., NAT, PAT, Sub-netting, Sub-netting the subnet (VLSM), VLAN, ICMP v4 and v6. IP multicasting, RSVP, next generation IP - IPng, ATM, wireless - radio basics, satellite systems, WAP, current trends, issues with wireless over TCP, multiple conversation, socket, Denial service attack, congestion control - control vs. avoidance, overview of algorithms, congestion in the internet, Mobile IP, Voice over IP (VoIP), VPNs, network security, management - Quality of Service (QoS), network vs. distributed systems management, protocols, web-based management and other advanced TOPICS: Bluetooth, Wi-Fi (IEEE 802.11g), Wi-Max (IEEE 802.16)."
            },
            {
                "code": "CSE348",
                "title": "Advanced Networking Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE341, CSE342",
                "topics": "Laboratory Works based on Theory Course CSE347"
            },
            {
                "code": "CSE375",
                "title": "Advanced Algorithm",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE265",
                "topics": "Introduction to the design and analysis of efficient algorithms, models of computation, efficient sorting and searching, algorithms for algebraic problems, graph algorithms, polynomial time algorithms for matching, Fusion trees and their applications to integer sorting, Fibonacci heaps and self adjusting search trees,splay trees, linking and cutting trees.State-of-the-art algorithms for minimum spanning trees, shortest path problem, Network flows pre flow-push algorithms, max flow algorithms, linear programming, scaling algorithms, dynamic programming, probabilistic methods, approximation algorithms, completeness, lower bound theory for parallel computation, lower bounds on the resource requirements of algorithms. Non polynomial Algorithm and satisfiability set construction."
            },
            {
                "code": "CSE376",
                "title": "Advanced Algorithm Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE266",
                "topics": "Laboratory Work based on Theory Course CSE375"
            },
            {
                "code": "CSE457",
                "title": "Advanced Embedded Systems",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE381",
                "topics": "PREREQUISITE(S): CSE361, CSE381\n\nCourse Instructor is requested to target a specific mid-range 32/64-bit Microcontroller (MCU) with following basic features : 1. Analogue to Digital Converter (ADC); 2. Analog Comparator; (optional) 3. Pulse Width Modulation and/or Output Compare channels; 4. External interrupt(s); 5. Watch Dog Timer 6. Internal Timers 7. External and internal clock input. 8. Hardware I2C, SPI and CAN bus capabilities. 9. USART, USB communication. 10. Parallel I/O ports. 11. JTAG/SWD 12. Memory Protection Unit(MPU). 13. Multi- Threading 14. Multi-Core (optional) 15. Digital to Analogue (DAC) Converter 16. Direct Memory Access (DMA) Software(s) : Course instructor is requested to target open-source / freely available tool-chain, IDE. Target language : C/C++/assembly/ Java. Suggested MCU: ARM Cortex M3 /M4 based mcu (as on 2014) or any popular 32/64 bit MCU with System on Chip (SoC) and Real Time OS capability\n\nFollowing Topics are based on ARM Cotex M3/M4 MCU (as on 2014): 1. Introduction: What Is the ARM Cortex-M3/M4 Processor?; Background of ARM and ARM Architecture; The Thumb-2 Technology and Instruction Set Architecture.; Cortex-M3 Processor Applications;\n\n2. Overview of the Cortex-M3/M4: Registers; Operation Modes; The Built-In Nested Vectored Interrupt Controller; The Memory Map; The Bus Interface; The MPU;Interrupts and Exceptions; Debugging Support and Tool chain setup.\n\n3.Configuration: Registers; Special Registers; Clock Distribution; I/O Pins; Pin Remapping; Peripheral Configuration; Vector Tables; Stack Memory Operations\n\n4. Memory Systems : Memory System Features Overview; Memory Maps; Memory Access Attributes; Bit-Band Operations\n\n5. Cortex-M3/ M4 Implementation Overview: The Pipeline; Bus Interfaces on the Cortex-M3/M4; Other Interfaces on the Cortex-M3/M4\n\n6. Exceptions: Exception Types; Definitions of Priority; Vector Tables;Interrupt Inputs and Pending Behavior; Fault Exceptions; Supervisor Call and Pendable Service Call\n\n7.The Nested Vectored Interrupt Controller and Interrupt Control: Nested Vectored Interrupt Controller Overview; The Basic Interrupt Configuration;Software Interrupts; The SYSTICK Timer\n\n8.The Memory Protection Unit: MPU Registers; Setting Up the MPU 9.Power Management: Sleep Modes; Multiprocessor Communication\n\n10. Asynchronous Serial Communication: Polling Implementation; Initialization;\n\n11. SPI: Protocol; SPI Peripheral; EEPROM Interface\n\n12. I 2 C: I 2 C Protocol; I 2 C Interface;\n\n13. CAN Bus: CAN Protocol; CAN Interface\n\n13. Timers: PWM Output; Input Capture;\n\n14. Direct Memory Access: DMA Architecture; SPI DMA Support;\n\n15. Digital Analog Converter\n\n16. Analog Digital Converter\n\n17. Real-Time Operating Systems(RTOS): System on a Chip (SoC);Threads; Synchronization; Interrupt Handlers;Multitasking;\n\n18. Sensors and modules: NAND Flash, external RAM; Ultrasonic Sensors; LCD Touch Screen; VGA display etc."
            },
            {
                "code": "CSE458",
                "title": "Advanced Embedded Systems Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE381",
                "topics": "Laboratory experiments based on CSE457: Advanced 32-bit ARM Cortex microcontroller programming. Real-time operating systems (FreeRTOS): Task scheduling, queues, semaphores, mutexes. Interfacing sensors (I2C, SPI), wireless transceivers (ZigBee, BLE, Wi-Fi), motor drivers. IoT cloud telemetry integration.",
                "recommendedBooks": "Embedded Systems Lab Manual, Dept. of CSE, Southeast University."
            },
            {
                "code": "CSE471",
                "title": "Web and Internet Programming",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE345",
                "topics": "HTML, CSS, Basic web programming, PHP basics, OOP in PHP, Relational Database and MySQL, JavaScript, Regular Expression, Sessions and Cookies, MVC, PHP Frameworks, JQuery, AJAX, Project Work."
            },
            {
                "code": "CSE472",
                "title": "Web and Internet Programming Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE345",
                "topics": "Lab works Based on theory course CSE471"
            },
            {
                "code": "CSE473",
                "title": "Software Development and Project Management",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE345",
                "topics": "Foundations of software project management; organization structure and staffing; motivation, authority and influence; conflict management; proposal preparation; a large engineering software system management; client management; managing software project teams; project planning and scheduling; risk management; configuration management; pricing estimation and cost control; quality assurance and accreditation; factors affecting software quality; software quality assurance plans; business context and legal issues for software projects; software measurement: Software testing- white-box testing, black-box testing, Unit testing, Functional testing, load testing; upgrading and maintenance; network systems; and international project management; Understanding Cloud computing, Differences between hosted services and cloud services; Learning about bigdata and problem solving using bigdata."
            },
            {
                "code": "CSE474",
                "title": "Software Development and Project Management Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE345",
                "topics": "Lab works based on theory course CSE473."
            },
            {
                "code": "CSE465",
                "title": "Parallel and Distributed Computing",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE361, CSE381",
                "topics": "PREREQUISITE(S): CSE375, CSE361, CSE347 Goal of this course:- This course is to present foundational concepts of high performance and distributed computing. To introduce advanced computer architectures, organisation, and design. To introduce the basics of parallel programming - algorithm design and analysis. To encourage students to think in new way i.e. the parallel way.\n\nCourse Content: · Issues in High Performance Computing : Moore’s Law, Processor Performance; Technological Limitations: Frequency, Power, Instruction Level Parallelism and Memory Wall; Multi-Core Technology; Introduction to Cluster, Grid and Cloud Computing; Parallel vs Distributed Computing; · Parallel Architectures: Implicit Parallelism; Introduction to Pipelining and Limitation(s); Introduction to Superscalar and Limitation(s); Graphics Processing Unit (GPU); Flynn’s Taxonomy: SISD, SIMD, MISD, MIMD; Interconnection Networks: Static, Dynamic; Evaluating Interconnection Networks; Communication Costs in Parallel Machines; Memory System Performance; Cache Coherence in Multiprocessor Systems. · Parallel Algorithm Design: Parallel Computing Platforms: Control Structure, Communication Model, Shared-Address-Space Machine, Message-Passing Platform; Designing Parallel Algorithms: Partitioning, Data Decomposition, Functional Decomposition, Communication, Agglomeration, Mapping; Common Parallel Programming Models; Parallel Algorithm Design Examples. · Performance Analysis: Performance Metrics: Execution Time, Total Parallel Overhead, Speedup, Efficiency; Cost of a Parallel System; Effect of Granularity on Performance; Scalability of Parallel Systems; Amdahl’s Law; Gustafson-Barsis Law; Scaling Characteristics of Parallel Programs; Isoefficiency Metric of Scalability. · Message Passing Interface : MPI Basics, MPI blocking send/receive function calls; Inter Process Communication; Asynchronous communication; Split-recombine task/data; MPI Derived Data Types · Programming Shared Address Space Platforms: Programming Shared Address Space Platforms(PtThread), Thread Basics, Pthreads API, Thread Management, Creating Threads, Thread Attributes, Terminating Thread, Passing Arguments to Threads, Joining & Detaching Threads, Synchronization Issues, Mutex: Creating & Destroying, Locking & Unlocking, Overheads of Locking, Alleviating Locking Overhead, Monitor; Read-Write Locks · Advanced Topic on Parallel and Distributed Computing: e.g. Map Reduce. · Distributed Computing: Client/Server Computing: Client, Server, Network; Client/Server Terminology, Characteristics, Applications, Database Usage; Classes of Client/Server Applications: Host-Based Processing, Server-Based Processing, Client-Based Processing; Disadvantages of Two-Tier Architecture; Three-Tier Client/Server Architecture; Middleware; Distributed Message Passing: Reliability versus Unreliability, Blocking versus Nonblocking; Client/Server Binding; Service-Oriented Architecture (SOA); Clusters; Load Balancing"
            },
            {
                "code": "CSE466",
                "title": "Parallel and Distributed Computing Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE361, CSE381",
                "topics": "Laboratory experiments based on CSE465: Multi-threaded programming using POSIX threads (pthreads) and Java threads. Shared-memory parallel programming with OpenMP directives. Distributed-memory message passing with MPI (Message Passing Interface). GPU computing with CUDA C/C++. Performance benchmarking and speedup calculation.",
                "recommendedBooks": "Peter S. Pacheco, An Introduction to Parallel Programming, Morgan Kaufmann."
            },
            {
                "code": "CSE351",
                "title": "Advanced Java",
                "category": "Elective",
                "prototype": "Theory",
                "credits": 3.0,
                "prerequisite": "CSE281",
                "topics": "Threads, Generics, Reflection API, Java Network Programming, Advanced JDBC Programming, Introduction to J2EE, Java Server Technology, JSP, RMI, Frameworks, Project Work."
            },
            {
                "code": "CSE352",
                "title": "Advanced Java Lab",
                "category": "Elective",
                "prototype": "Practical",
                "credits": 1.0,
                "prerequisite": "CSE281",
                "topics": "Laboratory Work based on Theory Course CSE4047 (Advanced Java)."
            }
        ]
    }
]
};

export function getCurriculumByBatch(batchId: string): CurriculumData {
  return batchId === "batch_60_71" ? BATCH_60_71_CURRICULUM : BATCH_72_CURRICULUM;
}
