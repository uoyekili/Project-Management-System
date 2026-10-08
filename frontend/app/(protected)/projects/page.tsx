"use client";

import { useEffect, useState } from "react";

import { WorkspaceShell } from "@/components/workspace-shell";
import { projectApi, userApi, workspaceApi } from "@/services/api";
import { roleLabel } from "@/lib/utils/format";
import { canCode, canInProject, hasCompanywideProjectAccess, PERM } from "@/lib/permissions";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import type {
  Project,
  UserProfile,
  WorkspaceShellData,
} from "@/types";

import { ProjectList } from "./_components/project-list";
import { CreateProjectModal } from "./_components/create-project-modal";
import { EditProjectModal } from "./_components/edit-project-modal";
import { t } from "@/lib/i18n";

type ProjectsState = {
  shellData: WorkspaceShellData;
  projects: Project[];
};

let projectsPageCache: { viewerId: string; data: ProjectsState } | null = null;
let accessibleUsersCache: { viewerId: string; data: UserProfile[] } | null = null;

export default function ProjectsPage() {
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;
  const isViewerReady = Boolean(session?.currentUser?.id);
  const cachedProjectsState =
    viewer?.id && projectsPageCache?.viewerId === viewer.id ? projectsPageCache!.data : null;
  const cachedAccessibleUsers =
    viewer?.id && accessibleUsersCache?.viewerId === viewer.id ? accessibleUsersCache!.data : [];

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    cachedProjectsState?.projects[0]?.id ?? null,
  );
  const [projectsState, setProjectsState] = useState<ProjectsState | null>(cachedProjectsState);
  const [accessibleUsers, setAccessibleUsers] = useState<UserProfile[]>(cachedAccessibleUsers);
  const [isLoading, setIsLoading] = useState(!cachedProjectsState);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadProjects() {
      if (!isViewerReady) {
        return;
      }

      try {
        const [{ data: shellData }, { data: projects }] = await Promise.all([
          workspaceApi.getShellData(viewer),
          projectApi.list(undefined, viewer),
        ]);

        if (isCancelled) {
          return;
        }

        const nextState = { shellData, projects };
        projectsPageCache = { viewerId: viewer!.id, data: nextState };
        setProjectsState(nextState);
        setSelectedProjectId((current) => current ?? projects[0]?.id ?? null);
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load projects:", err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [isViewerReady, viewer]);

  const shellData =
    projectsState?.shellData ??
    ({
      currentUser: viewer,
      activeProjects: 0,
      openTasks: 0,
      missingLogwork: 0,
      alertCount: 0,
    } satisfies WorkspaceShellData);

  const projectList = projectsState?.projects ?? [];
  const hasCompanywideAccess = hasCompanywideProjectAccess(viewer);
  const managesAnyProject = projectList.some((project) => canInProject(project, "project", "update"));
  const canCreateProject = canCode(viewer, PERM.projectCreate);
  const canManage = hasCompanywideAccess || managesAnyProject || canCreateProject;
  const selectedProject =
    projectList.find((project) => project.id === selectedProjectId) ?? projectList[0] ?? null;

  async function refreshProjects(nextSelectedId?: string | null) {
    const [{ data: shellData }, { data: projects }] = await Promise.all([
      workspaceApi.getShellData(viewer),
      projectApi.list(undefined, viewer),
    ]);

    const nextState = { shellData, projects };
    projectsPageCache = { viewerId: viewer.id, data: nextState };
    setProjectsState(nextState);
    setSelectedProjectId(nextSelectedId ?? selectedProjectId ?? projects[0]?.id ?? null);
  }

  async function ensureAccessibleUsers() {
    if (accessibleUsersCache?.viewerId === viewer!.id && accessibleUsersCache!.data.length) {
      setAccessibleUsers(accessibleUsersCache!.data);
      return accessibleUsersCache!.data;
    }

    const { data: users } = await userApi.list(viewer);
    accessibleUsersCache = { viewerId: viewer!.id, data: users };
    setAccessibleUsers(users);
    return users;
  }

  async function handleOpenCreateProject() {
    await ensureAccessibleUsers();
    setIsCreateModalOpen(true);
  }

  async function handleOpenEditProject(project: Project) {
    await ensureAccessibleUsers();
    setEditingProject(project);
  }

  return (
    <WorkspaceShell
      shellData={shellData}
      heading={canManage ? t("Quản lí dự án") : t("Dự án của tôi")}
      subheading={
        hasCompanywideAccess
            ? t("Theo dõi toàn bộ danh mục dự án của công ty.")
          : canManage
            ? t("Hiển thị các dự án bạn đang tham gia hoặc đang điều phối trong phạm vi quyền hiện tại.")
            : t("Chỉ hiển thị các dự án bạn tham gia và những công việc được giao cho bạn.")
      }
      highlightLabel={t("Phạm vi xem")}
      highlightValue={
        hasCompanywideAccess
            ? t("Toàn bộ dự án công ty")
            : roleLabel(viewer.role)
      }
      fillViewport
    >
      <section className="filtered-list-page">
        <ProjectList
          projects={projectList}
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={setSelectedProjectId}
          viewerId={viewer.id}
          onAddProjectClick={canCreateProject ? handleOpenCreateProject : undefined}
          onEditProjectClick={handleOpenEditProject}
          isLoading={isLoading || !isViewerReady}
        />
      </section>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        viewerId={viewer.id}
        viewerName={viewer.name}
        viewerRole={viewer.role}
        accessibleUsers={accessibleUsers}
        onProjectCreated={refreshProjects}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        viewerId={viewer.id}
        viewerRole={viewer.role}
        accessibleUsers={accessibleUsers}
        onProjectUpdated={() => refreshProjects(selectedProjectId)}
      />
    </WorkspaceShell>
  );
}
