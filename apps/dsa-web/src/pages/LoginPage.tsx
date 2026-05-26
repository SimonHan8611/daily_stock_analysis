import type React from "react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Box,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  BellRing,
  ChartColumnBig,
  Lock,
  Loader2,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, Input, ParticleBackground } from "../components/common";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ParsedApiError } from "../api/error";
import { isParsedApiError } from "../api/error";
import { useAuth } from "../hooks";
import { SettingsAlert } from "../components/settings";

const FEATURE_ITEMS = [
  { icon: Sparkles, title: "智能分析" },
  { icon: Shield, title: "实时监控" },
  { icon: BellRing, title: "预警通知" },
] as const;

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "登录 - DSA";
  }, []);

  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | ParsedApiError | null>(null);

  const handleToggleMode = () => {
    setIsLoginMode((prev) => !prev);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        const result = await login(username, password);
        if (result.success) {
          navigate(redirect, { replace: true });
        } else {
          setError(result.error ?? "登录失败");
        }
        return;
      }

      if (password !== passwordConfirm) {
        setError("两次输入的密码不一致");
        return;
      }

      const result = await register(username, password, passwordConfirm, email);
      if (!result.success) {
        setError(result.error ?? "注册失败");
        return;
      }

      const loginResult = await login(username, password);
      if (loginResult.success) {
        navigate(redirect, { replace: true });
      } else {
        setError(loginResult.error ?? "注册成功，但自动登录失败");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(208_92%_96%)] font-sans selection:bg-[var(--login-accent-soft)] [--login-button-text:hsl(210_40%_98%)] [--login-error-bg:hsl(0_84%_60%_/_0.10)] [--login-error-border:hsl(0_84%_60%_/_0.20)] [--login-error-text:hsl(0_72%_46%)] [--login-input-border-focus:hsl(198_100%_48%_/_0.45)] [--login-input-border-hover:hsl(204_72%_70%)] [--login-input-border:hsl(205_48%_82%)] [--login-input-caret:hsl(198_100%_42%)] [--login-input-fill:hsl(220_45%_18%)] [--login-input-focus-ring:0_0_0_4px_hsl(198_100%_48%_/_0.12)] [--login-input-icon:hsl(199_88%_42%_/_0.86)] [--login-input-placeholder:hsl(218_18%_52%)] [--login-input-shadow:0_10px_24px_hsl(204_70%_30%_/_0.06)] [--login-input-surface:hsl(204_64%_98%_/_0.94)] [--login-input-text:hsl(220_45%_18%)] [--login-label-text:hsl(223_36%_14%)]">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_16%_14%,hsl(196_100%_62%_/_0.30),transparent_34%),radial-gradient(circle_at_84%_18%,hsl(230_100%_76%_/_0.18),transparent_31%),linear-gradient(135deg,hsl(205_100%_98%)_0%,hsl(208_92%_96%)_48%,hsl(218_100%_98%)_100%)]" />
      <ParticleBackground />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,hsl(208_42%_55%_/_0.10)_1px,transparent_1px),linear-gradient(to_bottom,hsl(208_42%_55%_/_0.10)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_50%_42%,black,transparent_78%)]" />
      <div className="absolute left-[-12rem] top-[-12rem] z-0 h-[30rem] w-[30rem] rounded-full bg-[hsl(196_100%_62%_/_0.22)] blur-[80px]" />
      <div className="absolute bottom-[-14rem] right-[-12rem] z-0 h-[34rem] w-[34rem] rounded-full bg-[hsl(229_100%_76%_/_0.18)] blur-[90px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-[1120px]"
        >
          <Paper
            radius={26}
            className="relative overflow-hidden border border-[hsl(206_62%_82%_/_0.82)] !bg-white/70 shadow-[0_32px_110px_hsl(206_80%_36%_/_0.18)] backdrop-blur-xl"
          >
            <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-2">
              <div className="login-promo-col">
                <Box className="relative flex h-full flex-col justify-start gap-7 overflow-hidden bg-[linear-gradient(145deg,hsl(201_100%_97%_/_0.96),hsl(209_100%_93%_/_0.82))] px-6 py-7 sm:px-10 lg:px-12">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[hsl(196_100%_62%_/_0.24)] blur-[55px]" />
                  <div className="pointer-events-none absolute bottom-[-7rem] left-[-6rem] h-80 w-80 rounded-full border border-sky-300/40" />

                  <Group gap="md" wrap="nowrap" className="relative z-10">
                    <ThemeIcon
                      size={46}
                      radius="xl"
                      variant="gradient"
                      gradient={{ from: "blue.5", to: "cyan.5", deg: 135 }}
                    >
                      <ChartColumnBig size={22} />
                    </ThemeIcon>
                    <div>
                      <Text className="text-[0.86rem] font-black uppercase tracking-[0.08em] text-[hsl(221_47%_18%)]">
                        Daily Stock Analysis
                      </Text>
                      <Text className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.42em] text-sky-500">
                        Engine
                      </Text>
                    </div>
                  </Group>

                  <Stack gap="xl" className="relative z-10 mb-1 mt-8 w-full max-w-[620px]">
                    <Stack gap="md">
                      <Title
                        order={1}
                        className="text-[2.45rem] font-black leading-tight tracking-[-0.04em] text-[hsl(220_45%_18%)] sm:text-[3.4rem]"
                      >
                        股票智能分析系统
                      </Title>
                      <Text className="max-w-[500px] text-[0.96rem] leading-7 text-[hsl(220_18%_42%)]">
                        自动分析、历史报告、策略问答与预警通知统一汇总，帮助你更快进入每日决策。
                      </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                      {FEATURE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.title}
                            className="flex min-h-[4.25rem] items-center justify-center rounded-2xl border border-sky-200/80 bg-white/76 px-3 py-3 shadow-[0_10px_28px_hsl(204_70%_30%_/_0.07)] backdrop-blur-sm"
                          >
                            <Group gap="sm" wrap="nowrap" justify="center">
                              <ThemeIcon
                                size={34}
                                radius="xl"
                                variant="light"
                                color="blue"
                              >
                                <Icon className="h-4 w-4" />
                              </ThemeIcon>
                              <Text className="whitespace-nowrap text-sm font-bold text-[hsl(220_30%_24%)]">
                                {item.title}
                              </Text>
                            </Group>
                          </div>
                        );
                      })}
                    </SimpleGrid>
                  </Stack>

                  <div className="relative z-10 rounded-2xl border border-sky-300/60 bg-white/70 px-4 py-3 backdrop-blur-sm">
                    <Group justify="space-between" gap="md" wrap="wrap">
                      <div>
                        <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
                          Workspace
                        </Text>
                        <Text className="mt-1 text-sm font-bold text-[hsl(220_38%_22%)]">
                          安全会话已准备就绪
                        </Text>
                      </div>
                      <Text className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-sky-500">
                        DSA / 2026
                      </Text>
                    </Group>
                  </div>
                </Box>
              </div>

              <div className="login-form-col">
                <Box className="relative flex h-full items-center justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="relative z-10 w-full max-w-[min(34rem,calc(100vw-2rem))] lg:max-w-[34rem]"
                  >
                    <Paper
                      radius={24}
                      className="border border-sky-200/80 !bg-white/86 px-4 py-5 shadow-[0_24px_80px_hsl(206_70%_30%_/_0.16)] backdrop-blur-2xl sm:px-8 sm:py-8"
                    >
                      <Stack gap="lg">
                        <Stack gap="sm">
                          <Group gap="sm" wrap="nowrap">
                            <ThemeIcon
                              size={40}
                              radius="xl"
                              variant="gradient"
                              gradient={{
                                from: "cyan.5",
                                to: "blue.6",
                                deg: 135,
                              }}
                            >
                              {isLoginMode ? (
                                <Lock className="h-5 w-5" />
                              ) : (
                                <ShieldCheck className="h-5 w-5" />
                              )}
                            </ThemeIcon>
                            <Title
                              order={2}
                              className="text-[2rem] font-black tracking-[-0.04em] text-[hsl(220_40%_18%)]"
                            >
                              {!isLoginMode ? "注册账号" : "系统登录"}
                            </Title>
                          </Group>
                          <Text className="text-sm leading-6 text-[hsl(220_18%_42%)]">
                            {!isLoginMode
                              ? "请输入您的账户信息以注册股票智能分析系统，首个注册用户将自动成为管理员。"
                              : "请输入您的账户信息以登录股票智能分析系统。"}
                          </Text>
                        </Stack>

                        <Divider className="border-sky-200/80" />

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-4">
                            <Input
                              id="username"
                              type="text"
                              appearance="login"
                              label="用户名"
                              placeholder="请输入用户名"
                              className="!h-12 !rounded-2xl"
                              value={username}
                              onChange={(event) =>
                                setUsername(event.target.value)
                              }
                              disabled={isSubmitting}
                              autoFocus
                              autoComplete="username"
                              required
                            />

                            {!isLoginMode ? (
                              <Input
                                id="email"
                                type="email"
                                appearance="login"
                                label="邮箱（可选）"
                                placeholder="请输入邮箱地址"
                                className="!h-12 !rounded-2xl"
                                value={email}
                                onChange={(event) =>
                                  setEmail(event.target.value)
                                }
                                disabled={isSubmitting}
                                autoComplete="email"
                              />
                            ) : null}

                            <Input
                              id="password"
                              type="password"
                              appearance="login"
                              allowTogglePassword
                              iconType="password"
                              label="密码"
                              placeholder={
                                !isLoginMode
                                  ? "请设置 6 位以上密码"
                                  : "请输入密码"
                              }
                              className="!h-12 !rounded-2xl"
                              value={password}
                              onChange={(event) =>
                                setPassword(event.target.value)
                              }
                              disabled={isSubmitting}
                              autoComplete={
                                !isLoginMode
                                  ? "new-password"
                                  : "current-password"
                              }
                              required
                            />

                            {!isLoginMode ? (
                              <Input
                                id="passwordConfirm"
                                type="password"
                                appearance="login"
                                allowTogglePassword
                                iconType="password"
                                label="确认密码"
                                placeholder="请再次输入密码"
                                className="!h-12 !rounded-2xl"
                                value={passwordConfirm}
                                onChange={(event) =>
                                  setPasswordConfirm(event.target.value)
                                }
                                disabled={isSubmitting}
                                autoComplete="new-password"
                                required
                              />
                            ) : null}
                          </div>

                          {error ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="overflow-hidden"
                            >
                              <SettingsAlert
                                title={!isLoginMode ? "注册失败" : "登录失败"}
                                message={
                                  isParsedApiError(error)
                                    ? error.message
                                    : error
                                }
                                variant="error"
                                className="!border-[var(--login-error-border)] !bg-[var(--login-error-bg)] !text-[var(--login-error-text)]"
                              />
                            </motion.div>
                          ) : null}

                          <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="group/btn relative !mt-4 !h-12 !w-full overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-[var(--login-brand-button-start)] to-[var(--login-brand-button-end)] text-base font-semibold text-[var(--login-button-text)] shadow-[0_18px_38px_hsl(214_100%_40%_/_0.22)] hover:from-[var(--login-brand-button-start-hover)] hover:to-[var(--login-brand-button-end-hover)]"
                            disabled={isSubmitting}
                          >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>正在处理...</span>
                                </>
                              ) : (
                                <span>
                                  {!isLoginMode
                                    ? "完成注册并登录"
                                    : "授权进入工作台"}
                                </span>
                              )}
                            </div>
                            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                          </Button>

                          <div className="pt-1 text-center">
                            <button
                              type="button"
                              onClick={handleToggleMode}
                              className="group/link cursor-pointer text-sm text-[hsl(220_18%_40%)] transition-colors"
                              disabled={isSubmitting}
                            >
                              {isLoginMode ? (
                                <>
                                  没有账号？{" "}
                                  <span className="font-semibold text-sky-600 group-hover/link:underline">
                                    点击注册
                                  </span>
                                </>
                              ) : (
                                <>
                                  已有账号？{" "}
                                  <span className="font-semibold text-sky-600 group-hover/link:underline">
                                    返回登录
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </Stack>
                    </Paper>
                  </motion.div>
                </Box>
              </div>
            </div>
          </Paper>
        </motion.div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .login-promo-col {
          order: 2;
        }
        .login-form-col {
          order: 1;
        }
        @media (min-width: 1024px) {
          .login-promo-col {
            order: 1;
          }
          .login-form-col {
            order: 2;
          }
        }
      `,
        }}
      />
    </div>
  );
};

export default LoginPage;
