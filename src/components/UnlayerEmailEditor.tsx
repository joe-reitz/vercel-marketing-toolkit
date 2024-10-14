import React, { useRef, useState } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { Button } from "@/components/ui/button"
import { saveAs } from 'file-saver';
import baseTemplate from '../templates/baseTemplate.json';
import { Save, Download, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

const customCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap');

  body {
    font-family: 'Geist', Arial, sans-serif;
  }

  .darkmode {
    background-color: #000000 !important;
    color: #ffffff !important;
  }

  @media (prefers-color-scheme: dark) {
    .mktoText p, div.mktoText, .mktoText div {
      color: #ffffff !important;
    }
    .dark-img {
      display: inline-block !important;
      width: auto !important;
      overflow: visible !important;
      max-height: inherit !important;
      max-width: inherit !important;
      line-height: auto !important;
      margin-top: 0px !important;
      visibility: inherit !important;
    }
    .light-img {
      display: none !important;
    }
    .darkmode {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    .darkmodebg {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    .dklinkclr {
      color: #ffffff !important;
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
    .imgmaxwidth { width: 100% !important; height: auto !important; }
    .navtxt { font-size: 12px !important; }
  }
`;

export default function EmailBuilder() {
  const emailEditorRef = useRef<EditorRef | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const saveDesign = () => {
    setIsLoading(true);
    emailEditorRef.current?.saveDesign((design) => {
      const json = JSON.stringify(design);
      const blob = new Blob([json], { type: 'application/json' });
      saveAs(blob, 'email_design.json');
      setIsLoading(false);
      toast.success('Design saved successfully!');
    });
  };

  const exportHtml = () => {
    setIsLoading(true);
    emailEditorRef.current?.exportHtml((data) => {
      const { html } = data;
      const htmlWithCustomCSS = html.replace('</head>', `<style>${customCSS}</style></head>`);
      const blob = new Blob([htmlWithCustomCSS], { type: 'text/html' });
      saveAs(blob, 'email_template.html');
      setIsLoading(false);
      toast.success('HTML exported successfully!');
    });
  };

  const copyFullCode = () => {
    setIsLoading(true);
    emailEditorRef.current?.exportHtml((data) => {
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
    emailEditorRef.current = unlayer;
    
    // Merge the base template with the content width setting
    const designWithContentWidth = {
      ...baseTemplate,
      body: {
        ...baseTemplate.body,
        values: {
          ...baseTemplate.body?.values,
          contentWidth: 600
        }
      }
    };

    // Load the modified design
    unlayer.loadDesign(designWithContentWidth);
  };

  const editorOptions = {
    features: {
      textEditor: {
        fonts: {
          showDefaultFonts: false,
          customFonts: [
            { label: 'Geist', value: 'Geist, Arial, sans-serif' }
          ]
        }
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
      <div className="flex justify-end space-x-2 p-4 bg-gray-100">
        <Button className="bg-green-500 text-white" onClick={saveDesign} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Design'}
        </Button>
        <Button className="bg-blue-500 text-white" onClick={exportHtml} disabled={isLoading}>
          <Download className="w-4 h-4 mr-2" />
          {isLoading ? 'Exporting...' : 'Export HTML'}
        </Button>
        <Button className="bg-black text-white" onClick={copyFullCode} disabled={isLoading}>
          <Copy className="w-4 h-4 mr-2" />
          {isLoading ? 'Copying...' : 'Copy Full Code'}
        </Button>
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