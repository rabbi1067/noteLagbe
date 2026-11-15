"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Sparkles,
  Printer,
  CheckCircle,
  Flame,
  AlertCircle,
  Send,
  Trash2,
  Lock,
  Clock,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import katex from "katex";

interface TeacherOption {
  id: number;
  name: string;
  initial?: string;
  designation?: string;
}

interface ExamQuestionLink {
  id: string;
  label: string;
  marks?: string;
  prompt: string;
  topic?: string;
}

interface ExamPaperLink {
  id: string;
  title: string;
  type: string; // MID_QUESTION, FINAL_QUESTION, QUIZ_CT, NOTE
  semester: string;
  faculty?: string;
  facultyId?: number;
  questions: ExamQuestionLink[];
}

function generateQuestionsForResource(
  code: string,
  title: string,
  category: string,
  resTitle: string,
  semester: string,
  facultyName: string
): ExamQuestionLink[] {
  const isDS = code.includes("241") || title.includes("data struct");

  if (category === "MID_QUESTION") {
    if (isDS) {
      return [
        {
          id: `${resTitle}-q1a`,
          label: "1.(a) Time Complexity Analysis",
          marks: "3.5M",
          prompt: `${code} ${resTitle} Question 1.(a): Find out the Time Complexity of the given nested loop program (for i=1..n; for j=1..n j=j*3; k=j while k>1 k=k/3) by ${facultyName}. Provide step-by-step mathematical model answer.`,
          topic: "Time Complexity Analysis",
        },
        {
          id: `${resTitle}-q1b`,
          label: "1.(b) Selection Sort & Binary Search",
          marks: "6.5M",
          prompt: `${code} ${resTitle} Question 1.(b): Selection Sort array [-9, -2, 10, 12, 30, -2, 28] in descending order & Binary Search steps for finding 7 by ${facultyName}.`,
          topic: "Selection Sort & Binary Search",
        },
        {
          id: `${resTitle}-q1-full`,
          label: "1. (Full) Question 1 [10M]",
          marks: "10M",
          prompt: `${code} ${resTitle} Question 1: complete model answer for 1.(a) Time Complexity Analysis and 1.(b) Selection Sort & Binary Search by ${facultyName}.`,
          topic: "Full Question 1",
        },
        {
          id: `${resTitle}-q2a`,
          label: "2.(a) Doubly Linked List Node Manipulation",
          marks: "4.0M",
          prompt: `${code} ${resTitle} Question 2.(a): Doubly Linked List structure definition, pointer manipulation rules, and memory diagrams by ${facultyName}.`,
          topic: "Doubly Linked List",
        },
        {
          id: `${resTitle}-q2b`,
          label: "2.(b) Stack Infix to Postfix Conversion",
          marks: "6.0M",
          prompt: `${code} ${resTitle} Question 2.(b): Infix to Postfix conversion using Stack with operator precedence table by ${facultyName}.`,
          topic: "Stack Applications",
        },
        {
          id: `${resTitle}-q3a`,
          label: "3.(a) Circular Queue using Array",
          marks: "5.0M",
          prompt: `${code} ${resTitle} Question 3.(a): Circular Queue implementation using Array with front, rear, and modulo arithmetic by ${facultyName}.`,
          topic: "Circular Queue",
        },
      ];
    }
    return [
      {
        id: `${resTitle}-m1`,
        label: "Q1. Midterm Theoretical Principles & Proofs",
        marks: "5M",
        prompt: `Explain and solve Question 1 from ${resTitle} for ${code} under ${facultyName}: Core principles, formulas, and definitions.`,
      },
      {
        id: `${resTitle}-m2`,
        label: "Q2. Mathematical Derivations & Code Implementation",
        marks: "5M",
        prompt: `Provide step-by-step mathematical derivation and code for Question 2 from ${resTitle} for ${code} by ${facultyName}.`,
      },
      {
        id: `${resTitle}-m3`,
        label: "Q3. Scenario-based High-Yield Midterm Problem",
        marks: "10M",
        prompt: `Solve the comprehensive scenario question from ${resTitle} for ${code} by ${facultyName} with complete working.`,
      },
    ];
  }

  if (category === "FINAL_QUESTION") {
    if (isDS) {
      return [
        {
          id: `${resTitle}-f1`,
          label: "1. Binary Search Tree (BST) Node Deletion",
          marks: "10M",
          prompt: `Solve ${resTitle} Question 1: Binary Search Tree (BST) node deletion cases (0, 1, 2 children) and inorder successor algorithms with complete C++ code by ${facultyName}.`,
          topic: "BST Deletion",
        },
        {
          id: `${resTitle}-f2`,
          label: "2. AVL Tree LL/RR/LR/RL Rotations",
          marks: "10M",
          prompt: `Solve ${resTitle} Question 2: AVL Tree balance factors and step-by-step LL, RR, LR, RL single and double rotations for keys [50, 20, 60, 10, 8, 15] by ${facultyName}.`,
          topic: "AVL Rotations",
        },
        {
          id: `${resTitle}-f3`,
          label: "3. Graph BFS/DFS & Dijkstra Shortest Path",
          marks: "10M",
          prompt: `Solve ${resTitle} Question 3: Graph BFS and DFS traversal algorithms and Dijkstra Shortest Path derivation with trace table by ${facultyName}.`,
          topic: "Graph Traversal",
        },
        {
          id: `${resTitle}-f4`,
          label: "4. Max-Heap Construction & Heap Sort",
          marks: "10M",
          prompt: `Solve ${resTitle} Question 4: Max-Heap construction from array [12, 11, 13, 5, 6, 7] and Heap Sort pass-by-pass dry run by ${facultyName}.`,
          topic: "Heap Sort",
        },
        {
          id: `${resTitle}-f5`,
          label: "5. Hash Table Linear & Quadratic Probing",
          marks: "10M",
          prompt: `Solve ${resTitle} Question 5: Hash Table collision resolution using Linear Probing and Quadratic Probing with given hash function by ${facultyName}.`,
          topic: "Hashing",
        },
      ];
    }
    return [
      {
        id: `${resTitle}-f1`,
        label: "Q1. Comprehensive Final Syllabus Repeated Questions",
        marks: "10M",
        prompt: `Analyze and solve Question 1 from ${resTitle} for ${code} by ${facultyName}.`,
      },
      {
        id: `${resTitle}-f2`,
        label: "Q2. Core Algorithm / System Design Problem",
        marks: "10M",
        prompt: `Provide model solution for Question 2 from ${resTitle} for ${code} by ${facultyName}.`,
      },
      {
        id: `${resTitle}-f3`,
        label: "Q3. Complex Analytical Scenario Solution",
        marks: "10M",
        prompt: `Step-by-step model answer for Question 3 from ${resTitle} for ${code} by ${facultyName}.`,
      },
    ];
  }

  if (category === "QUIZ_CT") {
    if (isDS) {
      return [
        {
          id: `${resTitle}-ct1`,
          label: "CT 1. Asymptotic Limit Proof (Big-O)",
          marks: "5.0M",
          prompt: `Solve CT Question 1 from ${resTitle}: Formal definition of Big-O notation and mathematical proof that 3n^2 + 5n + 7 = O(n^2) with c and n0 constants under ${facultyName}.`,
          topic: "Big-O Proof",
        },
        {
          id: `${resTitle}-ct2`,
          label: "CT 2. Double Pointer (**ptr) & Memory Leak",
          marks: "5.0M",
          prompt: `Solve CT Question 2 from ${resTitle}: Pointer arithmetic, double pointers (**ptr), and new/delete memory deallocation in C++ with memory diagrams by ${facultyName}.`,
          topic: "Pointers & Memory",
        },
        {
          id: `${resTitle}-ct3`,
          label: "CT 3. Stack Balanced Parentheses Check",
          marks: "5.0M",
          prompt: `Solve CT Question 3 from ${resTitle}: Balanced parentheses checking algorithm using Stack with step-by-step trace of string {[()()]} by ${facultyName}.`,
          topic: "Stack Balanced Parentheses",
        },
        {
          id: `${resTitle}-ct4`,
          label: "CT 4. Circular Queue Array Modulo Trace",
          marks: "5.0M",
          prompt: `Solve CT Question 4 from ${resTitle}: Circular Queue array enqueue/dequeue operations and overflow/underflow conditions with modulo arithmetic by ${facultyName}.`,
          topic: "Circular Queue Modulo",
        },
      ];
    }
    return [
      {
        id: `${resTitle}-ct1`,
        label: "CT 1. Core Concept Quick Solution",
        marks: "5M",
        prompt: `Solve Class Test (CT) Problem 1 from ${resTitle} for ${code} by ${facultyName}.`,
      },
      {
        id: `${resTitle}-ct2`,
        label: "CT 2. Rapid Formula & Numerical Trace",
        marks: "5M",
        prompt: `Solve Class Test (CT) Problem 2 from ${resTitle} for ${code} by ${facultyName}.`,
      },
    ];
  }

  // NOTE / OTHER
  return [
    {
      id: `${resTitle}-note1`,
      label: "📖 Note 1: Core Theoretical Highlights",
      marks: "Note",
      prompt: `Summarize Section 1 from ${resTitle} for ${code} under ${facultyName}: Essential definitions, rules, and core concepts.`,
    },
    {
      id: `${resTitle}-note2`,
      label: "📖 Note 2: Code Snippets & Practical Implementations",
      marks: "Note",
      prompt: `Explain the practical code patterns and algorithms discussed in ${resTitle} for ${code} by ${facultyName}.`,
    },
    {
      id: `${resTitle}-note3`,
      label: "📖 Note 3: Exam High-Yield Formula Summary",
      marks: "Note",
      prompt: `Extract all high-yield exam formulas and exam tips from ${resTitle} for ${code} by ${facultyName}.`,
    },
  ];
}

export function buildLinkedAcademicItems(
  code: string,
  title?: string,
  activeTeacher?: TeacherOption | null,
  rawResources?: any[]
): ExamPaperLink[] {
  const cleanCode = (code || "").toUpperCase();
  const cleanTitle = (title || "").toLowerCase();

  const items: ExamPaperLink[] = [];

  // 1. Process real database resources if available
  if (rawResources && rawResources.length > 0) {
    rawResources.forEach((res) => {
      const teacher = res.teacher;
      const teacherName = teacher?.name || "";
      const teacherInitial = teacher?.initial || "";
      const teacherLabel = teacherInitial ? `[${teacherInitial}]` : (teacherName ? `[${teacherName.split(" ").slice(-1)[0]}]` : "");
      const resType = (res.type || "OTHER").toUpperCase();
      const resTitle = res.title || `${cleanCode} Material`;
      const semester = res.semesterName || "Academic Archive";

      // Filter by activeTeacher if selected
      if (activeTeacher) {
        const matchesTeacher =
          (teacher?.id && teacher.id === activeTeacher.id) ||
          (teacherName && teacherName.toLowerCase().includes(activeTeacher.name.toLowerCase())) ||
          (activeTeacher.initial && teacherInitial && activeTeacher.initial.toUpperCase() === teacherInitial.toUpperCase());
        if (!matchesTeacher && teacher) {
          return; // Skip materials from other teachers when a specific faculty is selected
        }
      }

      // Determine category type
      let category = "NOTE";
      if (resType.includes("MID") || resTitle.toLowerCase().includes("midterm")) {
        category = "MID_QUESTION";
      } else if (resType.includes("FINAL") || resTitle.toLowerCase().includes("final")) {
        category = "FINAL_QUESTION";
      } else if (resType.includes("QUIZ") || resType.includes("CT") || resTitle.toLowerCase().includes("quiz") || resTitle.toLowerCase().includes("ct")) {
        category = "QUIZ_CT";
      }

      // Generate question links for this specific item
      const questions: ExamQuestionLink[] = generateQuestionsForResource(
        cleanCode, cleanTitle, category, resTitle, semester, teacherName || activeTeacher?.name || "Instructor"
      );

      items.push({
        id: `res-${res.id || Math.random()}`,
        title: resTitle,
        type: category,
        semester,
        faculty: teacherName ? `${teacherName} ${teacherLabel}` : (activeTeacher ? activeTeacher.name : undefined),
        facultyId: teacher?.id,
        questions,
      });
    });
  }

  // 2. If no items found for this teacher or catalog is empty, generate verified curriculum items
  if (items.length === 0) {
    const teacherName = activeTeacher?.name || "Sakib Mahmud";
    const teacherLabel = activeTeacher?.initial ? `[${activeTeacher.initial}]` : "[SMA]";

    // Default Midterm Paper
    items.push({
      id: `${cleanCode}-sp24-mid`,
      title: `${cleanCode} Spring 2024 Midterm Question Paper`,
      type: "MID_QUESTION",
      semester: "Spring 2024",
      faculty: `${teacherName} ${teacherLabel}`,
      questions: [
        {
          id: "q1a",
          label: "1.(a) Time Complexity Analysis",
          marks: "3.5M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 1.(a): Find out the Time Complexity of the given nested loop program (for i=1..n; for j=1..n j=j*3; k=j while k>1 k=k/3) by ${teacherName}. Provide step-by-step mathematical model answer.`,
          topic: "Time Complexity of Nested Loop",
        },
        {
          id: "q1b",
          label: "1.(b) Selection Sort & Binary Search",
          marks: "6.5M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 1.(b): Selection Sort array [-9, -2, 10, 12, 30, -2, 28] in descending order & Binary Search steps for finding 7 by ${teacherName}.`,
          topic: "Selection Sort (Descending) & Binary Search",
        },
        {
          id: "q1-full",
          label: "1. (Full) Question 1 [10M]",
          marks: "10M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 1: complete model answer for 1.(a) Time Complexity Analysis and 1.(b) Selection Sort & Binary Search by ${teacherName}.`,
          topic: "Complete Question 1",
        },
        {
          id: "q2a",
          label: "2.(a) Doubly Linked List Node Manipulation",
          marks: "4.0M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 2.(a): Doubly Linked List structure definition and pointer manipulation rules with code and memory diagrams by ${teacherName}.`,
          topic: "Doubly Linked List",
        },
        {
          id: "q2b",
          label: "2.(b) Stack Infix to Postfix Conversion",
          marks: "6.0M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 2.(b): Infix to Postfix conversion using Stack with operator precedence table by ${teacherName}.`,
          topic: "Stack Applications",
        },
        {
          id: "q3a",
          label: "3.(a) Circular Queue using Array",
          marks: "5.0M",
          prompt: `${cleanCode} Spring 2024 Midterm Question 3.(a): Circular Queue implementation using Array with front, rear, and modulo arithmetic by ${teacherName}.`,
          topic: "Circular Queue",
        },
      ],
    });

    // Default Final Paper
    items.push({
      id: `${cleanCode}-sp24-fin`,
      title: `${cleanCode} Spring 2024 Final Exam Paper`,
      type: "FINAL_QUESTION",
      semester: "Spring 2024",
      faculty: `${teacherName} ${teacherLabel}`,
      questions: [
        {
          id: "f1-bst",
          label: "1. Binary Search Tree (BST) Node Deletion",
          marks: "10M",
          prompt: `Solve ${cleanCode} Final Exam Question 1: Binary Search Tree (BST) node deletion cases (0, 1, 2 children) and inorder successor algorithms with complete C++ code by ${teacherName}.`,
          topic: "BST Deletion",
        },
        {
          id: "f2-avl",
          label: "2. AVL Tree LL/RR/LR/RL Rotations",
          marks: "10M",
          prompt: `Solve ${cleanCode} Final Exam Question 2: AVL Tree balance factors and step-by-step LL, RR, LR, RL single and double rotations for keys [50, 20, 60, 10, 8, 15] by ${teacherName}.`,
          topic: "AVL Rotations",
        },
        {
          id: "f3-graph",
          label: "3. Graph BFS/DFS & Dijkstra Shortest Path",
          marks: "10M",
          prompt: `Solve ${cleanCode} Final Exam Question 3: Graph BFS and DFS traversal algorithms and Dijkstra Shortest Path derivation with trace table by ${teacherName}.`,
          topic: "Graph Traversal",
        },
        {
          id: "f4-heap",
          label: "4. Max-Heap Construction & Heap Sort",
          marks: "10M",
          prompt: `Solve ${cleanCode} Final Exam Question 4: Max-Heap construction from array [12, 11, 13, 5, 6, 7] and Heap Sort pass-by-pass dry run by ${teacherName}.`,
          topic: "Heap Sort",
        },
      ],
    });

    // Default CT & Quiz Paper
    items.push({
      id: `${cleanCode}-ct`,
      title: `${cleanCode} Quiz & Class Test (CT) Questions`,
      type: "QUIZ_CT",
      semester: "Class Tests",
      faculty: `${teacherName} ${teacherLabel}`,
      questions: [
        {
          id: "ct1",
          label: "CT 1. Asymptotic Limit Proof (Big-O)",
          marks: "5.0M",
          prompt: `Solve CT 1 for ${cleanCode}: Formal definition of Big-O notation and mathematical proof that 3n^2 + 5n + 7 = O(n^2) with c and n0 constants under ${teacherName}.`,
          topic: "Big-O Proof",
        },
        {
          id: "ct2",
          label: "CT 2. Double Pointer (**ptr) & Memory Leak",
          marks: "5.0M",
          prompt: `Solve CT 2 for ${cleanCode}: Pointer arithmetic, double pointers (**ptr), and new/delete memory deallocation in C++ with memory diagrams by ${teacherName}.`,
          topic: "Pointers & Memory",
        },
        {
          id: "ct3",
          label: "CT 3. Stack Balanced Parentheses Check",
          marks: "5.0M",
          prompt: `Solve CT 3 for ${cleanCode}: Balanced parentheses checking algorithm using Stack with step-by-step trace of string {[()()]} by ${teacherName}.`,
          topic: "Stack Balanced Parentheses",
        },
        {
          id: "ct4",
          label: "CT 4. Circular Queue Array Modulo Trace",
          marks: "5.0M",
          prompt: `Solve CT 4 for ${cleanCode}: Circular Queue array enqueue/dequeue operations and overflow/underflow conditions with modulo arithmetic by ${teacherName}.`,
          topic: "Circular Queue Modulo",
        },
      ],
    });

    // Default Lecture Hand Notes
    items.push({
      id: `${cleanCode}-notes`,
      title: `${cleanCode} Lecture Hand Notes & Cheatsheet`,
      type: "NOTE",
      semester: "Course Notes",
      faculty: `${teacherName} ${teacherLabel}`,
      questions: [
        {
          id: "note1",
          label: "📖 Note 1: Dynamic Memory (new/delete) in C++",
          marks: "Note",
          prompt: `Summarize Key Note 1 for ${cleanCode} under ${teacherName}: Dynamic Memory Allocation (new/delete), dangling pointers, memory leaks, and safe pointer practice.`,
          topic: "Memory Allocation",
        },
        {
          id: "note2",
          label: "📖 Note 2: Linked List Operations & Edge Cases",
          marks: "Note",
          prompt: `Summarize Key Note 2 for ${cleanCode} under ${teacherName}: Singly and Doubly Linked List node insertion and deletion algorithms with all boundary edge cases.`,
          topic: "Linked List Notes",
        },
        {
          id: "note3",
          label: "📖 Note 3: Stack & Queue Core Implementations",
          marks: "Note",
          prompt: `Summarize Key Note 3 for ${cleanCode} under ${teacherName}: Stack and Queue implementation via array and linked list with infix-to-postfix conversion rules.`,
          topic: "Stack & Queue Notes",
        },
        {
          id: "note4",
          label: "📖 Note 4: Tree & Graph High-Yield Exam Formulas",
          marks: "Note",
          prompt: `Summarize Key Note 4 for ${cleanCode} under ${teacherName}: Binary Tree properties, BST search complexity, AVL rotation formulas, and Graph representation.`,
          topic: "Tree & Graph Formulas",
        },
      ],
    });
  }

  return items;
}

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseCode: string;
  courseTitle?: string;
  courseDepartment?: string;
  isCourseUnlocked?: boolean;
  teachers?: TeacherOption[];
  resources?: any[];
}

export default function CheatSheetModal({
  isOpen,
  onClose,
  courseCode,
  courseTitle,
  courseDepartment,
  isCourseUnlocked = false,
  teachers = [],
  resources = [],
}: CheatSheetModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"chat" | "cheatsheet">("chat");

  // Real academic resources loaded from course or API
  const [courseResources, setCourseResources] = useState<any[]>(resources || []);

  useEffect(() => {
    if (resources && resources.length > 0) {
      setCourseResources(resources);
    } else if (isOpen && courseCode) {
      api.resources
        .getByCourse(courseCode)
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setCourseResources(res);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, courseCode, resources]);

  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Category filter state: ALL, MID_QUESTION, FINAL_QUESTION, QUIZ_CT, NOTE
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Question Linker States
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [isQuestionLinkerOpen, setIsQuestionLinkerOpen] = useState(false);

  // Clear Chat Confirmation Modal States
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  // Static Cheat Sheet State
  const [sheetData, setSheetData] = useState<any>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const questionsScrollRef = useRef<HTMLDivElement>(null);
  const promptsScrollRef = useRef<HTMLDivElement>(null);

  // Selected faculty display name (must be declared before callbacks and hooks)
  const activeTeacher = teachers?.find((t) => t.id === selectedTeacherId);
  const teacherInit = activeTeacher?.initial || "FAC";

  // Catalog of linked academic items for this course (filtered by active teacher)
  const allLinkedItems: ExamPaperLink[] = useMemo(() => {
    return buildLinkedAcademicItems(courseCode, courseTitle, activeTeacher, courseResources);
  }, [courseCode, courseTitle, activeTeacher, courseResources]);

  // Filter items based on active category
  const filteredPapers = useMemo(() => {
    if (selectedCategory === "ALL") return allLinkedItems;
    return allLinkedItems.filter((item) => item.type === selectedCategory);
  }, [allLinkedItems, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: allLinkedItems.length,
      mid: allLinkedItems.filter((i) => i.type === "MID_QUESTION").length,
      final: allLinkedItems.filter((i) => i.type === "FINAL_QUESTION").length,
      quiz: allLinkedItems.filter((i) => i.type === "QUIZ_CT").length,
      note: allLinkedItems.filter((i) => i.type === "NOTE").length,
    };
  }, [allLinkedItems]);

  useEffect(() => {
    if (filteredPapers.length > 0) {
      if (!filteredPapers.some((p) => p.id === selectedPaperId)) {
        setSelectedPaperId(filteredPapers[0].id);
      }
    } else {
      setSelectedPaperId("");
    }
  }, [filteredPapers, selectedPaperId]);

  const currentPaper = filteredPapers.find((p) => p.id === selectedPaperId) || filteredPapers[0] || null;

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat messages and cheat sheet when modal opens
  useEffect(() => {
    if (isOpen && courseCode) {
      if (isCourseUnlocked) {
        setChatLoading(true);
        api.aiExamChat
          .getMessages(courseCode)
          .then((res) => {
            setMessages(Array.isArray(res) ? res : []);
          })
          .catch((err) => {
            console.error("Failed to load chat history:", err);
          })
          .finally(() => setChatLoading(false));
      }

      setSheetLoading(true);
      api.courses
        .getCheatSheet(courseCode)
        .then((res) => setSheetData(res))
        .catch(() => setSheetData(null))
        .finally(() => setSheetLoading(false));
    }
  }, [isOpen, courseCode, isCourseUnlocked]);

  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(language === "bn" ? "কপি করা হয়েছে!" : "Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    if (!isCourseUnlocked) {
      toast.error(
        language === "bn"
          ? "এআই এক্সাম রিভিশন অ্যাসিস্ট্যান্ট ব্যবহারের জন্য কোর্সটি আনলক করুন।"
          : "Please unlock this course to chat with the AI Exam Assistant."
      );
      return;
    }

    const optimisticUserMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      courseCode,
      teacherId: selectedTeacherId,
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputMessage("");
    setSending(true);

    try {
      const res = await api.aiExamChat.sendMessage({
        courseCode,
        courseTitle,
        courseDepartment,
        teacherName: activeTeacher?.name || null,
        message: text,
        teacherId: selectedTeacherId,
        language,
      });

      if (res && res.assistantMessage) {
        setMessages((prev) => [...prev, res.assistantMessage]);
      } else {
        // Refresh full conversation if format differed
        const fresh = await api.aiExamChat.getMessages(courseCode);
        setMessages(fresh || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const confirmClearChat = async () => {
    setClearingChat(true);
    try {
      await api.aiExamChat.clearMessages(courseCode);
      setMessages([]);
      setShowClearConfirmModal(false);
      toast.success(
        language === "bn"
          ? "চ্যাট হিস্টোরি সফলভাবে মুছে ফেলা হয়েছে।"
          : "Chat conversation cleared."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to clear conversation.");
    } finally {
      setClearingChat(false);
    }
  };

  // Dynamic suggestion pills based on selected teacher or general and current interface language
  const promptSuggestions = activeTeacher
    ? language === "bn"
      ? [
          `⚡ ${activeTeacher.name} [${teacherInit}] স্যারের পরীক্ষার স্পেশাল সাজেশন ও বারবার আসা টপিক কী কী?`,
          `🔥 ${teacherInit} স্যারের বিগত মিডটার্ম ও ফাইনাল প্রশ্ন অ্যানালাইসিস করে গুরুত্বপূর্ণ প্রশ্ন দিন`,
          `📝 ${activeTeacher.name} স্যারের পরীক্ষার জন্য লাস্ট নাইট চিট শিট তৈরি করে দিন`,
          `💡 ${teacherInit} স্যারের পরীক্ষায় ফুল মার্কস পাওয়ার প্রেজেন্টেশন ও খাতা লেখার টিপস`,
        ]
      : [
          `⚡ What are the repeated questions and special exam suggestions for ${activeTeacher.name} [${teacherInit}]?`,
          `🔥 Analyze past midterm & final exam papers by ${teacherInit} and highlight critical questions`,
          `📝 Generate a high-yield last-night exam revision cheat sheet for ${activeTeacher.name}'s course`,
          `💡 Presentation and step-marking tips to score full marks in ${teacherInit}'s exam`,
        ]
    : language === "bn"
    ? [
        `🔥 বিগত সেমিস্টারগুলোতে সবচেয়ে বেশি রিপিট হওয়া প্রশ্ন ও টপিক কোনগুলো?`,
        `📝 পরীক্ষার আগের রাতের জন্য গুরুত্বপূর্ণ পয়েন্ট ও চিট শিট তৈরি করে দিন`,
        `🎯 মিডটার্ম ও ফাইনাল পরীক্ষার কমন প্রশ্ন প্যাটার্ন এবং চ্যাপ্টার প্রায়োরিটি দিন`,
        `💡 পরীক্ষায় ভালো সিজিপিএ পাওয়ার জন্য খাতা উপস্থাপনা ও স্টেপ মার্কিং কৌশল বলুন`,
      ]
    : [
        `🔥 Which questions and topics appeared most frequently in past semesters?`,
        `📝 Generate a concise last-night revision cheat sheet and key formulas`,
        `🎯 Breakdown the common midterm & final question patterns and chapter priorities`,
        `💡 How to structure and write answers for maximum step marking and top CGPA?`,
      ];

  // Helper to format timestamps nicely with timezone resilience
  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      let normalized = iso.trim();
      // If timestamp lacks timezone offset (e.g. from backend LocalDateTime "2026-11-14T17:40:00" without Z),
      // append 'Z' so it is treated as UTC, allowing local browser timezone (e.g. Asia/Dhaka UTC+6) to display 11:40 PM!
      if (normalized.includes("T") && !normalized.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(normalized)) {
        normalized = `${normalized}Z`;
      }
      const d = new Date(normalized);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // HTML entity sanitizer for fallback
  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Helper to render KaTeX formulas safely with LaTeX typography
  const renderKaTeX = (tex: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch (e) {
      console.warn("KaTeX render error:", e);
      return `<span class="text-amber-400 font-mono">${escapeHtml(tex)}</span>`;
    }
  };

  // Simple Markdown & LaTeX formatter for clean rendering of bold text, lists, code, and math equations
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let inMathBlock = false;
    let mathBuffer: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // 1. Code blocks (```)
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="p-3 my-2 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800"
            >
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      const trimmed = line.trim();

      // 2. Multi-line Display Math Blocks ($$...$$ or \[...\])
      if (trimmed === "$$" || trimmed === "\\[") {
        if (inMathBlock) {
          elements.push(
            <div
              key={`math-${index}`}
              className="my-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900 to-indigo-950/40 border border-slate-700/70 dark:border-slate-800 shadow-xl overflow-x-auto text-center"
            >
              <div
                className="inline-block text-slate-100 min-w-full text-center"
                dangerouslySetInnerHTML={{
                  __html: renderKaTeX(mathBuffer.join("\n"), true),
                }}
              />
            </div>
          );
          mathBuffer = [];
          inMathBlock = false;
        } else {
          inMathBlock = true;
          mathBuffer = [];
        }
        return;
      }

      if (inMathBlock) {
        if (trimmed === "$$" || trimmed === "\\]") {
          elements.push(
            <div
              key={`math-${index}`}
              className="my-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900 to-indigo-950/40 border border-slate-700/70 dark:border-slate-800 shadow-xl overflow-x-auto text-center"
            >
              <div
                className="inline-block text-slate-100 min-w-full text-center"
                dangerouslySetInnerHTML={{
                  __html: renderKaTeX(mathBuffer.join("\n"), true),
                }}
              />
            </div>
          );
          mathBuffer = [];
          inMathBlock = false;
        } else {
          mathBuffer.push(line);
        }
        return;
      }

      // 3. Single-line Display Math ($$math$$ or \[math\])
      if (
        (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 2) ||
        (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4)
      ) {
        const formula = trimmed.startsWith("$$")
          ? trimmed.slice(2, -2)
          : trimmed.slice(2, -2);
        elements.push(
          <div
            key={`math-${index}`}
            className="my-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900 to-indigo-950/40 border border-slate-700/70 dark:border-slate-800 shadow-xl overflow-x-auto text-center"
          >
            <div
              className="inline-block text-slate-100 min-w-full text-center"
              dangerouslySetInnerHTML={{
                __html: renderKaTeX(formula, true),
              }}
            />
          </div>
        );
        return;
      }

      if (!trimmed) {
        elements.push(<div key={`empty-${index}`} className="h-2" />);
        return;
      }

      // Horizontal separator (---)
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(
          <hr
            key={`hr-${index}`}
            className="my-3 border-t border-slate-200 dark:border-slate-800"
          />
        );
        return;
      }

      // Headers
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h2
            key={`h1-${index}`}
            className="text-base font-black text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{renderInlineText(trimmed.replace(/^#\s+/, ""))}</span>
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h3
            key={`h2-${index}`}
            className="text-sm font-black text-slate-900 dark:text-white mt-2.5 mb-1 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{renderInlineText(trimmed.replace(/^##\s+/, ""))}</span>
          </h3>
        );
        return;
      }
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4
            key={`h3-${index}`}
            className="text-sm font-black text-slate-900 dark:text-white mt-2 mb-1 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{renderInlineText(trimmed.replace(/^###\s+/, ""))}</span>
          </h4>
        );
        return;
      }
      if (trimmed.startsWith("#### ")) {
        elements.push(
          <h5
            key={`h4-${index}`}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 mb-1"
          >
            {renderInlineText(trimmed.replace(/^####\s+/, ""))}
          </h5>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const bulletText = trimmed.replace(/^[\*\-]\s+/, "");
        elements.push(
          <div
            key={`li-${index}`}
            className="flex items-start gap-2 my-0.5 pl-2 text-xs text-slate-700 dark:text-slate-300"
          >
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{renderInlineText(bulletText)}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(
          <div
            key={`num-${index}`}
            className="flex items-start gap-2 my-0.5 pl-2 text-xs text-slate-700 dark:text-slate-300"
          >
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
              {trimmed.match(/^\d+\./)?.[0]}
            </span>
            <span>{renderInlineText(trimmed.replace(/^\d+\.\s+/, ""))}</span>
          </div>
        );
        return;
      }

      // Quote / Tip boxes
      if (trimmed.startsWith("> ")) {
        elements.push(
          <div
            key={`quote-${index}`}
            className="p-2.5 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium"
          >
            {renderInlineText(trimmed.replace(/^>\s+/, ""))}
          </div>
        );
        return;
      }

      // Default paragraph
      elements.push(
        <p
          key={`p-${index}`}
          className="my-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {renderInlineText(line)}
        </p>
      );
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key={`code-end`}
          className="p-3 my-2 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800"
        >
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
    }

    if (inMathBlock && mathBuffer.length > 0) {
      elements.push(
        <div
          key={`math-end`}
          className="my-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900 to-indigo-950/40 border border-slate-700/70 dark:border-slate-800 shadow-xl overflow-x-auto text-center"
        >
          <div
            className="inline-block text-slate-100 min-w-full text-center"
            dangerouslySetInnerHTML={{
              __html: renderKaTeX(mathBuffer.join("\n"), true),
            }}
          />
        </div>
      );
    }

    return elements;
  };

  const renderInlineText = (text: string, isNested = false): React.ReactNode => {
    // Regex splits bold (**text**), inline code (`code`), display math ($$math$$ or \[math\]),
    // and inline math ($math$ or \(math\)).
    const tokens = text.split(
      /(\*\*[^*]+\*\*|`[^`]+`|\$\$[^\$]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)|(?<!\$)\$(?:[^\$\s\n]|[^\$\s\n][^\$\n]*?[^\$\s\n])\$(?!\$))/g
    );

    return tokens.map((part, i) => {
      if (!part) return null;

      // 1. Bold (**text**)
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={i} className="font-black text-slate-900 dark:text-white">
            {isNested ? inner : renderInlineText(inner, true)}
          </strong>
        );
      }

      // 2. Inline Code (`code`)
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold border border-blue-200/50 dark:border-slate-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 3. Display Math ($$math$$ or \[math\]) inside line
      if (
        (part.startsWith("$$") && part.endsWith("$$") && part.length >= 4) ||
        (part.startsWith("\\[") && part.endsWith("\\]") && part.length >= 4)
      ) {
        const formula = part.startsWith("$$")
          ? part.slice(2, -2)
          : part.slice(2, -2);
        return (
          <span
            key={i}
            className="inline-block my-1.5 max-w-full overflow-x-auto align-middle py-1 px-3 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner text-slate-100"
            dangerouslySetInnerHTML={{
              __html: renderKaTeX(formula, true),
            }}
          />
        );
      }

      // 4. Inline Math (\(math\))
      if (part.startsWith("\\(") && part.endsWith("\\)") && part.length >= 4) {
        const formula = part.slice(2, -2);
        return (
          <span
            key={i}
            className="inline-math px-0.5 align-baseline text-slate-900 dark:text-slate-100 font-normal"
            dangerouslySetInnerHTML={{
              __html: renderKaTeX(formula, false),
            }}
          />
        );
      }

      // 5. Inline Math ($math$)
      if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
        const formula = part.slice(1, -1);
        return (
          <span
            key={i}
            className="inline-math px-0.5 align-baseline text-slate-900 dark:text-slate-100 font-normal"
            dangerouslySetInnerHTML={{
              __html: renderKaTeX(formula, false),
            }}
          />
        );
      }

      // 6. Regular plain text
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl h-[92vh] max-h-[850px] rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* 1. MODAL TOP BAR                                                  */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-slate-900 dark:text-white truncate">
                  {language === "bn" ? "এআই এক্সাম রিভিশন কো-পাইলট ও স্টাডি মেন্টর" : "AI Exam Revision Copilot & Study Mentor"}
                </span>
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shrink-0">
                  {courseCode}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/40 shrink-0">
                  {language === "bn" ? "⚡ জেমিনি ৩.৮ ফ্ল্যাশ এআই" : "⚡ Gemini 3.8 Flash AI"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {courseTitle || (language === "bn" ? "অ্যাকাডেমিক কোর্স আর্কাইভ" : "Academic Course Archive")} • {courseDepartment || "CSE"} • Southeast University
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {activeTab === "cheatsheet" && (
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
                title="Print Cheat Sheet"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            {activeTab === "chat" && messages.length > 0 && isCourseUnlocked && (
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                title={language === "bn" ? "চ্যাট ক্লিয়ার করুন" : "Clear conversation"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "ক্লিয়ার চ্যাট" : "Clear Chat"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. SUB-BAR: TABS & FACULTY SELECTOR                              */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shrink-0">
          {/* Dual Tabs */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "এআই এক্সাম কো-পাইলট" : "AI Exam Copilot"}</span>
            </button>

            <button
              onClick={() => setActiveTab("cheatsheet")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "cheatsheet"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "কুইক রিভিশন গাইড" : "Quick Revision Guide"}</span>
            </button>
          </div>

          {/* Faculty Selector & Rolling Retention Pill */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end flex-1">
            {teachers.length > 0 && activeTab === "chat" && (
              <div className="inline-flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {language === "bn" ? "শিক্ষক ফোকাস:" : "Faculty Focus:"}
                </span>
                <select
                  value={selectedTeacherId || ""}
                  onChange={(e) => setSelectedTeacherId(e.target.value ? Number(e.target.value) : null)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">{language === "bn" ? "সকল শিক্ষক (All Teachers)" : "All Teachers"}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.initial ? `[${t.initial}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 7-Day Sliding Window Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
              <Clock className="w-3 h-3" />
              <span>
                {language === "bn" ? "রোলিং ৭ দিনের মেমোরি" : "7-Day Sliding Retention"}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. ACCESS LOCKED OVERLAY GUARD                                    */}
        {/* ================================================================= */}
        {!isCourseUnlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === "bn" ? "কোর্সটি বর্তমানে লক করা আছে" : "Course Materials Are Locked"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "NoteLagbe AI Exam Revision Copilot ব্যবহার করতে কোর্সটি আনলক করুন। আনলক করলে আপনি যেকোনো শিক্ষকের বিগত প্রশ্ন বিশ্লেষণ, সমাধান ও কুইক রিভিশন গাইড পেয়ে যাবেন।"
                  : "Unlock this course to access the Gemini 3.8 AI Exam Revision Copilot, repetitive questions analysis, and faculty-specific revision guides."}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-300 max-w-md">
              <p className="text-[11px] leading-relaxed">
                {language === "bn"
                  ? "💡 কোর্স পেজের 'Unlock Course' বাটনে ক্লিক করে আনলক সম্পন্ন করুন।"
                  : "💡 Return to the course page and click 'Unlock Course' to gain unlimited access."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {language === "bn" ? "কোর্স পেজে ফিরে যান" : "Back to Course Page"}
            </button>
          </div>
        ) : activeTab === "chat" ? (
          /* =============================================================== */
          /* 4. TAB 1: AI EXAM CHATBOT & INTERACTIVE CONVERSATION            */
          /* =============================================================== */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatLoading && messages.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
                  <p className="text-xs font-bold">
                    {language === "bn"
                      ? "৭-দিনের কনভার্সেশন হিস্টোরি লোড হচ্ছে..."
                      : "Loading rolling 7-day conversation history..."}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                /* Empty Chat Welcome State */
                <div className="py-12 sm:py-16 text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {language === "bn"
                        ? "স্বাগতম! আমি আপনার AI Exam Revision Copilot"
                        : "Welcome to AI Exam Revision Copilot"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {language === "bn"
                        ? `${courseCode} কোর্সের বিগত সব মিডটার্ম ও ফাইনাল প্রশ্ন, শিক্ষকের প্রশ্নের ধরন এবং নোট বিশ্লেষণ করে যেকোনো প্রশ্নের সমাধান ও এক্সাম টিপস দেওয়ার জন্য প্রস্তুত।`
                        : `Ask any question to get customized exam revision suggestions, repeated questions breakdown, and faculty-specific tips for ${courseCode}.`}
                    </p>
                  </div>

                  {/* Suggestion Quick Pills */}
                  <div className="pt-2 space-y-2 text-left">
                    <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
                      {language === "bn" ? "ক্লিক করে দ্রুত প্রশ্ন করুন:" : "Quick Suggested Questions:"}
                    </span>
                    <div className="flex flex-col gap-2">
                      {promptSuggestions.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={sending}
                          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-800 dark:text-slate-200 transition-all shadow-sm hover:border-blue-400 flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <Send className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Exam Questions in Welcome State */}
                  {currentPaper && (
                    <div className="pt-3 space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? `বিগত প্রশ্ন সমাধান (${currentPaper.title}):` : `Solved Past Questions (${currentPaper.title}):`}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {currentPaper.questions.slice(0, 3).map((q) => (
                          <button
                            key={q.id}
                            onClick={() => handleSendMessage(q.prompt)}
                            disabled={sending}
                            className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-900 dark:to-indigo-950/40 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-slate-800 dark:hover:to-indigo-900/60 border border-blue-200/60 dark:border-indigo-900/40 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-sm flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-amber-500 font-bold">⚡</span>
                              <span className="font-bold truncate">{q.label}</span>
                              {q.marks && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0">
                                  {q.marks}
                                </span>
                              )}
                            </div>
                            <Send className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chat Messages Timeline */
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-150`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[78%] space-y-1`}>
                          <div
                            className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-[13px] shadow-sm leading-relaxed ${
                              isUser
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm ml-auto"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm relative group"
                            }`}
                          >
                            {/* Copy button for AI replies */}
                            {!isUser && (
                              <button
                                onClick={() => handleCopyText(msg.content, index)}
                                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Copy answer"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {isUser ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <div className="space-y-1">{renderFormattedContent(msg.content)}</div>
                            )}
                          </div>

                          <div
                            className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${
                              isUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span>{isUser ? "You" : "NoteLagbe AI"}</span>
                            <span>•</span>
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>

                        {isUser && (
                          <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Generating Indicator */}
                  {sending && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {language === "bn"
                            ? "এআই পরীক্ষার ফাইল অ্যানালাইসিস করছে..."
                            : "Analyzing exam papers and notes..."}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Interactive Question Linker Popover / Drawer (Toggled from the button beside text input) */}
            {isQuestionLinkerOpen && allLinkedItems.length > 0 && (
              <div className="border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shrink-0 shadow-2xl space-y-3 max-h-[320px] overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
                {/* Drawer Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{language === "bn" ? "বিগত প্রশ্ন ও মেটেরিয়াল আর্কাইভ" : "Past Exam Questions Bank"}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          {allLinkedItems.length}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {language === "bn"
                          ? "যেকোনো প্রশ্নে ক্লিক করে সরাসরি এআই উত্তর বা সমাধান পান"
                          : "Click any question below to get instant AI model answers"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQuestionLinkerOpen(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={language === "bn" ? "বন্ধ করুন" : "Close"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { key: "ALL", labelBn: "সব মেটেরিয়াল", labelEn: "All Materials", icon: "🌟", count: categoryCounts.all },
                    { key: "MID_QUESTION", labelBn: "মিডটার্ম", labelEn: "Midterms", icon: "📝", count: categoryCounts.mid },
                    { key: "FINAL_QUESTION", labelBn: "ফাইনাল", labelEn: "Finals", icon: "🎓", count: categoryCounts.final },
                    { key: "QUIZ_CT", labelBn: "সিটি ও কুইজ", labelEn: "CT & Quiz", icon: "⚡", count: categoryCounts.quiz },
                    { key: "NOTE", labelBn: "হ্যান্ড নোটস", labelEn: "Notes", icon: "📖", count: categoryCounts.note },
                  ].map((cat) => {
                    const isActive = selectedCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                          isActive
                            ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                            : "bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{language === "bn" ? cat.labelBn : cat.labelEn}</span>
                        <span className={`px-1 py-0.2 rounded-md text-[9px] font-mono font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Paper Picker Dropdown */}
                <div className="relative">
                  <select
                    value={selectedPaperId}
                    onChange={(e) => setSelectedPaperId(e.target.value)}
                    className="w-full text-xs font-bold py-2 pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
                  >
                    {filteredPapers.map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.type === "MID_QUESTION" ? "📝 " : paper.type === "FINAL_QUESTION" ? "🎓 " : paper.type === "QUIZ_CT" ? "⚡ " : "📖 "}
                        {paper.title} {paper.faculty ? `• ${paper.faculty}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* 3. Questions Grid */}
                {currentPaper && currentPaper.questions.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "bn" ? "প্রশ্ন সিলেক্ট করুন:" : "Select Question to Ask:"}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentPaper.questions.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 transition-all gap-2 group cursor-pointer"
                          onClick={() => {
                            handleSendMessage(q.prompt);
                            setIsQuestionLinkerOpen(false);
                          }}
                          title={q.prompt}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-amber-500 font-bold shrink-0">⚡</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {q.label}
                            </span>
                            {q.marks && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                                {q.marks}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInputMessage(q.prompt);
                                setIsQuestionLinkerOpen(false);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                              title={language === "bn" ? "ইনপুট বক্সে নিন" : "Insert into input"}
                            >
                              <span className="text-xs">✏️</span>
                            </button>
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              {language === "bn" ? "জিজ্ঞেস করুন" : "Ask"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">
                    {language === "bn" ? "এই পেপারে কোনো নির্দিষ্ট প্রশ্ন পাওয়া যায়নি।" : "No specific questions found for this paper."}
                  </p>
                )}

                {/* Quick Revision Prompts inside Drawer */}
                {promptSuggestions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{language === "bn" ? "কুইক এআই প্রম্পট সাজেশনস:" : "Quick Suggested Prompts:"}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {promptSuggestions.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            handleSendMessage(prompt);
                            setIsQuestionLinkerOpen(false);
                          }}
                          disabled={sending}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors truncate max-w-full cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message Input Form */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Link Past Question Button Beside Text Field */}
                {allLinkedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsQuestionLinkerOpen(!isQuestionLinkerOpen)}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                      isQuestionLinkerOpen
                        ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/25"
                        : "bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400"
                    }`}
                    title={language === "bn" ? "বিগত প্রশ্নপত্র ও প্রশ্ন লিংক করুন" : "Link Past Exam Question"}
                  >
                    <BookOpen className={`w-4 h-4 ${isQuestionLinkerOpen ? "text-white" : "text-blue-500 dark:text-blue-400"}`} />
                    <span className="hidden sm:inline">
                      {language === "bn" ? "প্রশ্ন লিংক" : "Link Question"}
                    </span>
                    {isQuestionLinkerOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                    )}
                  </button>
                )}

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      language === "bn"
                        ? activeTeacher
                          ? `${activeTeacher.name} [${teacherInit}] স্যারের পরীক্ষার সাজেশন বা প্রশ্ন লিখুন...`
                          : "যেকোনো পরীক্ষার প্রশ্ন লিখুন বা 'প্রশ্ন লিংক' থেকে সিলেক্ট করুন..."
                        : activeTeacher
                        ? `Ask exam question or tips for ${activeTeacher.name}...`
                        : "Ask exam question or select from 'Link Question'..."
                    }
                    disabled={sending}
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "bn" ? "পাঠান" : "Send"}</span>
                </button>
              </form>

              {/* Rolling 7-Day Auto-Purge Explanation */}
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  {language === "bn"
                    ? "চ্যাট কনভার্সেশন সর্বোচ্চ ৭ দিন সংরক্ষিত থাকে এবং ৭ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়।"
                    : "Conversations are saved for 7 rolling days only and auto-purged daily."}
                </span>
                <span>
                  {messages.length} {language === "bn" ? "টি বার্তা" : "messages"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =============================================================== */
          /* 5. TAB 2: INSTANT STRUCTURED REVISION CHEAT SHEET               */
          /* =============================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm bg-white dark:bg-slate-950">
            {sheetLoading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
                <p className="text-xs font-semibold">
                  {language === "bn"
                    ? "আর্কাইভ অ্যানালাইসিস করে হাই-ইয়েল্ড চিট শিট তৈরি হচ্ছে..."
                    : "Generating high-yield revision summary..."}
                </p>
              </div>
            ) : sheetData ? (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Summary Box */}
                <div className="p-5 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2 shadow-sm">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{language === "bn" ? "লাস্ট নাইট রিভিশন স্ট্র্যাটেজি" : "Key Revision Strategy"}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {renderInlineText(sheetData.lastNightSummary)}
                  </p>
                </div>

                {/* High Yield Topics */}
                {sheetData.highYieldTopics && (
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{language === "bn" ? "সবচেয়ে বেশি রিপিটেড টপিকসমূহ (High-Yield)" : "High-Yield Topics (Recurrent in Past Exams)"}</span>
                    </h4>
                    <div className="space-y-2">
                      {sheetData.highYieldTopics.map((topic: string, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                            {i + 1}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {renderInlineText(topic)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam Scoring Tips */}
                {sheetData.examTips && (
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>{language === "bn" ? "পরীক্ষার খাতা লেখার কৌশল ও মার্কস বাড়ানোর টিপস" : "Examination Scoring Tips"}</span>
                    </h4>
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                      <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed list-disc list-inside">
                        {sheetData.examTips.map((tip: string, i: number) => (
                          <li key={i}>{renderInlineText(tip)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-16">
                {language === "bn"
                  ? "এই মুহূর্তে চিট শিট তৈরি করা সম্ভব হয়নি।"
                  : "Unable to generate cheat sheet at this time."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* CLEAR CHAT CONFIRMATION POPUP MODAL                               */}
      {/* ================================================================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0E1322] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(false)}
              disabled={clearingChat}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {language === "bn" ? "চ্যাট হিস্টোরি মুছে ফেলবেন?" : "Clear Chat Conversation?"}
                </h3>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                  <span>{courseCode}</span>
                  {courseTitle && <span>• {courseTitle}</span>}
                </div>
              </div>
            </div>

            {/* Explanation Warning */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === "bn"
                ? `এই কোর্সের পূর্ববর্তী সকল (${messages.length}টি) এআই রিভিশন প্রশ্ন ও উত্তর স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়। আপনি কি নিশ্চিত?`
                : `All previous ${messages.length} AI exam revision questions and answers for this course will be permanently cleared. This action cannot be undone. Are you sure?`}
            </p>

            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                {language === "bn"
                  ? "চ্যাট ক্লিয়ার করার পর আবার নতুন সেশন শুরু হবে।"
                  : "A fresh revision session will start after clearing."}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={clearingChat}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={confirmClearChat}
                disabled={clearingChat}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/25 disabled:opacity-50"
              >
                {clearingChat ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === "bn" ? "মুছে ফেলা হচ্ছে..." : "Clearing..."}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "হ্যাঁ, চ্যাট ক্লিয়ার করুন" : "Yes, Clear Chat"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
