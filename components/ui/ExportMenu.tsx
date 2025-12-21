
import React, { useState } from 'react';
import { Download, FileText, Printer, Copy, ChevronDown, Loader2, Check } from 'lucide-react';
import { downloadCSV } from '../../lib/utils';

interface ExportMenuProps {
    data: any[];
    filename: string;
    onExportComplete?: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ data, filename, onExportComplete }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [showCopied, setShowCopied] = useState(false);

    const handleCSV = () => {
        setIsExporting(true);
        setTimeout(() => {
            downloadCSV(data, filename);
            setIsExporting(false);
            onExportComplete?.();
        }, 500);
    };

    const handlePDF = () => {
        // PDF is best handled via system print which we have styled in index.html
        // Using a small timeout to let the dropdown menu close first, ensuring window.print() isn't blocked.
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleCopy = () => {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        const text = [
            headers.join('\t'),
            ...data.map(row => headers.map(h => row[h]).join('\t'))
        ].join('\n');

        navigator.clipboard.writeText(text).then(() => {
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        });
    };

    return (
        <div className="dropdown">
            <button 
                className="btn btn-white border px-4 fw-bold shadow-sm d-flex align-items-center rounded-3 dropdown-toggle no-caret" 
                type="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                disabled={isExporting}
            >
                {isExporting ? <Loader2 size={18} className="me-2 animate-spin"/> : <Download size={18} className="me-2"/>}
                Export
                <ChevronDown size={14} className="ms-2 opacity-50" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 p-2 mt-2">
                <li>
                    <button className="dropdown-item rounded-3 d-flex align-items-center gap-2 py-2" onClick={handleCSV}>
                        <FileText size={16} className="text-muted" />
                        <span>CSV Spreadsheet (.csv)</span>
                    </button>
                </li>
                <li>
                    <button className="dropdown-item rounded-3 d-flex align-items-center gap-2 py-2" onClick={handlePDF}>
                        <Printer size={16} className="text-muted" />
                        <span>PDF Document / Print</span>
                    </button>
                </li>
                <li>
                    <hr className="dropdown-divider opacity-50" />
                </li>
                <li>
                    <button className="dropdown-item rounded-3 d-flex align-items-center gap-2 py-2" onClick={handleCopy}>
                        {showCopied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-muted" />}
                        <span>{showCopied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default ExportMenu;
