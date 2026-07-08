import axios from "axios";
import { getJDoodleConfig } from "../lib/jdoodle.js";

// @desc    Run code execution via JDoodle API
// @route   POST /api/submissions/run
// @access  Public (or protected if session is available, but the route is defined as user-facing)
export const runCodeExecution = async (req, res) => {
  try {
    const { code, language, customInput } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code script is required for execution." });
    }

    if (!language) {
      return res.status(400).json({ message: "Language specification is required." });
    }

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
      script: code,
      language: jdoodleConfig.language,
      versionIndex: jdoodleConfig.versionIndex,
      stdin: customInput || "",
    };

    console.log(`Sending execution request to JDoodle for language: "${language}"...`);

    const response = await axios.post("https://api.jdoodle.com/v1/execute", payload);

    // Return the response back to our client terminal
    return res.status(200).json({
      output: response.data.output,
      statusCode: response.data.statusCode,
      memory: response.data.memory,
      cpuTime: response.data.cpuTime,
    });
  } catch (error) {
    console.error("JDoodle Code Execution error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      message: "An error occurred during code compilation or execution.",
      error: error.response?.data || error.message,
    });
  }
};
