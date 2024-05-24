import { promises as fs } from 'fs';

export default class DirManager {
  public static async folderExists(folderPath: string): Promise<boolean> {
    try {
      await fs.access(folderPath);
      return true;
    } catch {
      return false;
    }
  }
  
  public static async readfile(templatePath: string): Promise<string | null> {
    try {
      const data = await fs.readFile(templatePath, 'utf8');
      return data;
    } catch (error) {
      return null;
    }
  }

  public static replaceTemplateFlags(template: string, replacements: { [key: string]: string }): string {
    return template.replace(/%\{([^}]+)\}/g, (match, p1) => {
      return replacements.hasOwnProperty(match) ? replacements[match] : match;
    });
  }

  public static async writeFile(filePath: string, data: string): Promise<boolean> {
    try {
      await fs.writeFile(filePath, data, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  public static async createDir(folderPath: string): Promise<boolean> {
    try {
      await fs.mkdir(folderPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  public static async deleteDir(folderPath: string): Promise<boolean> {
    try {
      await fs.rm(folderPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }


}