import axios from "axios";
import { getJDoodleConfig } from "../lib/jdoodle.js";
import { wrapCpp, wrapPython, wrapJava, createRuntimeMarker, readRuntimeFailure, readCompilationFailure } from "../utils/judgingRuntime.js";

export class JudgingConfigurationError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'JudgingConfigurationError';
    this.statusCode = statusCode;
  }
}

// Helper function to fetch content from Cloudinary URL if needed
const fetchIfNeeded = async (urlOrContent) => {
  if (urlOrContent && (urlOrContent.startsWith("http://") || urlOrContent.startsWith("https://"))) {
    try {
      console.log(`Fetching remote testcase content from: ${urlOrContent}`);
      const response = await axios.get(urlOrContent, { responseType: 'text', timeout: 15000 });
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err) {
      console.error(`Failed to fetch remote testcase content: ${err.message}`);
      throw new Error(`Failed to retrieve test case files from host.`);
    }
  }
  return urlOrContent;
};

// Judge once before persistence so database transaction retries never rerun code.
export async function judgeSubmission({ problem, code, language }) {
  const { hiddenInput: rawHiddenInput, hiddenOutput: rawHiddenOutput, memoryLimit, timeLimit } = problem;

  // Fetch actual text from Cloudinary/external links if needed
  const hiddenInput = await fetchIfNeeded(rawHiddenInput);
  const hiddenOutput = await fetchIfNeeded(rawHiddenOutput);

  // Preserve the existing batch delimiter and output normalization.
  const splitDelimiter = /(?:\r?\n)?\/\/\/(?:\r?\n)?/;
  const trimmedInput = hiddenInput.trim();
  const trimmedOutput = hiddenOutput.trim();

  const inputsArray = trimmedInput.includes('///') ? trimmedInput.split(splitDelimiter) : [trimmedInput];
  const outputsArray = trimmedOutput.includes('///') ? trimmedOutput.split(splitDelimiter) : [trimmedOutput];

  // Combine test cases into single batch input
  const combinedInput = inputsArray.join('\n///\n');

  // Wrap the code according to language
  const runtimeMarker = createRuntimeMarker();
  let wrappedCode = code;
  if (language === 'cpp') {
    wrappedCode = wrapCpp(code, runtimeMarker);
  } else if (language === 'python') {
    wrappedCode = wrapPython(code, runtimeMarker);
  } else if (language === 'java') {
    wrappedCode = wrapJava(code, runtimeMarker);
  }

  // JDoodle Configuration
  const jdoodleConfig = getJDoodleConfig(language);
  if (!jdoodleConfig) {
    throw new JudgingConfigurationError(400, `Unsupported language selection: ${language}`);
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("JDoodle API Client ID or Client Secret is missing from environment config.");
    throw new JudgingConfigurationError(500, "Code execution service is currently misconfigured.");
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
  const response = await axios.post("https://api.jdoodle.com/v1/execute", payload, { timeout: 30000 });
  const jdoodleOutput = response.data.output || "";
  const statusCode = response.data.statusCode;
  const runtimeOutput = readRuntimeFailure(response.data, runtimeMarker);
  const compilationOutput = readCompilationFailure(response.data, runtimeMarker);
  const isCompilationError = !!compilationOutput || response.data.isCompiled === false;
  const cpuTime = response.data.cpuTime;
  const reportedMemory = response.data.memory;
  const memory = Number(reportedMemory);
  const hasMemory = (typeof reportedMemory === 'number' || (typeof reportedMemory === 'string' && reportedMemory.trim() !== ''))
    && Number.isFinite(memory) && memory >= 0;
  if ((statusCode === 0 || statusCode === 200) && !hasMemory && !runtimeOutput && !isCompilationError) {
    throw new Error('Execution service did not report valid memory usage. Please retry.');
  }

  // Check for Time Limit Exceeded (TLE)
  const cpuTimeMs = parseFloat(cpuTime) * 1000;

  let evaluationVerdict = '';
  if (isCompilationError || (statusCode !== 0 && statusCode !== 200)) {
    evaluationVerdict = 'CE';
  } else if (cpuTimeMs > timeLimit) {
    evaluationVerdict = 'TLE';
  } else if (hasMemory && memory > memoryLimit * 1024) {
    evaluationVerdict = 'MLE';
  } else if (runtimeOutput) {
    evaluationVerdict = 'RE';
  } else {
    // Split JDoodle's output block back down using our delimiter
    const actualOutputs = jdoodleOutput.trim().split(splitDelimiter);

    let isMatch = true;
    if (actualOutputs.length !== outputsArray.length) {
      isMatch = false;
    } else {
      for (let i = 0; i < outputsArray.length; i++) {
        const expected = outputsArray[i] || '';
        const actual = actualOutputs[i] || '';
        if (actual.replace(/\r\n/g, '\n').trim() !== expected.replace(/\r\n/g, '\n').trim()) {
          isMatch = false;
          break;
        }
      }
    }
    evaluationVerdict = isMatch ? 'AC' : 'WA';
  }

  const dbVerdict = {
    AC: 'Accepted',
    WA: 'Wrong Answer',
    TLE: 'Time Limit Exceeded',
    MLE: 'Memory Limit Exceeded',
    RE: 'Runtime Error',
    CE: 'Compilation Error'
  }[evaluationVerdict] || 'Wrong Answer';

  return {
    dbVerdict,
    evaluationVerdict,
    timeTaken: evaluationVerdict === 'CE' ? 0 : (Math.round(cpuTimeMs) || 0),
    memoryUsed: hasMemory ? memory : 0,
    compileOutput: dbVerdict === 'Runtime Error' ? runtimeOutput : dbVerdict === 'Compilation Error' ? compilationOutput || jdoodleOutput : "",
    jdoodleOutput
  };
}
