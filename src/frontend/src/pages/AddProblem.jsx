import { useState } from "react";
import { useSession } from "../lib/auth-client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Send, CheckCircle, AlertCircle, FileText } from "lucide-react";

const AddProblem = () => {
    const { data: session } = useSession();
    const navigate = useNavigate();

    // Form fields
    const [title, setTitle] = useState("");
    const [difficulty, setDifficulty] = useState("Easy");
    const [tags, setTags] = useState([]);
    const [statement, setStatement] = useState("");
    const [inputFormat, setInputFormat] = useState("");
    const [outputFormat, setOutputFormat] = useState("");
    const [timeLimit, setTimeLimit] = useState(1000); // ms
    const [memoryLimit, setMemoryLimit] = useState(256); // MB

    // Dynamic samples (between 1 and 5)
    const [samples, setSamples] = useState([
        { input: "", output: "", explanation: "" }
    ]);

    // Hidden test cases (read as text from file uploads)
    const [hiddenInputFile, setHiddenInputFile] = useState(null);
    const [hiddenInputContent, setHiddenInputContent] = useState("");
    const [hiddenOutputFile, setHiddenOutputFile] = useState(null);
    const [hiddenOutputContent, setHiddenOutputContent] = useState("");

    // UI Status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const availableTags = [
        "Array", "String", "Dynamic Programming", "Graph", "Math", 
        "Greedy", "Sorting", "Data Structures", "Trees", "Binary Search", 
        "Two Pointers", "DFS/BFS", "Recursion", "Bit Manipulation"
    ];

    const toggleTag = (tag) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const handleSampleChange = (index, field, value) => {
        const updatedSamples = [...samples];
        updatedSamples[index][field] = value;
        setSamples(updatedSamples);
    };

    const addSample = () => {
        if (samples.length >= 5) return;
        setSamples([...samples, { input: "", output: "", explanation: "" }]);
    };

    const removeSample = (index) => {
        if (samples.length <= 1) return;
        setSamples(samples.filter((_, i) => i !== index));
    };

    // File reading handlers
    const handleHiddenInputUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setHiddenInputFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            setHiddenInputContent(event.target.result);
        };
        reader.onerror = () => {
            setError("Failed to read hidden input.txt file");
        };
        reader.readAsText(file);
    };

    const handleHiddenOutputUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setHiddenOutputFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            setHiddenOutputContent(event.target.result);
        };
        reader.onerror = () => {
            setError("Failed to read hidden output.txt file");
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        // Basic validation
        if (!title.trim()) return setError("Problem Title is required.");
        if (tags.length === 0) return setError("Select at least one Topic Tag.");
        if (!statement.trim()) return setError("Problem Statement is required.");
        if (!inputFormat.trim()) return setError("Input Format is required.");
        if (!outputFormat.trim()) return setError("Output Format is required.");
        if (!hiddenInputContent.trim()) return setError("Please upload a valid hidden input.txt file.");
        if (!hiddenOutputContent.trim()) return setError("Please upload a valid hidden output.txt file.");

        // Validate samples
        for (let i = 0; i < samples.length; i++) {
            if (!samples[i].input.trim() || !samples[i].output.trim()) {
                return setError(`Sample Case #${i + 1} must have both input and output.`);
            }
        }

        setIsSubmitting(true);

        const payload = {
            title,
            difficulty,
            tags,
            statement,
            inputFormat,
            outputFormat,
            timeLimit: parseInt(timeLimit, 10),
            memoryLimit: parseInt(memoryLimit, 10),
            samples,
            hiddenInput: hiddenInputContent,
            hiddenOutput: hiddenOutputContent
        };

        try {
            const response = await fetch("http://localhost:5000/api/problem/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("Problem has been created successfully!");
                // Clear fields
                setTitle("");
                setTags([]);
                setStatement("");
                setInputFormat("");
                setOutputFormat("");
                setTimeLimit(1000);
                setMemoryLimit(256);
                setSamples([{ input: "", output: "", explanation: "" }]);
                setHiddenInputFile(null);
                setHiddenInputContent("");
                setHiddenOutputFile(null);
                setHiddenOutputContent("");
                
                // Redirect back to problems list after 2 seconds
                setTimeout(() => {
                    navigate("/problems");
                }, 2000);
            } else {
                setError(data.message || "Failed to create problem.");
            }
        } catch (err) {
            console.error("Error creating problem:", err);
            setError("Failed to connect to the backend server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (session?.user?.role !== "problem_setter") {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="bg-error border-4 border-black p-10 neo-brutal inline-block">
                    <AlertCircle size={80} className="mx-auto mb-4" />
                    <h1 className="text-3xl font-black uppercase font-spartan tracking-tight">Access Denied</h1>
                    <p className="text-lg font-bold mt-4 uppercase italic">Only registered Problem Setters can access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto py-12 px-4 lg:px-8">
            <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
                {/* Header */}
                <div className="bg-black text-white p-6 border-b-4 border-black text-center">
                    <h1 className="text-3xl lg:text-5xl font-black uppercase font-spartan tracking-tight italic">
                        Set problem!!!!!!
                    </h1>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Title and Difficulty */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Problem Title <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter a descriptive title"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Difficulty <span className="text-error">*</span>
                                </label>
                                <select
                                    className="w-full p-3 border-4 border-black font-black bg-white focus:bg-emerald-50 outline-none rounded-none"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        {/* Topic Tags */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black block mb-2">
                                Topic Tags (Select all that apply) <span className="text-error">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => {
                                    const selected = tags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 border-2 border-black font-bold text-xs uppercase rounded-none transition-all shadow-[2px_2px_0px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                                                selected 
                                                ? "bg-emerald-400 text-black translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0px_0px_black]" 
                                                : "bg-white text-black hover:bg-slate-100"
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Problem Statement */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">
                                Problem Statement (Markdown Supported) <span className="text-error">*</span>
                            </label>
                            <textarea
                                rows="8"
                                placeholder="Describe the constraints, story, rules and criteria of the problem..."
                                className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none resize-y"
                                value={statement}
                                onChange={(e) => setStatement(e.target.value)}
                                required
                            ></textarea>
                        </div>

                        {/* Input & Output Formats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Input Format Block <span className="text-error">*</span>
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="Explain how input is structured (e.g. 'First line contains integer T...')"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none resize-none"
                                    value={inputFormat}
                                    onChange={(e) => setInputFormat(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Output Format Block <span className="text-error">*</span>
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="Explain how output should be structured (e.g. 'Print a single floating point value...')"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none resize-none"
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Time & Memory Limits */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Time Limit (milliseconds) <span className="text-error">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="100"
                                    max="10000"
                                    step="100"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] uppercase font-black opacity-50">Standard is 1000ms. Allowed range: 100ms - 10000ms.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">
                                    Memory Limit (Megabytes) <span className="text-error">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="16"
                                    max="1024"
                                    step="16"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 outline-none rounded-none"
                                    value={memoryLimit}
                                    onChange={(e) => setMemoryLimit(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] uppercase font-black opacity-50">Standard is 256MB. Allowed range: 16MB - 1024MB.</p>
                            </div>
                        </div>

                        {/* Sample Cases */}
                        <div className="border-t-4 border-black pt-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black uppercase font-spartan tracking-tight">
                                    Sample Inputs / Outputs ({samples.length} / 5)
                                </h3>
                                {samples.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={addSample}
                                        className="btn bg-white border-2 border-black font-black uppercase rounded-none text-xs flex items-center gap-1.5 shadow-[3px_3px_0px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer hover:bg-slate-100"
                                    >
                                        <Plus size={14} /> Add Sample
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {samples.map((sample, idx) => (
                                    <div key={idx} className="border-4 border-black bg-slate-50 p-6 relative neo-brutal">
                                        <div className="absolute top-4 right-4 flex items-center gap-2">
                                            <span className="bg-black text-white text-xs font-black px-2 py-1 uppercase">
                                                Sample #{idx + 1}
                                            </span>
                                            {samples.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSample(idx)}
                                                    className="btn btn-error btn-xs border-2 border-black rounded-none text-white font-black cursor-pointer shadow-[2px_2px_0px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-red-600"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-black uppercase tracking-wider text-black">
                                                    Sample Input #{idx + 1} <span className="text-error">*</span>
                                                </label>
                                                <textarea
                                                    rows="3"
                                                    placeholder="Enter inputs"
                                                    className="w-full p-2.5 bg-white border-2 border-black font-mono font-bold focus:bg-emerald-50 outline-none rounded-none resize-y text-sm"
                                                    value={sample.input}
                                                    onChange={(e) => handleSampleChange(idx, "input", e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-black uppercase tracking-wider text-black">
                                                    Sample Output #{idx + 1} <span className="text-error">*</span>
                                                </label>
                                                <textarea
                                                    rows="3"
                                                    placeholder="Enter expected outputs"
                                                    className="w-full p-2.5 bg-white border-2 border-black font-mono font-bold focus:bg-emerald-50 outline-none rounded-none resize-y text-sm"
                                                    value={sample.output}
                                                    onChange={(e) => handleSampleChange(idx, "output", e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1 mt-3">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-black">
                                                Sample Explanation #{idx + 1}
                                            </label>
                                            <textarea
                                                rows="2"
                                                placeholder="Explain how the input maps to the output for the user..."
                                                className="w-full p-2.5 bg-white border-2 border-black font-bold focus:bg-emerald-50 outline-none rounded-none resize-none text-sm"
                                                value={sample.explanation}
                                                onChange={(e) => handleSampleChange(idx, "explanation", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hidden Testcases */}
                        <div className="border-t-4 border-black pt-6 space-y-6">
                            <h3 className="text-xl font-black uppercase font-spartan tracking-tight">
                                Hidden Judging Testcases
                            </h3>
                            <p className="text-xs font-black uppercase opacity-60 leading-tight">
                                Please upload the comprehensive testcase files. These files will not be shown to users and will be used to judge their final submissions.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Hidden Input File */}
                                <div className="border-4 border-black p-6 bg-amber-50 neo-brutal space-y-4">
                                    <div className="flex items-center gap-2">
                                        <FileText size={24} className="text-black" />
                                        <span className="font-black uppercase text-sm">Hidden Input File (.txt)</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept=".txt"
                                            onChange={handleHiddenInputUpload}
                                            className="file-input file-input-bordered border-2 border-black rounded-none bg-white font-bold w-full file-input-sm"
                                            required
                                        />
                                        {hiddenInputFile && (
                                            <div className="text-[11px] font-black text-emerald-600 bg-emerald-100 p-2 border border-emerald-400">
                                                SUCCESS: Loaded {hiddenInputFile.name} ({hiddenInputContent.length} characters)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Hidden Output File */}
                                <div className="border-4 border-black p-6 bg-sky-50 neo-brutal space-y-4">
                                    <div className="flex items-center gap-2">
                                        <FileText size={24} className="text-black" />
                                        <span className="font-black uppercase text-sm">Hidden Output File (.txt)</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept=".txt"
                                            onChange={handleHiddenOutputUpload}
                                            className="file-input file-input-bordered border-2 border-black rounded-none bg-white font-bold w-full file-input-sm"
                                            required
                                        />
                                        {hiddenOutputFile && (
                                            <div className="text-[11px] font-black text-emerald-600 bg-emerald-100 p-2 border border-emerald-400">
                                                SUCCESS: Loaded {hiddenOutputFile.name} ({hiddenOutputContent.length} characters)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error and Success Alerts */}
                        {error && (
                            <div className="bg-error border-4 border-black p-4 text-black font-black uppercase text-sm flex items-center gap-2">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-emerald-400 border-4 border-black p-4 text-black font-black uppercase text-sm flex items-center gap-2">
                                <CheckCircle size={20} />
                                {successMessage}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4 flex justify-center">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`py-4 px-12 bg-slate-900 text-white font-black uppercase text-2xl border-4 border-black shadow-[6px_6px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-400 hover:text-black'}`}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner"></span>
                                ) : (
                                    <><Send size={24} /> Submit Problem</>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProblem;
