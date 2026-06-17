export class AuthProvider {
  static async getToken(): Promise<string> {
    // In a real implementation this would fetch a JWT or custom claim token
    return 'simulated-service-account-jwt';
  }
}
