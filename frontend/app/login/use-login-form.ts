import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FocusEvent,
} from "react";
import { signIn, STORAGE_KEY } from "@/services/auth/session";
import {
  clearRememberedLogin,
  readRememberedLogin,
  readRememberedLoginSnapshot,
  removeLegacyRememberedPassword,
  storeRememberedLogin,
  subscribeToRememberedLogin,
} from "@/services/auth/remember-login";

function getServerRememberedLoginSnapshot() {
  return null;
}

type LoginField = "email" | "password";
type FieldErrors = Partial<Record<LoginField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: LoginField, value: string): string | undefined {
  if (field === "email") {
    const trimmed = value.trim();
    if (!trimmed) return "Vui lòng nhập email.";
    if (!EMAIL_PATTERN.test(trimmed)) return "Email không hợp lệ.";
    return undefined;
  }
  return value ? undefined : "Vui lòng nhập mật khẩu.";
}

export function useLoginForm() {
  const router = useRouter();
  const storedRememberedLogin = useSyncExternalStore(
    subscribeToRememberedLogin,
    readRememberedLoginSnapshot,
    getServerRememberedLoginSnapshot,
  );
  const rememberedLogin = useMemo(() => {
    if (!storedRememberedLogin) {
      return null;
    }
    return readRememberedLogin();
  }, [storedRememberedLogin]);

  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState<string | null>(null);
  const [rememberInput, setRememberInput] = useState<boolean | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const email = emailInput ?? rememberedLogin?.email ?? "";
  const password = passwordInput ?? "";
  const rememberMe = rememberInput ?? rememberedLogin?.remember ?? false;

  useEffect(() => {
    removeLegacyRememberedPassword();
  }, []);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === STORAGE_KEY && event.newValue) {
        window.location.assign("/dashboard");
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateFieldError = (field: LoginField, message: string | undefined) => {
    setFieldErrors((current) => ({ ...current, [field]: message }));
  };

  const handleEmailChange = (value: string) => {
    setEmailInput(value);
    if (fieldErrors.email) updateFieldError("email", undefined);
  };

  const handlePasswordChange = (value: string) => {
    setPasswordInput(value);
    if (fieldErrors.password) updateFieldError("password", undefined);
  };

  const handleFieldBlur = (field: LoginField) => (event: FocusEvent<HTMLInputElement>) => {
    updateFieldError(field, validateField(field, event.target.value));
  };

  const handleRememberChange = (checked: boolean) => {
    setRememberInput(checked);
    if (!checked) {
      clearRememberedLogin();
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((current) => !current);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    const nextErrors: FieldErrors = {
      email: validateField("email", email),
      password: validateField("password", password),
    };
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim();

        const session = await signIn({ email: normalizedEmail, password }, { remember: rememberMe });

        if (rememberMe) {
          storeRememberedLogin({ email: normalizedEmail, remember: true });
        } else {
          clearRememberedLogin();
        }

        router.push(session?.currentUser.permissions?.includes("admin.access") ? "/admin" : "/dashboard");
        router.refresh();
      } catch (error) {
        // Chỉ báo sai thông tin khi máy chủ từ chối thông tin đăng nhập; mọi lỗi khác (mạng, máy chủ...) chỉ hiện thông báo chung.
        const status = (error as { status?: number } | null)?.status;
        setError(
          status === 400 || status === 401
            ? "Email hoặc mật khẩu không đúng."
            : "Không thể đăng nhập. Vui lòng thử lại sau.",
        );
      }
    });
  };

  return {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    error,
    fieldErrors,
    isPending,
    emailRef,
    passwordRef,
    handleEmailChange,
    handlePasswordChange,
    handleFieldBlur,
    handleRememberChange,
    togglePasswordVisibility,
    handleSubmit,
  };
}
