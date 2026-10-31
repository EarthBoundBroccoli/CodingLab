import axios from 'axios';

export const missingRunInput = (problem, customInput) =>
  !customInput.trim() && problem?.samples?.some(sample => sample.input?.trim());

export const RUN_INPUT_MESSAGE = 'Run uses the Custom Input box, not the hidden tests. Enter input there or click "Use sample input", then Run again. Submit supplies hidden input automatically.';

export async function runCode({ baseURL, code, language, customInput, contest = false }, post = axios.post) {
  try {
    const response = await post(`${baseURL}/api/submissions/run`, { code, language, customInput }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true, timeout: 90000
    });
    if (response.status !== 200) {
      return { output: `Execution failed with status code ${response.status}`, isError: true };
    }
    const { output, statusCode, memory, cpuTime } = response.data;
    return { output, statusCode, memory, cpuTime, isError: false };
  } catch (err) {
    const timeout = 'The server did not respond within 90 seconds. For submissions, check your submission history before retrying; the result may still be processing.';
    // Preserve the existing pages' error detail formatting.
    const message = err.code === 'ECONNABORTED' ? timeout
      : err.response?.data?.message || (!contest && err.response?.data?.error) || err.message
        || (contest ? 'Unknown error' : 'Unknown compilation error');
    return {
      output: contest ? message : `${message}\n${err.response?.data?.error?.output || ''}`,
      isError: true
    };
  }
}
