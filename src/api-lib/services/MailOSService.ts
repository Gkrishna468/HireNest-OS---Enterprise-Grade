export class MailOSService {
  private static instance: MailOSService;
  private status: "running" | "stopped" = "stopped";

  private constructor() {}

  public static getInstance(): MailOSService {
    if (!MailOSService.instance) {
      MailOSService.instance = new MailOSService();
    }
    return MailOSService.instance;
  }

  public start(): void {
    this.status = "running";
    console.log("MailOS Service initialized and listening for outbound staffing correspondence...");
  }

  public stop(): void {
    this.status = "stopped";
    console.log("MailOS Service stopped.");
  }

  public getStatus(): "running" | "stopped" {
    return this.status;
  }

  public async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (this.status !== "running") {
      throw new Error("MailOS Service is offline");
    }
    console.log(`[MailOS] Dispatching email to ${to} with subject: '${subject}' (${body.length} chars payload)`);
    // Mock successful delivery
    return true;
  }
}
