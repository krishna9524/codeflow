import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CodeEditor from "@/components/CodeEditor";

// --- FIXED: Cleaned up redundant AI logic, handling only the Editor now ---
const CodeWorkspace = ({ 
    language, 
    setLanguage, 
    code, 
    setCode,
    theme = 'github-light'
}) => {
    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 border-b border-gray-100 bg-white flex-shrink-0 h-12">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider select-none">Language:</span>
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-[120px] h-8 border-none shadow-none bg-transparent text-xs font-semibold text-gray-700 hover:text-indigo-600 focus:ring-0 px-0">
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        
                        <SelectContent className="bg-white border-gray-200 text-gray-900">
                            <SelectItem value="cpp" className="cursor-pointer focus:bg-gray-100">C++</SelectItem>
                            <SelectItem value="java" className="cursor-pointer focus:bg-gray-100">Java</SelectItem>
                            <SelectItem value="python" className="cursor-pointer focus:bg-gray-100">Python</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {/* The old "AI Assistant" button used to be right here. 
                  We have completely deleted it! 
                */}
            </div>

            {/* Editor Area */}
            <div className="flex-grow relative">
                <CodeEditor 
                    language={language} 
                    code={code} 
                    setCode={setCode} 
                    theme={theme}
                    options={{
                        fontSize: 14,
                        lineHeight: 24,
                        padding: { top: 20, bottom: 20 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                    }}
                />
            </div>
        </div>
    );
};

export default CodeWorkspace;