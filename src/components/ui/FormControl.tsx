"use client";

type FieldState = "idle" | "valid" | "invalid";

function stateClass(state: FieldState): string {
  if (state === "invalid") return "field-invalid";
  if (state === "valid") return "field-valid";
  return "";
}

type Props = {
  label: string;
  name: string;
  error?: string;
  state?: FieldState;
  hint?: string;
  children: React.ReactNode;
};

export default function FormControl({ label, name, error, state = "idle", hint, children }: Props) {
  return (
    <div className="form-control">
      <label className="label-field" htmlFor={name}>
        {label}
      </label>
      <div className={stateClass(state)}>{children}</div>
      {error && (
        <p className="field-error" role="alert" id={`${name}-error`}>
          {error}
        </p>
      )}
      {!error && hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function inputClass(state: FieldState, extra = ""): string {
  return `input-field ${stateClass(state)} ${extra}`.trim();
}

export { stateClass };
