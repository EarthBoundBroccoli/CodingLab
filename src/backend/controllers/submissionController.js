import axios from "axios";
import { Problem } from "../models/Problem.js";
import { StudentStats } from "../models/StudentStats.js";
import { Submission } from "../models/Submission.js";
import { auth } from "../lib/auth.js";
import { getJDoodleConfig } from "../lib/jdoodle.js";

// Helper function to fetch content from Cloudinary URL if needed
const fetchIfNeeded = async (urlOrContent) => {
  if (urlOrContent && (urlOrContent.startsWith("http://") || urlOrContent.startsWith("https://"))) {
    try {
      console.log(`Fetching remote testcase content from: ${urlOrContent}`);
      const response = await axios.get(urlOrContent, { responseType: 'text' });
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err) {
      console.error(`Failed to fetch remote testcase content: ${err.message}`);
      throw new Error(`Failed to retrieve test case files from host.`);
    }
  }
  return urlOrContent;
};

// C++ code wrapper
const wrapCpp = (studentCode) => {
  const usesArgc = /\bmain\s*\(\s*int\b/.test(studentCode);
  
  const dummyDefinition = usesArgc 
    ? "int user_main() { return 0; }" 
    : "int user_main(int argc, char** argv) { return 0; }";

  return `
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

// Dummy for the signature NOT used by the student
${dummyDefinition}

#define main user_main
${studentCode}
#undef main

int main() {
    std::string all_input;
    std::string line;
    while (std::getline(std::cin, line)) {
        all_input += line + "\\n";
    }
    
    std::vector<std::string> inputs;
    std::string delimiter = "///";
    size_t pos = 0;
    while ((pos = all_input.find(delimiter)) != std::string::npos) {
        inputs.push_back(all_input.substr(0, pos));
        all_input.erase(0, pos + delimiter.length());
    }
    inputs.push_back(all_input);
    
    std::streambuf* orig_cin = std::cin.rdbuf();
    
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i > 0) {
            std::cout << "///\\n";
        }
        
        std::istringstream iss(inputs[i]);
        std::cin.rdbuf(iss.rdbuf());
        
        // Execute student code
        user_main();
        user_main(0, nullptr);
        
        std::cin.clear();
    }
    
    std::cin.rdbuf(orig_cin);
    return 0;
}
`;
};

// Python code wrapper
const wrapPython = (studentCode) => {
  return `
import sys
import io

student_raw_code = ${JSON.stringify(studentCode)}

# Intercept the massive batched stream string
full_input = sys.stdin.read()
test_cases = full_input.split('///')

original_stdout = sys.stdout
original_stdin = sys.stdin

for i, case in enumerate(test_cases):
    if i > 0:
        original_stdout.write('///\\n')
        original_stdout.flush()
    
    # Reset virtual streams for this specific test block
    sys.stdin = io.StringIO(case.strip())
    captured_output = io.StringIO()
    sys.stdout = captured_output
    
    try:
        # Run code globally with __name__ properly initialized to "__main__"
        exec(student_raw_code, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit:
        pass
    except Exception as e:
        captured_output.write(str(e) + '\\n')
        
    sys.stdout = original_stdout
    original_stdout.write(captured_output.getvalue())
    original_stdout.flush()
`;
};

// Java code wrapper
const wrapJava = (studentCode) => {
  // Find the class containing main
  const classMatch = studentCode.match(/(?:public\s+)?class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "Main";
  
  let modifiedStudentCode = studentCode;
  if (classMatch) {
    modifiedStudentCode = modifiedStudentCode.replace(/public\s+class\s+/, "class ");
  }
  
  modifiedStudentCode = modifiedStudentCode.replace(/public\s+static\s+void\s+main\s*\(/, "public static void studentMain(");
  
  return `
import java.io.*;
import java.util.*;

${modifiedStudentCode}

public class JDoodleWrapper {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\\n");
        }
        String[] inputs = sb.toString().split("///", -1);
        
        InputStream origIn = System.in;
        PrintStream origOut = System.out;
        
        for (int i = 0; i < inputs.length; i++) {
            if (i > 0) {
                origOut.println("///");
            }
            
            System.setIn(new ByteArrayInputStream(inputs[i].getBytes()));
            
            try {
                ${className}.studentMain(new String[0]);
            } catch (Throwable t) {
                t.printStackTrace(origOut);
            }
        }
        System.setIn(origIn);
    }
}
`;
};

// @desc    Submit problem solution for evaluation
// @route   POST /api/submissions/submit
// @access  Protected
export const submitProblemSolution = async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;
    const { problemId, code, language } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({ message: "problemId, code, and language are required fields." });
    }

    // 1. Fetch targeted problem document
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found." });
    }

    const { hiddenInput: rawHiddenInput, hiddenOutput: rawHiddenOutput, memoryLimit, timeLimit } = problem;

    // Fetch actual text from Cloudinary/external links if needed
    const hiddenInput = await fetchIfNeeded(rawHiddenInput);
    const hiddenOutput = await fetchIfNeeded(rawHiddenOutput);

    // 2. Prepare test cases
    const splitDelimiter = /(?:\r?\n)?\/\/\/(?:\r?\n)?/;
    const trimmedInput = hiddenInput.trim();
    const trimmedOutput = hiddenOutput.trim();
    
    const inputsArray = trimmedInput.includes('///') ? trimmedInput.split(splitDelimiter) : [trimmedInput];
    const outputsArray = trimmedOutput.includes('///') ? trimmedOutput.split(splitDelimiter) : [trimmedOutput];

    // Combine test cases into single batch input
    const combinedInput = inputsArray.join('\n///\n');

    // Wrap the code according to language
    let wrappedCode = code;
    if (language === 'cpp') {
      wrappedCode = wrapCpp(code);
    } else if (language === 'python') {
      wrappedCode = wrapPython(code);
    } else if (language === 'java') {
      wrappedCode = wrapJava(code);
    }

    // JDoodle Configuration
    const jdoodleConfig = getJDoodleConfig(language);
    if (!jdoodleConfig) {
      return res.status(400).json({ message: `Unsupported language selection: ${language}` });
    }

    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("JDoodle API Client ID or Client Secret is missing from environment config.");
      return res.status(500).json({ message: "Code execution service is currently misconfigured." });
    }

    const payload = {
      clientId,
      clientSecret,
      script: wrappedCode,
      language: jdoodleConfig.language,
      versionIndex: jdoodleConfig.versionIndex,
      stdin: combinedInput,
    };

    console.log(`Sending batch execution request to JDoodle for problem: "${problem.title}" [${language}]...`);
    const response = await axios.post("https://api.jdoodle.com/v1/execute", payload);

    console.log("JDoodle execution response:", response.data);

    const jdoodleOutput = response.data.output || "";
    const statusCode = response.data.statusCode;
    const cpuTime = response.data.cpuTime;
    const memory = response.data.memory;

    // Check for Time Limit Exceeded (TLE)
    const cpuTimeMs = parseFloat(cpuTime) * 1000;
    
    let evaluationVerdict = '';
    if (cpuTimeMs > timeLimit) {
      evaluationVerdict = 'TLE';
    } else {
      // Split JDoodle's output block back down using our delimiter
      const actualOutputs = jdoodleOutput.trim().split(splitDelimiter);
      
      let isMatch = true;
      if (actualOutputs.length !== outputsArray.length) {
        isMatch = false;
      } else {
        for (let i = 0; i < outputsArray.length; i++) {
          const expected = outputsArray[i].replace(/\r/g, '').trim();
          const actual = actualOutputs[i].replace(/\r/g, '').trim();
          if (expected !== actual) {
            isMatch = false;
            break;
          }
        }
      }
      evaluationVerdict = isMatch ? 'AC' : 'WA';
    }

    // Map evaluation verdict to DB verdict enum
    let dbVerdict = 'Wrong Answer';
    if (evaluationVerdict === 'AC') {
      dbVerdict = 'Accepted';
    } else if (evaluationVerdict === 'TLE') {
      dbVerdict = 'Time Limit Exceeded';
    } else {
      if (statusCode !== 0 && statusCode !== 200) {
        dbVerdict = 'Compilation Error';
      } else {
        dbVerdict = 'Wrong Answer';
      }
    }

    // 3. User statistics update mutation
    let stats = await StudentStats.findOne({ userId });
    if (!stats) {
      stats = new StudentStats({ userId });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (evaluationVerdict === 'AC') {
      // Solved problem handling (ensure uniqueness)
      const alreadySolved = stats.solvedProblems.some(id => id.toString() === problemId.toString());
      if (!alreadySolved) {
        stats.solvedProblems.push(problemId);
        
        // Difficulty breakdown increment
        const diffKey = problem.difficulty.toLowerCase();
        if (stats.difficultyBreakdown[diffKey] !== undefined) {
          stats.difficultyBreakdown[diffKey] += 1;
        }
      }

      // Pull from attempted problems
      stats.attemptedProblems = stats.attemptedProblems.filter(id => id.toString() !== problemId.toString());

      // Calculate streak
      if (!stats.lastActiveDate) {
        stats.currentStreak = 1;
        stats.longestStreak = Math.max(stats.longestStreak || 0, 1);
      } else if (stats.lastActiveDate === todayStr) {
        // Streak remains same, already active today
      } else {
        const lastDate = new Date(stats.lastActiveDate);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          stats.currentStreak += 1;
        } else {
          stats.currentStreak = 1;
        }
        stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
      }
      stats.lastActiveDate = todayStr;

      // Update activity history timeline map
      const historyIndex = stats.activityHistory.findIndex(entry => entry.date === todayStr);
      if (historyIndex !== -1) {
        stats.activityHistory[historyIndex].count += 1;
      } else {
        stats.activityHistory.push({ date: todayStr, count: 1 });
      }
    } else {
      // WA or TLE (or compilation error which we treat similarly for attempted tracking)
      const alreadySolved = stats.solvedProblems.some(id => id.toString() === problemId.toString());
      const alreadyAttempted = stats.attemptedProblems.some(id => id.toString() === problemId.toString());
      if (!alreadySolved && !alreadyAttempted) {
        stats.attemptedProblems.push(problemId);
      }
    }

    // Increment overall submissions count across all execution paths
    stats.totalSubmissionsCount = (stats.totalSubmissionsCount || 0) + 1;
    await stats.save();

    // Create and save submission document
    const newSubmission = new Submission({
      problemId,
      userId,
      code,
      language,
      verdict: dbVerdict,
      timeTaken: Math.round(cpuTimeMs) || 0,
      memoryUsed: memory || 0,
      compileOutput: dbVerdict === 'Compilation Error' ? jdoodleOutput : ""
    });
    await newSubmission.save();

    return res.status(200).json({
      message: "Submission evaluated successfully",
      verdict: dbVerdict,
      evaluationVerdict, // 'AC', 'WA', 'TLE' for simple frontend flags if needed
      timeTaken: Math.round(cpuTimeMs) || 0,
      memoryUsed: memory || 0,
      compileOutput: dbVerdict === 'Compilation Error' ? jdoodleOutput : "",
      jdoodleOutput: jdoodleOutput
    });
  } catch (error) {
    console.error("Submission evaluation error:", error);
    return res.status(500).json({
      message: "An internal error occurred during submission processing.",
      error: error.message
    });
  }
};

// @desc    Get current student's statistics
// @route   GET /api/submissions/profile-stats
// @access  Protected
export const getStudentProfileStats = async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;
    let stats = await StudentStats.findOne({ userId });
    if (!stats) {
      stats = new StudentStats({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        totalSubmissionsCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
        activityHistory: []
      });
      await stats.save();
    }

    // Fetch user's latest submissions to map latest verdict per problem
    const submissions = await Submission.find({ userId }).sort({ createdAt: -1 });
    const latestVerdicts = {};
    for (const sub of submissions) {
      const pidStr = sub.problemId.toString();
      if (!latestVerdicts[pidStr]) {
        latestVerdicts[pidStr] = sub.verdict;
      }
    }

    const statsObj = stats.toObject();
    statsObj.latestVerdicts = latestVerdicts;

    return res.status(200).json(statsObj);
  } catch (error) {
    console.error("Error fetching student profile stats:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
