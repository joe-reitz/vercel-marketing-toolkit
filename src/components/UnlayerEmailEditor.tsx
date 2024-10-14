import React, { useRef, useState } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { Button } from "@/components/ui/button"
import { Save, Download, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import baseTemplate from '../templates/baseTemplate.json';

// Define more specific types
type BodyItem = {
  id?: string;
  cells: number[];
  columns: Array<{
    contents: Array<{
      type: string;
      values: Record<string, unknown>;
    }>;
  }>;
  values?: Record<string, unknown>;
};

type Design = {
  body: {
    id?: string;
    rows: BodyItem[];
    headers?: BodyItem[];
    footers?: BodyItem[];
    values: Record<string, unknown>;
  };
  counters: Record<string, number>;
};

// Define JSONTemplate type to match the expected structure
type JSONTemplate = {
  body: {
    id?: string;
    rows: BodyItem[];
    headers?: BodyItem[];
    footers?: BodyItem[];
    values: Record<string, unknown>;
  };
  counters?: Record<string, number>;
};
// Ensure baseTemplate conforms to the JSONTemplate type
const typedBaseTemplate: JSONTemplate = baseTemplate as unknown as JSONTemplate;

// Consider moving this to a separate CSS file for better organization
const customCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap');

  /* CLIENT-SPECIFIC STYLES */
  img{-ms-interpolation-mode: bicubic;} 
  #outlook a{padding:0;} 
  table{mso-table-lspace:0pt;mso-table-rspace:0pt;} 
  .ReadMsgBody{width:100%;} 
  .ExternalClass{width:100%;} 
  p, a, li, td, blockquote{mso-line-height-rule:exactly;} 
  a[href^="tel"], a[href^="sms"]{color:inherit;cursor:default; text-decoration:none;} 
  p, a, li, td, body, table, blockquote{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;} 
  .ExternalClass, .ExternalClass p, .ExternalClass td, .ExternalClass div, .ExternalClass span, .ExternalClass font{line-height:100%;}
  table{border-collapse:collapse;}

  html {
    -webkit-text-size-adjust: none;
  }
  a {
    font-weight: bold;
    color: #0070f3;
    text-decoration:none;
  }
  #titlemodtxt{
    letter-spacing: -4px;
    font-weight: 600;
  }
  ul li { margin-bottom: 10px; }
  ol li { margin-bottom: 10px; }

  @media (prefers-color-scheme: dark) {
    p, div {
      color:#ffffff!important;
    }
    .dark-img {
      display:inline-block !important;
      width: auto !important;
      overflow: visible !important;
      max-height:inherit !important;
      max-width:inherit !important;
      line-height: auto !important;
      margin-top:0px !important;
      visibility:inherit !important;
    }
    .light-img {
      display:none !important;
    }
    .darkmode {
      background-color:#000000!important;
      background:#000000!important;
    }
    .darkmodebg {
      background-color:#000000!important;
      background:#000000!important;
    }
    .dklinkclr{
      color:#ffffff!important;
    }
  }

  @media only screen and (max-width: 600px) {
    .main { width: 100% !important; min-width: 100% !important; }
    .inner_table { width: 90% !important; margin: 0 auto !important; }
    .logomob { max-width: 90% !important; margin: 0 auto !important; height: auto !important; }
    .show { display: block !important; visibility: visible !important; }
    .res { width: 100% !important; display: block; height: auto !important; }
    .block { display: block; margin: 0 auto; float: none !important; width: 100% !important; }
    .left_align { text-align: left !important; }
    .center { text-align: center !important; margin: 0 auto; float: none !important; }
    .hidden { display: none !important; }
    .top_pad { padding-top: 20px !important; }
    .top_pad1 { padding-top: 30px !important; }
    .mobileimg { width: 100% !important; height: auto !important; }
    .imgmaxwidth {width: 100% !important; height: auto !important;}
    .navtxt{
      font-size: 12px !important;
    }
  }
`;

interface UnlayerEmailEditorProps {
  onSave: (design: Design) => void;
  onExport: ({ html, design }: { html: string; design: Design }) => void;
}

export default function UnlayerEmailEditor({ onSave, onExport }: UnlayerEmailEditorProps) {
  const emailEditorRef = useRef<EditorRef | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const saveDesign = () => {
    setIsLoading(true);
    emailEditorRef.current?.editor?.saveDesign((design: Design) => {
      onSave(design);
      setIsLoading(false);
    });
  };

  const exportHtml = () => {
    setIsLoading(true);
    emailEditorRef.current?.editor?.exportHtml((data: { html: string; design: Design }) => {
      const { html, design } = data;
      const htmlWithCustomCSS = html.replace('</head>', `<style>${customCSS}</style></head>`);
      onExport({ html: htmlWithCustomCSS, design });
      setIsLoading(false);
    });
  };

  const copyFullCode = () => {
    setIsLoading(true);
    emailEditorRef.current?.editor?.exportHtml((data: { html: string }) => {
      const { html } = data;
      const htmlWithCustomCSS = html.replace('</head>', `<style>${customCSS}</style></head>`);
      navigator.clipboard.writeText(htmlWithCustomCSS).then(() => {
        setIsLoading(false);
        toast.success('Full code copied to clipboard!');
      }, (err) => {
        console.error('Could not copy text: ', err);
        setIsLoading(false);
        toast.error('Failed to copy code. Please try again.');
      });
    });
  };

  const onReady: EmailEditorProps['onReady'] = (unlayer) => {
    emailEditorRef.current = { editor: unlayer };
    
    const designWithContentWidth: JSONTemplate = {
      body: {
        ...typedBaseTemplate.body,
        rows: typedBaseTemplate.body.rows.map((row: BodyItem) => ({
          ...row,
          id: `row-${Math.random().toString(36).substr(2, 9)}`,
        })),
        values: {
          ...typedBaseTemplate.body.values,
          contentWidth: 600
        }
      },
      counters: typedBaseTemplate.counters || {
        u_column: 0,
        u_row: 0,
        u_content_text: 0,
        u_content_image: 0,
      }
    };

    unlayer.loadDesign(designWithContentWidth as import("state/types/types").JSONTemplate);
  };

  const editorOptions: EmailEditorProps['options'] = {
    features: {
      textEditor: {
        spellChecker: true,
        tables: true,
        cleanPaste: true,
        emojis: true,
      }
    },
    appearance: {
      theme: 'light',
      panels: {
        tools: {
          dock: 'right'
        }
      }
    },
    tools: {
      button: {
        properties: {
          padding: {
            value: '10px 20px'
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-end items-center p-4 bg-gray-100">
        <div className="flex space-x-2">
          <Button className="bg-green-500 text-white hover:bg-green-700" onClick={saveDesign} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Design'}
          </Button>
          <Button className="bg-blue-500 text-white hover:bg-blue-700" onClick={exportHtml} disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            {isLoading ? 'Exporting...' : 'Export HTML'}
          </Button>
          <Button className="bg-black text-white hover:bg-gray-600" onClick={copyFullCode} disabled={isLoading}>
            <Copy className="w-4 h-4 mr-2" />
            {isLoading ? 'Copying...' : 'Copy Full Code'}
          </Button>
        </div>
      </div>
      <div className="flex-grow relative">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={editorOptions}
          style={{
            height: '100%',
            minHeight: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </div>
    </div>
  );
}