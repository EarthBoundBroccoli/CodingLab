import { useState } from 'react';
import { getBackendURL } from '../lib/auth-client';
import { editorLanguages, readEditorPreferences } from '../lib/editor-preferences';
import { boilerplates } from '../lib/editor-templates';
import { missingRunInput, RUN_INPUT_MESSAGE, runCode } from '../lib/run-code';

export function useProblemEditor({ problem, prefillCode, prefillLanguage, contest = false }) {
  const [editorPreferences] = useState(() => readEditorPreferences());
  const [language, setLanguage] = useState(() => editorLanguages.includes(prefillLanguage) ? prefillLanguage : editorPreferences.language);
  const [codeValue, setCodeValue] = useState(() => prefillCode ?? boilerplates[language]);
  const [activeTab, setActiveTab] = useState('input');
  const [customInput, setCustomInput] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  const handleLanguageChange = event => {
    const nextLanguage = event.target.value;
    if (nextLanguage !== language && boilerplates[nextLanguage]) {
      setLanguage(nextLanguage);
      setCodeValue(boilerplates[nextLanguage]);
    }
  };

  const handleRunCode = async () => {
    if (missingRunInput(problem, customInput)) {
      setActiveTab('output');
      setExecutionResult({ output: RUN_INPUT_MESSAGE, isError: true });
      return;
    }
    setIsRunningSandbox(true);
    setIsCompiling(true);
    setActiveTab('output');
    setExecutionResult(null);
    try {
      setExecutionResult(await runCode({ baseURL: getBackendURL(), code: codeValue, language, customInput, contest }));
    } finally {
      setIsCompiling(false);
      setIsRunningSandbox(false);
    }
  };

  return {
    editorPreferences, language, codeValue, setCodeValue, handleLanguageChange,
    activeTab, setActiveTab, customInput, setCustomInput, executionResult, setExecutionResult,
    isCompiling, setIsCompiling, isEvaluating, setIsEvaluating, isRunningSandbox, handleRunCode
  };
}
