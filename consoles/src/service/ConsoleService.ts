import { injectable } from 'inversify';
import * as path from 'path';
import axios, { AxiosError } from 'axios';
import HttpStatusCodes from '../utils/HttpStatusCode';
import StorageException from '../core/exception/StorageException';
import { HttpResponse } from '../controller/interfaces/ControllerInterface';
import DirManager from '../utils/DirManager';


interface WordpressVersionResponse {
  results: Array<{name: string}>;
}

interface ConsoleInitResponse {
  langsFilePath: string;
  wordpressVersions?: WordpressVersionResponse;
  error?: string;
}

@injectable()
export default class ConsoleService {
  private readonly DOCKER_HUB_API = 'https://hub.docker.com/v2/repositories/library/wordpress/tags/?page_size=100';
  private readonly LANGS_PATH = path.join('src', 'core', 'lang', 'config');

  public async initConsole(): Promise<ConsoleInitResponse> {
    try {
      await this.validateLangsFolder();
      const langs = await this.readLangsFile();
      const wordpressVersions = await this.fetchWordpressVersions();

      return {
        langsFilePath: JSON.parse(langs),
        wordpressVersions
      };
    } catch (error) {
      const httpResponse = this.handleError(error);
      throw new StorageException(
        httpResponse.data.message,
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async validateLangsFolder(): Promise<void> {
    const exists = await DirManager.folderExists(this.LANGS_PATH);
    if (!exists) {
      throw new StorageException('Le dossier des langues est introuvable',HttpStatusCodes.NOT_FOUND);
    }
  }


  private async readLangsFile(): Promise<any> {
    try {
      return await DirManager.readfile(path.join(this.LANGS_PATH, 'langs.json'));
    } catch (error) {
      throw new StorageException(
        'Erreur lors de la lecture du fichier de langues',
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async fetchWordpressVersions(): Promise<WordpressVersionResponse> {
    try {
      const response = await axios.get<WordpressVersionResponse>(this.DOCKER_HUB_API, {
        timeout: 5000, 
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new StorageException(
          `Erreur lors de la récupération des versions WordPress: ${axiosError.message}`,
          HttpStatusCodes.BAD_GATEWAY
        );
      }
      throw error;
    }
  }

  private handleError(error: any): HttpResponse {
    console.error('Erreur dans ConsoleService:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const statusCode = error instanceof StorageException 
      ? error.status
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;

    return {
      data: {
        message: errorMessage,
        success: false,
        statusCode
      },
      success: false
    };
  }
}