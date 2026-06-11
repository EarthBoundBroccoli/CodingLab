/**
 * Renders basic Markdown syntax to HTML, styled for Neo-Brutalist aesthetics.
 * Supports:
 * - Headers (#, ##, ###)
 * - Bold (**text**) and Italic (*text*)
 * - Unordered and Ordered Lists (- / * / 1.)
 * - Inline code (`code`) and Code blocks (```lang ... ```)
 * - Math variables ($var$ or $1 \le N \le 10^5$)
 * - Blockquotes (> quote)
 * - Paragraphs and Line Breaks
 * 
 * @param {string} text The raw markdown string
 * @returns {string} Safe HTML string
 */
export const renderMarkdown = (text) => {
    if (!text) return "";
    
    // Escape HTML to prevent XSS
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Math/Variables ($var$)
    html = html.replace(/\$([^$]+)\$/g, '<code class="bg-slate-100 px-1 py-0.5 border border-slate-300 font-mono text-xs rounded text-slate-800">$1</code>');

    // Code blocks (```lang ... ```)
    html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-slate-900 text-slate-100 border-4 border-black p-3 font-mono text-xs my-3 overflow-x-auto shadow-[2px_2px_0px_0px_black]">$1</pre>');
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 border border-slate-300 font-mono text-xs rounded text-slate-800">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h5 class="font-black text-sm uppercase mt-4 mb-2 text-black">$1</h5>');
    html = html.replace(/^## (.*$)/gim, '<h4 class="font-black text-base uppercase mt-5 mb-2 border-b-2 border-black pb-1 text-black">$1</h4>');
    html = html.replace(/^# (.*$)/gim, '<h3 class="font-black text-xl uppercase mt-6 mb-3 border-b-4 border-black pb-1 text-black">$1</h3>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black">$1</strong>');
    
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Unordered Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="list-disc list-inside ml-4 my-1 font-medium text-black">$1</li>');
    html = html.replace(/^\s*\*\s+(.*$)/gim, '<li class="list-disc list-inside ml-4 my-1 font-medium text-black">$1</li>');

    // Ordered Lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="list-decimal list-inside ml-4 my-1 font-medium text-black">$1</li>');

    // Blockquotes
    html = html.replace(/^\s*>\s+(.*$)/gim, '<blockquote class="border-l-4 border-black pl-3 italic my-2 bg-slate-100 p-2 text-slate-700">$1</blockquote>');

    // Process line breaks (split by lines)
    const lines = html.split('\n');
    let insideList = false;
    let listType = ""; // "ul" or "ol"
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const isLi = line.trim().startsWith('<li');
        const isPre = line.trim().startsWith('<pre') || line.trim().startsWith('</pre');
        const isH = /^<h\d/.test(line.trim());
        const isBq = line.trim().startsWith('<blockquote');

        if (isLi) {
            const currentListType = line.includes('list-decimal') ? 'ol' : 'ul';
            if (!insideList) {
                insideList = true;
                listType = currentListType;
                processedLines.push(`<${listType} class="space-y-1 my-2">`);
            } else if (listType !== currentListType) {
                processedLines.push(`</${listType}>`);
                listType = currentListType;
                processedLines.push(`<${listType} class="space-y-1 my-2">`);
            }
            processedLines.push(line);
        } else {
            if (insideList) {
                processedLines.push(`</${listType}>`);
                insideList = false;
            }

            if (isPre || isH || isBq || line.trim() === '') {
                processedLines.push(line);
            } else {
                processedLines.push(`<p class="my-2 leading-relaxed text-black">${line}</p>`);
            }
        }
    }

    if (insideList) {
        processedLines.push(`</${listType}>`);
    }

    return processedLines.join('\n');
};
