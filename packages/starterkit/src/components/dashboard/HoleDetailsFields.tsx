"use client";

import { Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type FieldKey = "hole" | "site";

type EditableFieldProps = {
  fieldKey: FieldKey;
  label: string;
  value: string;
  placeholder?: string;
  editing: FieldKey | null;
  onStartEdit: (key: FieldKey) => void;
  onEndEdit: () => void;
  onChange: (value: string) => void;
};

function EditableMetaField({
  fieldKey,
  label,
  value,
  placeholder,
  editing,
  onStartEdit,
  onEndEdit,
  onChange,
}: EditableFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editing === fieldKey;
  const display = value.trim() || placeholder || "—";

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  return (
    <div className="targetlock-meta-field">
      <div className="targetlock-meta-field-head">
        <label htmlFor={isEditing ? inputId : undefined} className="targetlock-meta-field-label">
          {label}
        </label>
        {!isEditing ? (
          <button
            type="button"
            className="targetlock-meta-edit-btn"
            onClick={() => onStartEdit(fieldKey)}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
          >
            <Pencil size={14} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className="targetlock-meta-field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onEndEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              onEndEdit();
            }
          }}
          placeholder={placeholder}
          aria-label={label}
        />
      ) : (
        <p
          className={`targetlock-meta-display${!value.trim() && placeholder ? " is-placeholder" : ""}`}
        >
          {display}
        </p>
      )}
    </div>
  );
}

type Props = {
  activeHoleId: string;
  holeName: string;
  siteName: string;
  onHoleNameChange: (value: string) => void;
  onSiteNameChange: (value: string) => void;
};

export function HoleDetailsFields({
  activeHoleId,
  holeName,
  siteName,
  onHoleNameChange,
  onSiteNameChange,
}: Props) {
  const [editing, setEditing] = useState<FieldKey | null>(null);

  useEffect(() => {
    setEditing(null);
  }, [activeHoleId]);

  return (
    <>
      <EditableMetaField
        fieldKey="hole"
        label="Hole ID / name"
        value={holeName}
        editing={editing}
        onStartEdit={setEditing}
        onEndEdit={() => setEditing(null)}
        onChange={onHoleNameChange}
      />
      <EditableMetaField
        fieldKey="site"
        label="Site / project"
        value={siteName}
        placeholder="Add site or project"
        editing={editing}
        onStartEdit={setEditing}
        onEndEdit={() => setEditing(null)}
        onChange={onSiteNameChange}
      />
    </>
  );
}
