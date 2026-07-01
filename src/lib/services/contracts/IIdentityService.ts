export interface IIdentityService {
  getUserProfile(uid: string): Promise<any>;
  updateUserProfile(uid: string, data: Partial<Record<string, any>>): Promise<void>;
  updateDemoFlag(uid: string, hasSeenDemo: boolean): Promise<void>;
  updatePilotMode(uid: string, enabled: boolean): Promise<void>;
  executeAdminCleanup(email: string): Promise<void>;
}
