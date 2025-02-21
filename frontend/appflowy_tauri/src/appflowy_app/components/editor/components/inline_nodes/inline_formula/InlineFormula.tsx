import React, { forwardRef, memo, useCallback, MouseEvent, useRef } from 'react';
import { ReactEditor, useSelected, useSlate } from 'slate-react';
import { Transforms } from 'slate';
import { EditorElementProps, FormulaNode } from '$app/application/document/document.types';
import FormulaLeaf from '$app/components/editor/components/inline_nodes/inline_formula/FormulaLeaf';
import FormulaEditPopover from '$app/components/editor/components/inline_nodes/inline_formula/FormulaEditPopover';
import { getNodePath, moveCursorToNodeEnd } from '$app/components/editor/components/editor/utils';
import { CustomEditor } from '$app/components/editor/command';
import { useEditorInlineBlockState } from '$app/components/editor/stores';
import { InlineChromiumBugfix } from '$app/components/editor/components/inline_nodes/InlineChromiumBugfix';

export const InlineFormula = memo(
  forwardRef<HTMLSpanElement, EditorElementProps<FormulaNode>>(({ node, children, ...attributes }, ref) => {
    const editor = useSlate();
    const formula = node.data;
    const { popoverOpen = false, setRange, openPopover, closePopover } = useEditorInlineBlockState('formula');
    const anchor = useRef<HTMLSpanElement | null>(null);
    const selected = useSelected();
    const open = popoverOpen && selected;

    const handleClick = useCallback(
      (e: MouseEvent<HTMLSpanElement>) => {
        const target = e.currentTarget;
        const path = getNodePath(editor, target);

        ReactEditor.focus(editor);
        Transforms.select(editor, path);
        if (editor.selection) {
          setRange(editor.selection);
          openPopover();
        }
      },
      [editor, openPopover, setRange]
    );

    const handleEditPopoverClose = useCallback(() => {
      closePopover();
      if (anchor.current === null) {
        return;
      }

      moveCursorToNodeEnd(editor, anchor.current);
    }, [closePopover, editor]);

    return (
      <>
        <span
          {...attributes}
          ref={(el) => {
            anchor.current = el;
            if (ref) {
              if (typeof ref === 'function') {
                ref(el);
              } else {
                ref.current = el;
              }
            }
          }}
          contentEditable={false}
          onDoubleClick={handleClick}
          onClick={handleClick}
          className={`${attributes.className ?? ''} formula-inline relative cursor-pointer rounded px-1 py-0.5 ${
            selected ? 'selected' : ''
          }`}
        >
          <InlineChromiumBugfix />
          <FormulaLeaf formula={formula}>{children}</FormulaLeaf>
          <InlineChromiumBugfix />
        </span>
        {open && (
          <FormulaEditPopover
            defaultText={formula}
            onDone={(newFormula) => {
              if (anchor.current === null || newFormula === formula) {
                handleEditPopoverClose();
                return;
              }

              const path = getNodePath(editor, anchor.current);

              // select the node before updating the formula
              Transforms.select(editor, path);
              if (newFormula === '') {
                const point = editor.before(path);

                CustomEditor.deleteFormula(editor);
                closePopover();
                if (point) {
                  ReactEditor.focus(editor);
                  editor.select(point);
                }

                return;
              } else {
                CustomEditor.updateFormula(editor, newFormula);
                handleEditPopoverClose();
              }
            }}
            anchorEl={anchor.current}
            open={open}
            onClose={handleEditPopoverClose}
          />
        )}
      </>
    );
  })
);
