import type { ComponentType, SVGProps } from "react";

import { SoftwareLogo } from "@/components/software-logo";

import {
  ClockIcon,
  GanttIcon,
  KanbanIcon,
  ListChecksIcon,
  PieChartIcon,
  ShieldCheckIcon,
} from "./login-icons";
import styles from "../styles/login-page.module.css";

type Feature = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "green" | "orange" | "violet" | "magenta" | "aqua" | "red";
  title: string;
};

const features: Feature[] = [
  {
    icon: ListChecksIcon,
    tone: "green",
    title: "Quản lý công việc",
  },
  {
    icon: GanttIcon,
    tone: "orange",
    title: "Lộ trình Gantt",
  },
  {
    icon: KanbanIcon,
    tone: "violet",
    title: "Sprint và Kanban",
  },
  {
    icon: PieChartIcon,
    tone: "magenta",
    title: "Báo cáo và thống kê",
  },
  {
    icon: ClockIcon,
    tone: "aqua",
    title: "Nhật ký công",
  },
  {
    icon: ShieldCheckIcon,
    tone: "red",
    title: "Phân quyền an toàn",
  },
];

export function BrandPanel() {
  return (
    <aside className={styles.brand}>
      <span className={`${styles.blob} ${styles.blobBlue}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobAmber}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobAqua}`} aria-hidden="true" />

      <SoftwareLogo className={styles.brandLogo} />

      <div className={styles.brandBody}>
        <h2 className={styles.headline}>
          Một nơi duy nhất để
          <br />
          điều phối mọi dự án.
        </h2>
        <p className={styles.lead}>
          Nền tảng quản lý dự án giúp từng bộ phận nắm rõ công việc, tiến độ và trách nhiệm.
        </p>

        <ul className={styles.featureGrid}>
          {features.map(({ icon: Icon, tone, title }) => (
            <li key={title} className={styles.featureCard}>
              <span className={`${styles.chip} ${styles[tone]}`}>
                <Icon width={20} height={20} />
              </span>
              <h3>{title}</h3>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
