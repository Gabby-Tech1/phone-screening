import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionEditor } from "./question-editor";
import type { Question } from "@/lib/types";

function baseQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    text: "Tell me about a recent project you led.",
    responseType: "text",
    isCustom: false,
    ...overrides,
  };
}

function renderEditor(props: Partial<React.ComponentProps<typeof QuestionEditor>> = {}) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const utils = render(
    <QuestionEditor
      index={0}
      question={baseQuestion()}
      onChange={onChange}
      onRemove={onRemove}
      {...props}
    />
  );
  return { onChange, onRemove, ...utils };
}

describe("<QuestionEditor />", () => {
  it("renders the question text in read mode by default", () => {
    renderEditor();
    expect(
      screen.getByText("Tell me about a recent project you led.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a 'Custom' badge only for custom questions", () => {
    const { rerender } = renderEditor();
    expect(screen.queryByText(/custom/i)).not.toBeInTheDocument();

    rerender(
      <QuestionEditor
        index={0}
        question={baseQuestion({ isCustom: true })}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText(/custom/i)).toBeInTheDocument();
  });

  it("enters edit mode when the text is clicked, commits trimmed text on blur", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByText(/recent project/i));
    const textarea = await screen.findByRole("textbox");
    expect(textarea).toHaveFocus();

    await user.clear(textarea);
    await user.type(textarea, "  How do you measure success?  ");
    textarea.blur();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "q1",
        text: "How do you measure success?",
      })
    );
  });

  it("does not call onChange when text is unchanged on blur", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByText(/recent project/i));
    const textarea = await screen.findByRole("textbox");
    textarea.blur();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels the edit on Escape (no onChange, returns to read mode)", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByText(/recent project/i));
    const textarea = await screen.findByRole("textbox");
    await user.type(textarea, "{Backspace}{Backspace}WIP edit");
    await user.keyboard("{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByText("Tell me about a recent project you led.")
    ).toBeInTheDocument();
  });

  it("switches the response type via the segmented control", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    const audioOption = screen.getByRole("radio", { name: "Audio" });
    await user.click(audioOption);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "q1", responseType: "audio" })
    );
  });

  it("calls onRemove when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const { onRemove } = renderEditor();

    await user.click(screen.getByRole("button", { name: /delete question/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows move-up / move-down only when handlers are provided", () => {
    const { rerender } = render(
      <QuestionEditor
        index={0}
        question={baseQuestion()}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /move up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /move down/i })).not.toBeInTheDocument();

    rerender(
      <QuestionEditor
        index={1}
        question={baseQuestion()}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /move up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /move down/i })).toBeInTheDocument();
  });
});
