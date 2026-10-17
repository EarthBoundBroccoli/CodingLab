import { randomUUID } from 'node:crypto';

export const createRuntimeMarker = () => `CODINGLAB_RUNTIME_${randomUUID().replaceAll('-', '')}:`;

export const readCompilationFailure = (data, marker) => {
  const prefix = marker + 'CE:';
  return [data.output, data.stderr].filter(value => typeof value === 'string').join('\n')
    .split(/\r?\n/).find(line => line.startsWith(prefix))?.slice(prefix.length).trim().slice(0, 300) || '';
};

export const readRuntimeFailure = (data, marker) => {
  const output = [data.output, data.stderr].filter(value => typeof value === 'string').join('\n');
  const line = output.split(/\r?\n/).find(line => line.startsWith(marker));
  if (line?.startsWith(marker + 'CE:')) return '';
  if (line) return line.slice(marker.length).trim().slice(0, 300) || 'The program terminated unexpectedly.';
  const exitCode = data.exitCode;
  if ((typeof exitCode === 'number' || (typeof exitCode === 'string' && exitCode.trim()))
      && Number.isFinite(Number(exitCode)) && Number(exitCode) !== 0) {
    return `The program exited with code ${Number(exitCode)}.`;
  }
  return '';
};

export const wrapCpp = (studentCode, marker) => {
  const usesArgc = /\bmain\s*\(\s*int\b/.test(studentCode);

  const dummyDefinition = usesArgc
    ? "int user_main() { return 0; }"
    : "int user_main(int argc, char** argv) { return 0; }";

  return `
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <csignal>
#include <cstdlib>
#include <unistd.h>

// Dummy for the signature NOT used by the student
${dummyDefinition}

#define main user_main
${studentCode}
#undef main

int main() {
    auto crash_handler = [](int signal) {
        const char message[] = "\\n${marker}Fatal runtime signal\\n";
        write(STDERR_FILENO, message, sizeof(message) - 1);
        std::_Exit(128 + signal);
    };
    std::signal(SIGSEGV, crash_handler);
    std::signal(SIGFPE, crash_handler);
    std::signal(SIGABRT, crash_handler);
    std::signal(SIGILL, crash_handler);
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
        try {
            user_main();
            user_main(0, nullptr);
        } catch (...) {
            std::cerr << "\\n${marker}Unhandled C++ exception\\n";
            return 1;
        }

        std::cin.clear();
    }

    std::cin.rdbuf(orig_cin);
    return 0;
}
`;
};

// Python code wrapper
export const wrapPython = (studentCode, marker) => {
  return `
import sys
import io
import traceback

student_raw_code = ${JSON.stringify(studentCode)}
runtime_marker = ${JSON.stringify(marker)}
try:
    student_program = compile(student_raw_code, '<student>', 'exec')
except SyntaxError as e:
    sys.stderr.write('\\n' + runtime_marker + 'CE:SyntaxError at line ' + str(e.lineno) + '\\n')
    raise SystemExit(1)

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
        exec(student_program, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit as e:
        if e.code is not None and e.code != 0:
            sys.stderr.write('\\n' + runtime_marker + 'Non-zero SystemExit\\n')
            sys.stderr.flush()
            raise SystemExit(1)
    except BaseException as e:
        frames = traceback.extract_tb(e.__traceback__)
        student_frames = [frame for frame in frames if frame.filename == '<student>']
        location = ' at line ' + str(student_frames[-1].lineno) if student_frames else ''
        sys.stderr.write('\\n' + runtime_marker + type(e).__name__ + location + '\\n')
        sys.stderr.flush()
        raise SystemExit(1)

    sys.stdout = original_stdout
    original_stdout.write(captured_output.getvalue())
    original_stdout.flush()
`;
};

// Java code wrapper
export const wrapJava = (studentCode, marker) => {
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
                String details = t.getClass().getSimpleName();
                for (StackTraceElement frame : t.getStackTrace()) {
                    if (frame.getClassName().equals("${className}")) {
                        details += " at " + frame.getMethodName() + " line " + frame.getLineNumber();
                        break;
                    }
                }
                System.err.println("\\n${marker}" + details);
                System.exit(1);
            }
        }
        System.setIn(origIn);
    }
}
`;
};
