export interface FacultyData {
  name: string;
  majors: {
    name: string;
    programs: string[];
  }[];
}

export const FACULTY_HIERARCHY: FacultyData[] = [
  {
    name: "Công nghệ Thông tin",
    majors: [
      {
        name: "Kỹ thuật Phần mềm",
        programs: ["Chính quy", "Chất lượng cao", "Liên thông", "Văn bằng 2", "Quốc tế"]
      },
      {
        name: "Khoa học Máy tính",
        programs: ["Chính quy", "Chất lượng cao", "Từ xa"]
      },
      {
        name: "Hệ thống Thông tin",
        programs: ["Chính quy", "Vừa học vừa làm", "Liên thông"]
      },
      {
        name: "An toàn Thông tin",
        programs: ["Chính quy", "Chất lượng cao"]
      }
    ]
  },
  {
    name: "Kinh tế",
    majors: [
      {
        name: "Quản trị Kinh doanh",
        programs: ["Chính quy", "Vừa học vừa làm", "Liên thông", "Từ xa", "Quốc tế"]
      },
      {
        name: "Kế toán",
        programs: ["Chính quy", "Vừa học vừa làm", "Liên thông", "Văn bằng 2"]
      },
      {
        name: "Tài chính Ngân hàng",
        programs: ["Chính quy", "Chất lượng cao", "Liên thông"]
      },
      {
        name: "Kinh tế Quốc tế",
        programs: ["Chính quy", "Quốc tế"]
      }
    ]
  },
  {
    name: "Cơ khí",
    majors: [
      {
        name: "Kỹ thuật Cơ khí",
        programs: ["Chính quy", "Vừa học vừa làm", "Liên thông"]
      },
      {
        name: "Công nghệ Chế tạo máy",
        programs: ["Chính quy", "Vừa học vừa làm"]
      },
      {
        name: "Cơ điện tử",
        programs: ["Chính quy", "Chất lượng cao"]
      }
    ]
  },
  {
    name: "Điện - Điện tử",
    majors: [
      {
        name: "Kỹ thuật Điện",
        programs: ["Chính quy", "Vừa học vừa làm", "Liên thông"]
      },
      {
        name: "Kỹ thuật Điện tử - Viễn thông",
        programs: ["Chính quy", "Chất lượng cao", "Liên thông"]
      },
      {
        name: "Tự động hóa",
        programs: ["Chính quy", "Chất lượng cao"]
      }
    ]
  },
  {
    name: "Ngoại ngữ",
    majors: [
      {
        name: "Ngôn ngữ Anh",
        programs: ["Chính quy", "Vừa học vừa làm", "Văn bằng 2", "Từ xa"]
      },
      {
        name: "Ngôn ngữ Trung Quốc",
        programs: ["Chính quy", "Vừa học vừa làm", "Từ xa"]
      },
      {
        name: "Ngôn ngữ Nhật Bản",
        programs: ["Chính quy", "Quốc tế"]
      }
    ]
  }
];

export const ALL_COHORTS = [
  { value: "K24", label: "Khóa 24 (2024)" },
  { value: "K23", label: "Khóa 23 (2023)" },
  { value: "K22", label: "Khóa 22 (2022)" },
  { value: "K21", label: "Khóa 21 (2021)" },
  { value: "K20", label: "Khóa 20 (2020)" }
];

export const ALL_LEVELS = [
  "Đại học",
  "Liên thông Đại học",
  "Cao đẳng",
  "Liên thông Cao đẳng",
  "Trung cấp"
];

export const ALL_CLUBS = [
  "CLB Tin học",
  "CLB Sách & Hành trình",
  "CLB Nghệ thuật",
  "CLB Thể thao",
  "Không tham gia CLB"
];

// Helper to parse class name and extract Bậc (Level), Ngành (Major), Hệ (Program)
export function parseClassName(className: string) {
  const upper = className.toUpperCase().trim();
  
  // 1. Extract Bậc (Level)
  let level = "Đại học";
  if (upper.startsWith("TC_") || upper.startsWith("TC-")) {
    level = "Trung cấp";
  } else if (upper.startsWith("LTCD_") || upper.startsWith("LTCD-")) {
    level = "Liên thông Cao đẳng";
  } else if (upper.startsWith("CD_") || upper.startsWith("CD-")) {
    level = "Cao đẳng";
  } else if (upper.startsWith("LTDH_") || upper.startsWith("LTDH-")) {
    level = "Liên thông Đại học";
  }
  
  // 2. Extract Ngành (Major)
  let major = "Kỹ thuật Phần mềm";
  if (upper.includes("CNTT") || upper.includes("KTPM")) {
    major = "Kỹ thuật Phần mềm";
  } else if (upper.includes("QTKS")) {
    major = "Kinh tế Quốc tế";
  } else if (upper.includes("KT")) {
    major = "Quản trị Kinh doanh";
  } else if (upper.includes("CK")) {
    major = "Kỹ thuật Cơ khí";
  } else if (upper.includes("DT")) {
    major = "Kỹ thuật Điện";
  } else if (upper.includes("NN") || upper.includes("NNT")) {
    major = "Ngôn ngữ Anh";
  }
  
  // 3. Extract Hệ (Program)
  let program = "Chính quy";
  if (upper.includes("CLC")) {
    program = "Chất lượng cao";
  } else if (upper.includes("LT")) {
    program = "Liên thông";
  } else if (upper.includes("TX")) {
    program = "Từ xa";
  } else if (upper.includes("VB2")) {
    program = "Văn bằng 2";
  } else if (upper.includes("QT")) {
    program = "Quốc tế";
  } else if (upper.includes("VHVL")) {
    program = "Vừa học vừa làm";
  }
  
  return { level, major, program };
}

export function getFacultyData(facultyName: string) {
  const name = facultyName.toLowerCase().trim();
  if (name === "cntt" || name === "công nghệ thông tin") {
    return FACULTY_HIERARCHY.find(f => f.name === "Công nghệ Thông tin");
  }
  if (name === "kt" || name === "kinh tế") {
    return FACULTY_HIERARCHY.find(f => f.name === "Kinh tế");
  }
  if (name === "cơ khí" || name === "ck") {
    return FACULTY_HIERARCHY.find(f => f.name === "Cơ khí");
  }
  if (name === "điện - điện tử" || name === "dt") {
    return FACULTY_HIERARCHY.find(f => f.name === "Điện - Điện tử");
  }
  if (name === "ngoại ngữ" || name === "nn") {
    return FACULTY_HIERARCHY.find(f => f.name === "Ngoại ngữ");
  }
  return FACULTY_HIERARCHY.find(f => f.name.toLowerCase().trim() === name);
}

// Helper to deterministically assign properties to models for mock display
export function getStudentMajor(studentId: string, faculty: string, className?: string): string {
  if (className && className !== "none" && className !== "") {
    return parseClassName(className).major;
  }
  const facultyData = getFacultyData(faculty) || FACULTY_HIERARCHY[0];
  const numId = parseInt(studentId.replace(/\D/g, "")) || 0;
  const majorIndex = numId % facultyData.majors.length;
  return facultyData.majors[majorIndex]?.name || facultyData.majors[0].name;
}

export function getStudentProgram(studentId: string, faculty: string, major: string, className?: string): string {
  if (className && className !== "none" && className !== "") {
    return parseClassName(className).program;
  }
  const facultyData = getFacultyData(faculty) || FACULTY_HIERARCHY[0];
  const majorData = facultyData.majors.find(m => m.name.toLowerCase().trim() === major.toLowerCase().trim())
    || facultyData.majors[0];
  const numId = parseInt(studentId.replace(/\D/g, "")) || 0;
  const progIndex = numId % majorData.programs.length;
  return majorData.programs[progIndex] || "Chính quy";
}

export function getStudentLevel(studentId: string, program: string, className?: string): string {
  if (className && className !== "none" && className !== "") {
    return parseClassName(className).level;
  }
  if (program.includes("Liên thông")) {
    const numId = parseInt(studentId.replace(/\D/g, "")) || 0;
    return numId % 2 === 0 ? "Liên thông Đại học" : "Liên thông Cao đẳng";
  }
  const numId = parseInt(studentId.replace(/\D/g, "")) || 0;
  const levels = ["Đại học", "Cao đẳng", "Trung cấp"];
  return levels[numId % levels.length];
}

export function getStudentClub(studentId: string): string {
  const numId = parseInt(studentId.replace(/\D/g, "")) || 0;
  const clubIndex = numId % ALL_CLUBS.length;
  return ALL_CLUBS[clubIndex];
}
