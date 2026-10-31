export const languageMapping = {
  cpp: {
    language: "cpp",
    versionIndex: "5", // GCC 11.2.0 / C++20
  },
  python: {
    language: "python3",
    versionIndex: "4", // Python 3.10.0
  },
  java: {
    language: "java",
    versionIndex: "4", // JDK 17.0.1
  },
};

export const getJDoodleConfig = (lang) => {
  return languageMapping[lang] || null;
};
