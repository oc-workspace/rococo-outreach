'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: 'richTextContent',
        'aria-label': 'Email body editor',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '<p></p>';
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="richTextShell"><div className="richTextLoading">Loading editor...</div></div>;
  }

  return (
    <div className="richTextShell">
      <div className="richTextToolbar" aria-label="Text formatting toolbar">
        <button className={editor.isActive('bold') ? 'toolbarButton toolbarButtonActive' : 'toolbarButton'} onClick={() => editor.chain().focus().toggleBold().run()} type="button">B</button>
        <button className={editor.isActive('italic') ? 'toolbarButton toolbarButtonActive' : 'toolbarButton'} onClick={() => editor.chain().focus().toggleItalic().run()} type="button">I</button>
        <button className={editor.isActive('heading', { level: 2 }) ? 'toolbarButton toolbarButtonActive' : 'toolbarButton'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type="button">H2</button>
        <button className={editor.isActive('bulletList') ? 'toolbarButton toolbarButtonActive' : 'toolbarButton'} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">List</button>
        <button className={editor.isActive('orderedList') ? 'toolbarButton toolbarButtonActive' : 'toolbarButton'} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">1.</button>
        <button className="toolbarButton" onClick={() => editor.chain().focus().setParagraph().run()} type="button">P</button>
        <button className="toolbarButton" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} type="button">Undo</button>
        <button className="toolbarButton" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} type="button">Redo</button>
      </div>
      <EditorContent editor={editor} />
      <details className="htmlPreviewDetails">
        <summary>HTML output</summary>
        <pre>{value}</pre>
      </details>
    </div>
  );
}
