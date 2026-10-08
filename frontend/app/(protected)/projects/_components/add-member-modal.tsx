"use client";

import { Modal } from "@/components/modal";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { UserAvatar } from "@/components/user-avatar";
import { formatEmployeeCode, matchesNameOrCode } from "@/lib/utils/employee";
import { projectApi } from "@/services/api";
import type { UserProfile } from "@/types";
import type { Project } from "@/types/project";
import styles from "./add-member-modal.module.css";
import { t } from "@/lib/i18n";

type ExistingMember = {
  userId: number;
  isActive: boolean;
};

type SelectedPerson = { kind: "user"; user: UserProfile };

type AddMemberModalProps = {
  isOpen: boolean;
  projectId: string;
  project?: Project;
  accessibleUsers: UserProfile[];
  existingMembers: ExistingMember[];
  onClose: () => void;
  onAdded: () => Promise<void> | void;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AddMemberModal({
  isOpen,
  projectId,
  project,
  accessibleUsers,
  existingMembers,
  onClose,
  onAdded,
}: AddMemberModalProps) {
  const [query, setQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<SelectedPerson[]>([]);
  const [position, setPosition] = useState("");
  const [candidateUsers, setCandidateUsers] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const userFieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setSelectedPeople([]);
    setPosition("");
    setShowErrors(false);
    setSubmitError(null);
    setIsUserMenuOpen(false);

    let cancelled = false;
    async function loadCandidates() {
      try {
        const { data } = await projectApi.listMemberCandidates(projectId);
        if (!cancelled) {
          setCandidateUsers(data || []);
        }
      } catch {
        if (!cancelled) {
          setCandidateUsers([]);
        }
      }
    }

    void loadCandidates();
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (userFieldRef.current && !userFieldRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const activeMemberIds = useMemo(
    () =>
      new Set(
        existingMembers
          .filter((member) => member.isActive)
          .map((member) => String(member.userId)),
      ),
    [existingMembers],
  );

  const selectedUserIds = useMemo(
    () =>
      new Set(
        selectedPeople
          .filter((person): person is { kind: "user"; user: UserProfile } => person.kind === "user")
          .map((person) => person.user.id),
      ),
    [selectedPeople],
  );

  const availableUsers = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    for (const user of [...accessibleUsers, ...candidateUsers]) {
      byId.set(user.id, user);
    }
    return Array.from(byId.values()).filter((user) => {
      const numericId = user.id.replace("usr-", "");
      return !activeMemberIds.has(numericId) && !selectedUserIds.has(user.id);
    });
  }, [accessibleUsers, activeMemberIds, candidateUsers, selectedUserIds]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return availableUsers.slice(0, 8);
    }
    return availableUsers
      .filter(
        (user) =>
          matchesNameOrCode(
            normalized,
            user.name,
            formatEmployeeCode(user.id, user.employeeCode),
            [user.email],
          ),
      )
      .slice(0, 8);
  }, [availableUsers, query]);

  const userError = showErrors && selectedPeople.length === 0;
  const canSubmit = selectedPeople.length > 0 && !isSubmitting;

  function addUser(user: UserProfile) {
    setSelectedPeople((current) => [...current, { kind: "user", user }]);
    setQuery("");
    setIsUserMenuOpen(true);
    inputRef.current?.focus();
  }

  function removePerson(index: number) {
    setSelectedPeople((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit() {
    setShowErrors(true);
    setSubmitError(null);
    if (selectedPeople.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      for (const person of selectedPeople) {
        await projectApi.addMember(projectId, person.user.id, position);
      }

      await onAdded();
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t("Không thể thêm thành viên. Vui lòng thử lại."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <Modal
      title={t("Thêm thành viên")}
      titleId="add-member-title"
      size="sm"
      onClose={onClose}
      allowOverflow
    >
        <div className="app-modal-body app-modal-body-visible">
          <div className={styles.field} ref={userFieldRef}>
            <span className={styles.fieldLabel}>{t("Người dùng")}</span>
            <div className={styles.combobox}>
              <div className={styles.comboboxBox} onClick={() => inputRef.current?.focus()}>
                {selectedPeople.map((person, index) => (
                  <span key={person.user.id} className={styles.chip}>
                    <UserAvatar
                      name={person.user.name}
                      avatarUrl={person.user.avatarUrl}
                      size={20}
                    />
                    <span className={styles.chipName}>{person.user.name}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      aria-label={t("Xóa")}
                      onClick={() => removePerson(index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  className={styles.comboboxInput}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setIsUserMenuOpen(true);
                  }}
                  onFocus={() => setIsUserMenuOpen(true)}
                  placeholder={
                    selectedPeople.length === 0 ? t("Nhập tên hoặc email người dùng...") : t("Thêm người khác...")
                  }
                />
              </div>
              {isUserMenuOpen ? (
                <div className={styles.dropdown}>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={styles.option}
                      onClick={() => addUser(user)}
                    >
                      <UserAvatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        size={32}
                      />
                      <span className={styles.optionCopy}>
                        <strong>{user.name}</strong>
                        <span>
                          {formatEmployeeCode(user.id, user.employeeCode)} · {user.email}
                        </span>
                      </span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 ? (
                    <div className={styles.emptyHint}>{t("Không tìm thấy người dùng phù hợp.")}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {userError ? <span className={styles.fieldError}>{t("Vui lòng chọn ít nhất một người dùng.")}</span> : null}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t("Vị trí trong dự án (tùy chọn)")}</span>
            <input
              className={styles.comboboxInput}
              value={position}
              maxLength={100}
              onChange={(event) => setPosition(event.target.value)}
              placeholder={t("Ví dụ: Backend Developer, QA Engineer...")}
            />
          </div>

          {submitError ? <span className={styles.fieldError}>{submitError}</span> : null}
        </div>

        <footer className="app-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            {t("Hủy")}</button>
          <button
            type="button"
            className="primary-button"
            aria-disabled={!canSubmit}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? t("Đang thêm...") : t("Thêm thành viên")}
          </button>
        </footer>
    </Modal>,
    document.body,
  );
}
