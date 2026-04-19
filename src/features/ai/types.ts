export interface AIProvider {
  generateTitle(content: string): Promise<string>;
  generateKeywords(content: string): Promise<string[]>;
}
