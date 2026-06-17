import { AuthProvider } from './AuthProvider';

export class WebhookClient {
  private static baseUrl = process.env.OS_API_URL || 'http://localhost:3000';

  static async post(endpoint: string, data: any) {
    const token = await AuthProvider.getToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[WebhookClient] POST ${url}`);
    
    // Stub fetch
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(data)
    // });
    // return response.json();
    return { success: true };
  }
}
