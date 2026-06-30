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
  const parts = upper.split(/[-_]/);
  const code = parts[1] || "";
  
  const MAJOR_CODE_MAP: Record<string, string> = {
    "CNTT": "Kỹ thuật Phần mềm",
    "KTPM": "Kỹ thuật Phần mềm",
    "KHDL": "Khoa học Dữ liệu",
    "MMT": "Mạng máy tính và Truyền thông",
    "AI": "Trí tuệ Nhân tạo",
    "LH": "Quản trị dịch vụ Du lịch và Lữ hành",
    "NH": "Quản trị Nhà hàng và Dịch vụ ăn uống",
    "HDDL": "Hướng dẫn Du lịch",
    "HD": "Hướng dẫn Du lịch",
    "QTKS": "Kinh tế Quốc tế",
    "QTKD": "Quản trị Kinh doanh",
    "KT": "Quản trị Kinh doanh",
    "KDT": "Kinh doanh Thương mại",
    "KDQT": "Kinh doanh Quốc tế",
    "KDOT": "Kinh doanh Quốc tế",
    "CK": "Kỹ thuật Cơ khí",
    "DT": "Kỹ thuật Điện",
    "DDT": "Kỹ thuật Điện",
    "BPD": "Biên phiên dịch tiếng Anh",
    "NNT": "Ngôn ngữ Trung Quốc",
    "NNP": "Ngôn ngữ Pháp",
    "NN": "Ngôn ngữ Anh",
    "NNA": "Ngôn ngữ Anh",
  };
  
  const major = MAJOR_CODE_MAP[code] || "";
  
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

export function getDefaultMajorForFaculty(faculty: string): string {
  const name = faculty.toLowerCase().trim();
  if (name.includes("công nghệ thông tin") || name === "cntt") return "Kỹ thuật Phần mềm";
  if (name.includes("kinh tế") || name === "kt") return "Quản trị Kinh doanh";
  if (name.includes("cơ khí") || name === "ck") return "Kỹ thuật Cơ khí";
  if (name.includes("điện") || name === "dt") return "Kỹ thuật Điện";
  if (name.includes("ngoại ngữ") || name === "nn") return "Ngôn ngữ Anh";
  if (name.includes("du lịch") || name === "dl") return "Quản trị dịch vụ Du lịch và Lữ hành";
  return "Kỹ thuật Phần mềm";
}

// Helper to deterministically assign properties to models for mock display
export function getStudentMajor(studentId: string, faculty: string, className?: string): string {
  if (className && className !== "none" && className !== "") {
    const parsedMajor = parseClassName(className).major;
    if (parsedMajor) return parsedMajor;
  }
  return getDefaultMajorForFaculty(faculty);
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
