import { createExpressDevNotesProxy } from '@the-portland-company/devnotes/express';

const backend = {
  async getCapabilities() {
    return { ai: false, appLink: true };
  },
  async getAppLinkStatus() {
    return {
      linked: Boolean(process.env.FOCUS_FORGE_PAT),
      projectName: process.env.FOCUS_FORGE_PROJECT_NAME || null,
      tokenLast4: process.env.FOCUS_FORGE_PAT?.slice(-4) || null,
      linkedAt: null,
    };
  },
  async linkApp() {
    throw new Error('Implement app-level Forge credential storage for your React server app.');
  },
  async unlinkApp() {
    throw new Error('Implement app-level Forge credential removal for your React server app.');
  },
  async listReports() {
    throw new Error('Implement Forge-backed report listing.');
  },
  async createReport() {
    throw new Error('Implement Forge-backed report creation.');
  },
  async updateReport() {
    throw new Error('Implement Forge-backed report updates.');
  },
  async deleteReport() {
    throw new Error('Implement Forge-backed report deletion.');
  },
  async listReportTypes() {
    return [];
  },
  async createReportType() {
    throw new Error('Implement Forge-backed report type creation.');
  },
  async deleteReportType() {
    throw new Error('Implement Forge-backed report type deletion.');
  },
  async listTaskLists() {
    return [];
  },
  async createTaskList() {
    throw new Error('Implement Forge-backed task list creation.');
  },
  async listMessages() {
    return [];
  },
  async createMessage() {
    throw new Error('Implement Forge-backed message creation.');
  },
  async updateMessage() {
    throw new Error('Implement Forge-backed message updates.');
  },
  async deleteMessage() {
    throw new Error('Implement Forge-backed message deletion.');
  },
  async getUnreadCounts() {
    return {};
  },
  async markMessagesRead() {},
  async listCollaborators() {
    return [];
  },
};

export const devNotesProxy = createExpressDevNotesProxy(backend);
